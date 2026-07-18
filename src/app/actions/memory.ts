'use server';

import { db } from '@/lib/db';
import { getSessionUser } from './auth';
import { fetchWebMetadata } from '@/lib/scraper';
import { saveUploadedFile, deleteUploadedFile } from '@/lib/storage';
import { processSavedContent, generateEmbedding } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T = any> {
  success: boolean;
  error?: string;
  duplicate?: boolean;
  existingId?: string;
  data?: T;
}

/**
 * Common processing helper to generate embeddings, tags, summaries, and index.
 * Simulates pipeline: CAPTURED -> METADATA_EXTRACTED -> AI_CLASSIFIED -> EMBEDDING_GENERATED -> READY
 */
async function runAiProcessingPipeline(
  memoryId: string,
  type: 'link' | 'image' | 'pdf' | 'note',
  rawContent: string,
  title: string,
  mimeType?: string,
  fileBuffer?: Buffer
) {
  try {
    // 1. AI Classification & Tagging
    await db.memory.update({
      where: { id: memoryId },
      data: { status: 'AI_CLASSIFIED' }
    });

    const aiResult = await processSavedContent(type, rawContent, title, mimeType, fileBuffer);

    // 2. Generate Embedding
    await db.memory.update({
      where: { id: memoryId },
      data: { status: 'EMBEDDING_GENERATED' }
    });

    // Content to embed: title + summary + tags + rawText / ocrText
    const embedText = `${aiResult.title} | ${aiResult.summary} | ${aiResult.tags.join(', ')} | ${rawContent} | ${aiResult.ocrText || ''}`;
    const vector = await generateEmbedding(embedText);

    // 3. Create/Update Embedding in DB and set status to READY (Indexed)
    await db.embedding.upsert({
      where: { memoryId },
      update: { vector: JSON.stringify(vector) },
      create: { memoryId, vector: JSON.stringify(vector) }
    });

    // 4. Update Memory with AI-generated data
    // Associate tags
    const tagIds: string[] = [];
    for (const tagName of aiResult.tags) {
      const cleanTagName = tagName.toLowerCase().trim();
      if (!cleanTagName) continue;
      
      const tag = await db.tag.upsert({
        where: { name: cleanTagName },
        update: {},
        create: { name: cleanTagName }
      });
      tagIds.push(tag.id);
    }

    // Remove existing memory tags (if updating)
    await db.memoryTag.deleteMany({
      where: { memoryId }
    });

    // Link new tags
    if (tagIds.length > 0) {
      await db.memoryTag.createMany({
        data: tagIds.map(tId => ({
          memoryId,
          tagId: tId
        }))
      });
    }

    await db.memory.update({
      where: { id: memoryId },
      data: {
        title: aiResult.title,
        summary: aiResult.summary,
        ocrText: aiResult.ocrText || null,
        status: 'READY'
      }
    });

  } catch (error) {
    console.error(`AI Pipeline failed for memory ${memoryId}:`, error);
    await db.memory.update({
      where: { id: memoryId },
      data: { status: 'FAILED' }
    });
  }
}

/**
 * Save URL/Link Memory
 */
export async function saveLinkMemory(
  urlStr: string,
  collectionId?: string,
  forceSave: boolean = false
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    let url = urlStr.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    // Validate URL syntax
    new URL(url);

    // 1. Duplicate detection
    if (!forceSave) {
      const existing = await db.memory.findFirst({
        where: {
          userId: user.id,
          sourceUrl: url,
          isArchived: false,
        }
      });
      if (existing) {
        return {
          success: false,
          duplicate: true,
          existingId: existing.id,
          error: 'You already saved this URL.'
        };
      }
    }

    // 2. Create memory with initial status CAPTURED
    const memory = await db.memory.create({
      data: {
        userId: user.id,
        title: url,
        type: 'link',
        sourceUrl: url,
        status: 'CAPTURED'
      }
    });

    // 3. Extract Metadata
    await db.memory.update({
      where: { id: memory.id },
      data: { status: 'METADATA_EXTRACTED' }
    });

    const metadata = await fetchWebMetadata(url);
    
    await db.memory.update({
      where: { id: memory.id },
      data: {
        title: metadata.title,
        summary: metadata.description,
        sourceDomain: metadata.domain,
      }
    });

    // If a collection is specified, add it
    if (collectionId) {
      await db.collectionMemory.create({
        data: {
          collectionId,
          memoryId: memory.id
        }
      });
    }

    // 4. Run AI pipeline async (in background or sequential for SQLite simplicity)
    await runAiProcessingPipeline(
      memory.id,
      'link',
      `${metadata.title} ${metadata.description}`,
      metadata.title
    );

    revalidatePath('/dashboard');
    return { success: true, data: memory };

  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save URL.' };
  }
}

/**
 * Save Text Note Memory
 */
export async function saveNoteMemory(
  noteText: string,
  title?: string,
  collectionId?: string
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const memoryTitle = title?.trim() || `Note - ${new Date().toLocaleDateString()}`;
    const cleanNoteText = noteText.trim();

    if (!cleanNoteText) {
      return { success: false, error: 'Note content cannot be empty.' };
    }

    // Create memory
    const memory = await db.memory.create({
      data: {
        userId: user.id,
        title: memoryTitle,
        type: 'note',
        rawText: cleanNoteText,
        status: 'CAPTURED'
      }
    });

    if (collectionId) {
      await db.collectionMemory.create({
        data: {
          collectionId,
          memoryId: memory.id
        }
      });
    }

    // Run AI pipeline
    await runAiProcessingPipeline(
      memory.id,
      'note',
      cleanNoteText,
      memoryTitle
    );

    revalidatePath('/dashboard');
    return { success: true, data: memory };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save note.' };
  }
}

