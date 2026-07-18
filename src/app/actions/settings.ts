'use server';

import { db } from '@/lib/db';
import { getSessionUser, logoutUser } from './auth';
import { deleteUploadedFile } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { ActionResponse } from './memory';

/**
 * Update user preferences (theme, aiSummaries, resurfacingEnabled)
 */
export async function updateUserPreferences(data: {
  theme?: string;
  aiSummaries?: boolean;
  resurfacingEnabled?: boolean;
}): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const updated = await db.userPreference.update({
      where: { userId: user.id },
      data
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    revalidatePath('/collections');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update preferences.' };
  }
}

/**
 * Export all user data as a JSON object
 */
export async function exportUserData() {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized.');

  try {
    const userData = await db.user.findUnique({
      where: { id: user.id },
      include: {
        preferences: true,
        collections: {
          include: {
            memories: {
              select: {
                memoryId: true
              }
            }
          }
        },
        memories: {
          include: {
            tags: {
              include: {
                tag: true
              }
            }
          }
        },
        searchLogs: true
      }
    });

    return userData;
  } catch (error: any) {
    console.error('Data export error:', error);
    throw new Error('Failed to export your data.');
  }
}

/**
 * Delete all memories (along with local files)
 */
export async function deleteAllMemories(): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    // Find all memories with file paths to delete files first
    const fileMemories = await db.memory.findMany({
      where: {
        userId: user.id,
        filePath: { not: null }
      },
      select: {
        filePath: true
      }
    });

    for (const m of fileMemories) {
      if (m.filePath) {
        await deleteUploadedFile(m.filePath);
      }
    }

    // Delete memories from database (cascades to embeddings, collection mappings, tags mappings)
    await db.memory.deleteMany({
      where: { userId: user.id }
    });

    revalidatePath('/dashboard');
    revalidatePath('/collections');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete memories.' };
  }
}

/**
 * Delete search query history log
 */
export async function deleteSearchHistory(): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    await db.searchHistory.deleteMany({
      where: { userId: user.id }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to clear search history.' };
  }
}

/**
 * Completely delete account, database entities, and clear session
 */
export async function deleteUserAccount(): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    // 1. Delete all upload files
    const fileMemories = await db.memory.findMany({
      where: {
        userId: user.id,
        filePath: { not: null }
      },
      select: {
        filePath: true
      }
    });

    for (const m of fileMemories) {
      if (m.filePath) {
        await deleteUploadedFile(m.filePath);
      }
    }

    // 2. Delete user row (cascades to all other User tables: memories, collections, preference, search logs)
    await db.user.delete({
      where: { id: user.id }
    });

    // 3. Clear session cookie
    await logoutUser();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete account.' };
  }
}
