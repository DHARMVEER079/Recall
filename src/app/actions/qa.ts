'use server';

import { db } from '@/lib/db';
import { getSessionUser } from './auth';
import { askMemoryQuestion } from '@/lib/ai';

export interface QaResponse {
  success: boolean;
  answer?: string;
  error?: string;
}

export async function askQuestionAboutMemory(
  memoryId: string,
  question: string
): Promise<QaResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      return { success: false, error: 'Question cannot be empty.' };
    }

    const memory = await db.memory.findUnique({
      where: { id: memoryId },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    });

    if (!memory || memory.userId !== user.id) {
      return { success: false, error: 'Memory not found or access denied.' };
    }

    // Assemble text context for the AI Q&A model
    const tagsList = memory.tags.map(t => t.tag.name).join(', ');
    const memoryContext = `
Title: ${memory.title}
Type: ${memory.type}
Saved Date: ${memory.savedAt.toISOString()}
${memory.sourceUrl ? `Source URL: ${memory.sourceUrl}` : ''}
${memory.sourceDomain ? `Source Domain: ${memory.sourceDomain}` : ''}
AI Summary: ${memory.summary || 'None'}
${memory.rawText ? `Extracted Content/Note Text:\n${memory.rawText}` : ''}
${memory.ocrText ? `Extracted Text from Image (OCR):\n${memory.ocrText}` : ''}
Associated Tags: ${tagsList || 'None'}
`;

    // Fetch user preferences (for personal notes context if needed, wait, notes is stored directly on memory?
    // Wait, in schema we have Memory: summary, rawText, ocrText.
    // Let's pass the context to the AI
    const answer = await askMemoryQuestion(memoryContext, cleanQuestion);

    return {
      success: true,
      answer
    };
  } catch (error: any) {
    console.error('QA server action error:', error);
    return { success: false, error: error.message || 'Failed to process question.' };
  }
}