/**
 * Save File Upload (Images/PDFs) Memory
 * In Next.js Server Actions, files are sent as Base64 strings.
 */
export async function saveUploadMemory(
  fileName: string,
  mimeType: string,
  base64Data: string,
  collectionId?: string
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save to local public/uploads directory securely
    const fileInfo = await saveUploadedFile(buffer, fileName, mimeType);

    const isPdf = mimeType === 'application/pdf';
    const type = isPdf ? 'pdf' : 'image';

    // Create memory
    const memory = await db.memory.create({
      data: {
        userId: user.id,
        title: fileName,
        type,
        filePath: fileInfo.filePath,
        status: 'CAPTURED'
      }
    });

    if (collectionId) {
      await db.collectionMemory.create({
        data: {
          collectionId,
          memoryId: memory.id
        }
      });
    }

    // For PDF / Image text extraction
    let extractableText = '';
    if (isPdf) {
      // In a real app we would use a PDF parser. Here we will mock pdf text reading.
      extractableText = `Document PDF: ${fileName}. Contains pages of study, work, or travel information.`;
    } else {
      extractableText = `Image file uploaded: ${fileName}`;
    }

    // Run AI pipeline (multimodal for image, text-based for PDF)
    await runAiProcessingPipeline(
      memory.id,
      type as any,
      extractableText,
      fileName,
      mimeType,
      buffer
    );

    revalidatePath('/dashboard');
    return { success: true, data: memory };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to process file upload.' };
  }
}

/**
 * Update memory fields (Title, summary, tags, notes, favorite, archived)
 */
export async function updateMemory(
  memoryId: string,
  data: {
    title?: string;
    summary?: string;
    isFavorite?: boolean;
    isArchived?: boolean;
    tags?: string[];
  }
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const memory = await db.memory.findUnique({
      where: { id: memoryId }
    });

    if (!memory || memory.userId !== user.id) {
      return { success: false, error: 'Memory not found or access denied.' };
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;

    // Handle tags updating if provided
    if (data.tags !== undefined) {
      const tagIds: string[] = [];
      for (const tagName of data.tags) {
        const cleanTagName = tagName.toLowerCase().trim();
        if (!cleanTagName) continue;

        const tag = await db.tag.upsert({
          where: { name: cleanTagName },
          update: {},
          create: { name: cleanTagName }
        });
        tagIds.push(tag.id);
      }

      // Delete old mapping
      await db.memoryTag.deleteMany({ where: { memoryId } });

      // Add new mapping
      if (tagIds.length > 0) {
        await db.memoryTag.createMany({
          data: tagIds.map(tId => ({ memoryId, tagId: tId }))
        });
      }
    }

    const updated = await db.memory.update({
      where: { id: memoryId },
      data: updateData,
      include: {
        tags: { include: { tag: true } }
      }
    });

    // Re-generate embedding async to match edited title/summary
    const embedText = `${updated.title} | ${updated.summary || ''} | ${data.tags?.join(', ') || ''} | ${updated.rawText || ''} | ${updated.ocrText || ''}`;
    const vector = await generateEmbedding(embedText);
    await db.embedding.upsert({
      where: { memoryId },
      update: { vector: JSON.stringify(vector) },
      create: { memoryId, vector: JSON.stringify(vector) }
    });

    revalidatePath('/dashboard');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update memory.' };
  }
}

/**
 * Delete a Memory (with database entries and files)
 */
export async function deleteMemory(memoryId: string): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const memory = await db.memory.findUnique({
      where: { id: memoryId }
    });

    if (!memory || memory.userId !== user.id) {
      return { success: false, error: 'Memory not found or access denied.' };
    }

    // Delete local files if it is an uploaded file
    if (memory.filePath) {
      await deleteUploadedFile(memory.filePath);
    }

    // Delete from database
    await db.memory.delete({
      where: { id: memoryId }
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete memory.' };
  }
}

/**
 * Get stats for home dashboard insights
 */
export async function getMemoryStats() {
  const user = await getSessionUser();
  if (!user) return null;

  const totalCount = await db.memory.count({ where: { userId: user.id, isArchived: false } });
  
  // Count by Type
  const linksCount = await db.memory.count({ where: { userId: user.id, type: 'link', isArchived: false } });
  const imagesCount = await db.memory.count({ where: { userId: user.id, type: 'image', isArchived: false } });
  const pdfsCount = await db.memory.count({ where: { userId: user.id, type: 'pdf', isArchived: false } });
  const notesCount = await db.memory.count({ where: { userId: user.id, type: 'note', isArchived: false } });

  // Get most saved domain (top source)
  const links = await db.memory.findMany({
    where: { userId: user.id, type: 'link', sourceDomain: { not: null } },
    select: { sourceDomain: true }
  });

  const domainsMap: Record<string, number> = {};
  links.forEach(l => {
    if (l.sourceDomain) {
      domainsMap[l.sourceDomain] = (domainsMap[l.sourceDomain] || 0) + 1;
    }
  });

  let topDomain = 'None';
  let maxCount = 0;
  for (const dom in domainsMap) {
    if (domainsMap[dom] > maxCount) {
      maxCount = domainsMap[dom];
      topDomain = dom;
    }
  }

  // Count by Favorites
  const favoritesCount = await db.memory.count({ where: { userId: user.id, isFavorite: true, isArchived: false } });

  return {
    totalCount,
    linksCount,
    imagesCount,
    pdfsCount,
    notesCount,
    topDomain: topDomain === 'None' ? 'N/A' : `${topDomain} (${maxCount} saved)`,
    favoritesCount
  };
}
