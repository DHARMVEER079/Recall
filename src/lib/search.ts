'use server';

import { db } from './db';
import { generateEmbedding } from './ai';
import Fuse from 'fuse.js';

export interface SearchFilters {
  category?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  tag?: string;
  collectionId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'relevance' | 'newest' | 'oldest' | 'viewed';
}

export interface SearchResultItem {
  memory: any; // Prisma Memory type
  score: number; // Relevance score from 0 to 1
  semanticScore: number;
  keywordScore: number;
}

/**
 * Computes the dot product of two vectors.
 * If vectors are normalized, dot product is exactly the Cosine Similarity.
 */
function dotProduct(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

export async function performHybridSearch(
  userId: string,
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResultItem[]> {
  // 1. Fetch memories from SQLite database matching basic filter criteria
  const whereClause: any = {
    userId,
    isArchived: filters.isArchived !== undefined ? filters.isArchived : false,
  };

  if (filters.category) {
    whereClause.type = filters.category.toLowerCase(); // fallback mapping if category maps directly
    // Wait, in database Memory has type (link, image, pdf, note)
    // and category is stored in the metadata / processed content, or in our db
    // Wait! Let's check how category is structured.
    // In our Prisma schema:
    // Memory has: title, type (link, image, pdf, note).
    // Let's support mapping category to type or scanning memory properties
    // Actually, in schema, we have `type` (link, image, pdf, note).
    // Let's filter by type if filters.category matches one of the database types:
    const typeFilters = ['link', 'image', 'pdf', 'note'];
    if (typeFilters.includes(filters.category.toLowerCase())) {
      whereClause.type = filters.category.toLowerCase();
    }
  }

  if (filters.isFavorite !== undefined) {
    whereClause.isFavorite = filters.isFavorite;
  }

  if (filters.tag) {
    whereClause.tags = {
      some: {
        tag: {
          name: filters.tag,
        },
      },
    };
  }

  if (filters.collectionId) {
    whereClause.collections = {
      some: {
        collectionId: filters.collectionId,
      },
    };
  }

  if (filters.startDate || filters.endDate) {
    whereClause.savedAt = {};
    if (filters.startDate) {
      whereClause.savedAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      whereClause.savedAt.lte = new Date(filters.endDate);
    }
  }

  // Fetch memories including tags, collections, and embeddings
  const memories = await db.memory.findMany({
    where: whereClause,
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      collections: true,
      embedding: true,
    },
    orderBy: {
      savedAt: 'desc',
    },
  });

  // Filter by Smart Categories (which are dynamically processed from AI summaries/titles if not matching type)
  // Smart Categories: Products, Articles, Videos, Documents, Screenshots, Places, Ideas
  let filteredMemories = memories;
  if (filters.category) {
    const catUpper = filters.category.toLowerCase();
    // If it's a smart category filter
    const smartCategories = ['products', 'articles', 'videos', 'documents', 'screenshots', 'places', 'ideas'];
    if (smartCategories.includes(catUpper)) {
      filteredMemories = memories.filter((m) => {
        // Run match heuristic on type / title / summary
        const contentStr = `${m.title} ${m.summary || ''} ${m.type}`.toLowerCase();
        if (catUpper === 'products') {
          return contentStr.includes('buy') || contentStr.includes('price') || contentStr.includes('amazon') || contentStr.includes('shoe') || contentStr.includes('product') || contentStr.includes('laptop') || contentStr.includes('rs') || contentStr.includes('₹') || contentStr.includes('$') || contentStr.includes('store');
        }
        if (catUpper === 'places') {
          return contentStr.includes('restaurant') || contentStr.includes('hotel') || contentStr.includes('travel') || contentStr.includes('trip') || contentStr.includes('goa') || contentStr.includes('visit') || contentStr.includes('food') || contentStr.includes('cafe') || contentStr.includes('beach');
        }
        if (catUpper === 'videos') {
          return contentStr.includes('youtube') || contentStr.includes('video') || contentStr.includes('playlist') || contentStr.includes('watch') || contentStr.includes('movie') || contentStr.includes('netflix');
        }
        if (catUpper === 'documents') {
          return m.type === 'pdf' || contentStr.includes('pdf') || contentStr.includes('document') || contentStr.includes('paper') || contentStr.includes('file');
        }
        if (catUpper === 'screenshots') {
          return m.type === 'image' || contentStr.includes('screenshot') || contentStr.includes('image') || contentStr.includes('photo');
        }
        if (catUpper === 'articles') {
          return m.type === 'link' && !contentStr.includes('youtube') && !contentStr.includes('video') && !contentStr.includes('buy');
        }
        if (catUpper === 'ideas') {
          return m.type === 'note' || contentStr.includes('idea') || contentStr.includes('thought') || contentStr.includes('draft');
        }
        return true;
      });
    }
  }

  // 2. If query is empty, sort by requested sortBy criteria and return
  if (!query || query.trim() === '') {
    const results = filteredMemories.map((m) => ({
      memory: m,
      score: 1.0,
      semanticScore: 1.0,
      keywordScore: 1.0,
    }));

    if (filters.sortBy === 'oldest') {
      results.sort((a, b) => new Date(a.memory.savedAt).getTime() - new Date(b.memory.savedAt).getTime());
    } else {
      // default is newest
      results.sort((a, b) => new Date(b.memory.savedAt).getTime() - new Date(a.memory.savedAt).getTime());
    }

    return results;
  }

  // 3. Perform Hybrid Search scoring
  // Generate search query embedding
  const queryVector = await generateEmbedding(query);

  // Initialize Fuse.js for fuzzy keyword search
  const fuseOptions = {
    keys: ['title', 'summary', 'rawText', 'ocrText', 'tags.tag.name'],
    includeScore: true,
    threshold: 0.6, // 0.0 is perfect match, 1.0 is total mismatch
  };
  const fuse = new Fuse(filteredMemories, fuseOptions);
  const fuzzyResults = fuse.search(query);
  const fuzzyScoreMap = new Map<string, number>();
  
  for (const fr of fuzzyResults) {
    // Convert fuse score (0 = perfect, 1 = worst) to keyword score (1 = perfect, 0 = worst)
    const score = 1 - (fr.score || 0);
    fuzzyScoreMap.set(fr.item.id, score);
  }

  // Score each memory
  const scoredItems: SearchResultItem[] = [];

  for (const m of filteredMemories) {
    let semanticScore = 0;
    
    // Compute Vector Cosine Similarity
    if (m.embedding?.vector) {
      try {
        const memVector = JSON.parse(m.embedding.vector) as number[];
        semanticScore = dotProduct(queryVector, memVector);
        // Normalize cosine similarity (usually -1 to 1) to 0 to 1 range
        semanticScore = Math.max(0, (semanticScore + 1) / 2);
      } catch (err) {
        console.error('Error parsing embedding vector for memory:', m.id, err);
      }
    }

    // Get keyword score
    const keywordScore = fuzzyScoreMap.get(m.id) || 0;

    // Hybrid score weight: 70% Semantic, 30% Keyword
    const hybridScore = semanticScore * 0.7 + keywordScore * 0.3;

    scoredItems.push({
      memory: m,
      score: Number(hybridScore.toFixed(4)),
      semanticScore: Number(semanticScore.toFixed(4)),
      keywordScore: Number(keywordScore.toFixed(4)),
    });
  }

  // Sort by Hybrid score desc (Relevance)
  if (filters.sortBy === 'newest') {
    scoredItems.sort((a, b) => new Date(b.memory.savedAt).getTime() - new Date(a.memory.savedAt).getTime());
  } else if (filters.sortBy === 'oldest') {
    scoredItems.sort((a, b) => new Date(a.memory.savedAt).getTime() - new Date(b.memory.savedAt).getTime());
  } else {
    // Sort by relevance (default)
    scoredItems.sort((a, b) => b.score - a.score);
  }

  // Filter out items with very low matching scores if query is specified (e.g. threshold of 0.2)
  return scoredItems.filter(item => item.score > 0.15);
}
