const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

// Helper for deterministic mock embedding vectors
function generateMockVector(text) {
  const dims = 768;
  const vector = new Array(dims).fill(0);
  const normalized = text.toLowerCase();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const index = (charCode * (i + 1)) % dims;
    vector[index] += Math.sin(charCode + i);
  }

  let magnitude = 0;
  for (let val of vector) {
    magnitude += val * val;
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude > 0) {
    for (let i = 0; i < dims; i++) {
      vector[i] /= magnitude;
    }
  } else {
    vector[0] = 1.0;
  }

  return vector;
}

async function main() {
  console.log('Seeding Recall database...');

  // 1. Create default demo user
  const email = 'demo@recall.com';
  const name = 'Demo User';
  const passwordRaw = 'password123';
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(passwordRaw, salt);

  // Upsert user
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      passwordHash,
      preferences: {
        create: {
          theme: 'system',
          aiSummaries: true,
          resurfacingEnabled: true
        }
      }
    }
  });

  console.log(`Demo user created: ${user.email} (Password: ${passwordRaw})`);

  // 2. Create custom collections
  const colBuy = await db.collection.create({
    data: {
      userId: user.id,
      name: 'Things to Buy',
      description: 'Laptops, running shoes, and wishlist items.',
      coverColor: 'amber'
    }
  });

  const colGoa = await db.collection.create({
    data: {
      userId: user.id,
      name: 'Goa Trip Ideas',
      description: 'Beach side shacks, restaurants, and sights to visit in Goa.',
      coverColor: 'emerald'
    }
  });

  const colStudy = await db.collection.create({
    data: {
      userId: user.id,
      name: 'Study & Reference',
      description: 'Important tech articles, programming docs, and SSC exam patterns.',
      coverColor: 'blue'
    }
  });

  console.log('Collections created successfully.');

  // Helper tags creation
  const getOrCreateTag = async (tagName) => {
    return await db.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName }
    });
  };

  const tagShopping = await getOrCreateTag('shopping');
  const tagTech = await getOrCreateTag('tech');
  const tagTravel = await getOrCreateTag('travel');
  const tagStudy = await getOrCreateTag('study');

  // Seed Items list
  const seedItems = [
    {
      title: 'Nike Air Zoom Pegasus 40 - Black running shoes',
      type: 'link',
      sourceUrl: 'https://www.nike.com/t/air-zoom-pegasus-40-road-running-shoes',
      sourceDomain: 'nike.com',
      summary: 'Comfortable black running shoe featuring React Foam cushioning. Excellent for everyday jogging and gym training.',
      rawText: 'Save this shoe comparison. Nike Pegasus 40 vs Ultraboost. Price: Rs 11,495.',
      status: 'READY',
      collectionId: colBuy.id,
      tagIds: [tagShopping.id],
    },
    {
      title: 'React Server Components (RSC) Documentation',
      type: 'link',
      sourceUrl: 'https://react.dev/reference/react/components',
      sourceDomain: 'react.dev',
      summary: 'Official React docs describing server component structures, client boundaries, and streaming optimizations.',
      rawText: 'React Server Components allow developers to build modern responsive client interfaces with minimal bundle size.',
      status: 'READY',
      collectionId: colStudy.id,
      tagIds: [tagTech.id, tagStudy.id],
    },
    {
      title: 'Thalassa Beach Restaurant Vagator',
      type: 'link',
      sourceUrl: 'https://www.thalassagoa.com/',
      sourceDomain: 'thalassagoa.com',
      summary: 'Famous Greek beachfront restaurant in North Goa. Excellent outdoor deck with sunset views and fresh seafood.',
      rawText: 'Goa beach view dining spot, recommended by friends for the Vagator trip. Needs early reservations.',
      status: 'READY',
      collectionId: colGoa.id,
      tagIds: [tagTravel.id],
    },
    {
      title: 'SSC CGL Tier 1 Exam Pattern & Syllabus PDF',
      type: 'pdf',
      summary: 'Official PDF document describing exam pattern sections: Reasoning, Quantitative Aptitude, English, and GA.',
      rawText: 'SSC preparation reference file. Tier 1 matches standard reasoning sections. Goal: clear before October.',
      status: 'READY',
      collectionId: colStudy.id,
      tagIds: [tagStudy.id],
    },
    {
      title: 'Idea: Build a local bookmark AI database app',
      type: 'note',
      summary: 'A concept note about Recall. Storing SQLite DB locally, computing cosine vectors on Gemini embeddings.',
      rawText: 'Recall app logic: Use SQLite + Prisma. Calculate semantic similarity directly in node JS on the server actions.',
      status: 'READY',
      tagIds: [tagTech.id],
    }
  ];

  for (const item of seedItems) {
    const memory = await db.memory.create({
      data: {
        userId: user.id,
        title: item.title,
        type: item.type,
        sourceUrl: item.sourceUrl,
        sourceDomain: item.sourceDomain,
        summary: item.summary,
        rawText: item.rawText,
        status: item.status
      }
    });

    // Create embedding record
    const embedText = `${item.title} | ${item.summary} | ${item.rawText}`;
    const vector = generateMockVector(embedText);
    await db.embedding.create({
      data: {
        memoryId: memory.id,
        vector: JSON.stringify(vector)
      }
    });

    // Link tag maps
    if (item.tagIds) {
      for (const tId of item.tagIds) {
        await db.memoryTag.create({
          data: {
            memoryId: memory.id,
            tagId: tId
          }
        });
      }
    }

    // Link collection mapping
    if (item.collectionId) {
      await db.collectionMemory.create({
        data: {
          collectionId: item.collectionId,
          memoryId: memory.id
        }
      });
    }
  }

  console.log('Seed data successfully loaded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
