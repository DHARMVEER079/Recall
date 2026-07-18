'use server';

import { db } from '@/lib/db';
import { getSessionUser } from './auth';
import { revalidatePath } from 'next/cache';
import { ActionResponse } from './memory';

const COVER_COLORS = ['blue', 'purple', 'emerald', 'amber', 'rose', 'indigo', 'orange'];

/**
 * Get all collections for the logged-in user
 */
export async function getCollections() {
  const user = await getSessionUser();
  if (!user) return [];

  try {
    const collections = await db.collection.findMany({
      where: { userId: user.id },
      include: {
        memories: {
          select: {
            memoryId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return collections.map(c => ({
      ...c,
      memoriesCount: c.memories.length
    }));
  } catch (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
}

/**
 * Create a new Collection
 */
export async function createCollection(
  name: string,
  description?: string,
  coverColor?: string
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Collection name is required.' };

    const selectedColor = coverColor && COVER_COLORS.includes(coverColor) 
      ? coverColor 
      : COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];

    const collection = await db.collection.create({
      data: {
        userId: user.id,
        name: cleanName,
        description: description?.trim() || null,
        coverColor: selectedColor
      }
    });

    revalidatePath('/collections');
    return { success: true, data: collection };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create collection.' };
  }
}

/**
 * Update Collection details
 */
export async function updateCollection(
  collectionId: string,
  data: {
    name?: string;
    description?: string;
    coverColor?: string;
  }
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const existing = await db.collection.findUnique({
      where: { id: collectionId }
    });

    if (!existing || existing.userId !== user.id) {
      return { success: false, error: 'Collection not found or access denied.' };
    }

    const updateData: any = {};
    if (data.name !== undefined && data.name.trim() !== '') updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim() || null;
    if (data.coverColor !== undefined && COVER_COLORS.includes(data.coverColor)) {
      updateData.coverColor = data.coverColor;
    }

    const updated = await db.collection.update({
      where: { id: collectionId },
      data: updateData
    });

    revalidatePath('/collections');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update collection.' };
  }
}

/**
 * Delete a Collection
 */
export async function deleteCollection(collectionId: string): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const existing = await db.collection.findUnique({
      where: { id: collectionId }
    });

    if (!existing || existing.userId !== user.id) {
      return { success: false, error: 'Collection not found or access denied.' };
    }

    await db.collection.delete({
      where: { id: collectionId }
    });

    revalidatePath('/collections');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete collection.' };
  }
}

/**
 * Add a memory to a collection
 */
export async function addMemoryToCollection(
  collectionId: string,
  memoryId: string
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    // Verify collection ownership
    const collection = await db.collection.findFirst({
      where: { id: collectionId, userId: user.id }
    });
    if (!collection) return { success: false, error: 'Collection not found.' };

    // Verify memory ownership
    const memory = await db.memory.findFirst({
      where: { id: memoryId, userId: user.id }
    });
    if (!memory) return { success: false, error: 'Memory not found.' };

    // Check if link already exists
    const existing = await db.collectionMemory.findUnique({
      where: {
        collectionId_memoryId: { collectionId, memoryId }
      }
    });

    if (existing) {
      return { success: true }; // already added
    }

    await db.collectionMemory.create({
      data: { collectionId, memoryId }
    });

    revalidatePath('/collections');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add to collection.' };
  }
}

/**
 * Remove a memory from a collection
 */
export async function removeMemoryFromCollection(
  collectionId: string,
  memoryId: string
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    // Verify collection ownership
    const collection = await db.collection.findFirst({
      where: { id: collectionId, userId: user.id }
    });
    if (!collection) return { success: false, error: 'Collection not found.' };

    await db.collectionMemory.delete({
      where: {
        collectionId_memoryId: { collectionId, memoryId }
      }
    });

    revalidatePath('/collections');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove from collection.' };
  }
}

/**
 * Get memories belonging to a collection
 */
export async function getCollectionMemories(collectionId: string) {
  const user = await getSessionUser();
  if (!user) return [];

  try {
    const colMemories = await db.collectionMemory.findMany({
      where: {
        collectionId,
        collection: {
          userId: user.id
        }
      },
      include: {
        memory: {
          include: {
            tags: {
              include: {
                tag: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return colMemories.map(cm => cm.memory);
  } catch (error) {
    console.error('Error fetching collection memories:', error);
    return [];
  }
}
