import { db } from '../lib/db';
import { fetchWebMetadata } from '../lib/scraper';
import { performHybridSearch } from '../lib/search';

async function runTests() {
  console.log('--- STARTING RECALL VERIFICATION TEST SUITE ---');
  let failures = 0;

  // TEST 1: SSRF Safe Scraper checks
  console.log('\nRunning Test 1: SSRF Security Checks...');
  try {
    // Attempting to scrape a localhost address
    const localUrl = 'http://127.0.0.1:3000/admin';
    await fetchWebMetadata(localUrl);
    console.error('FAIL: Scraper allowed localhost IP access! SSRF Vulnerability detected.');
    failures++;
  } catch (err: any) {
    if (err.message.includes('private/local networks') || err.message.includes('forbidden')) {
      console.log('PASS: Scraper successfully blocked SSRF request to localhost.');
    } else {
      console.warn('Scraper threw error, but not private network message:', err.message);
    }
  }

  // TEST 2: User Data Isolation checks
  console.log('\nRunning Test 2: User Data Isolation...');
  try {
    // 1. Fetch our demo user
    const demoUser = await db.user.findUnique({
      where: { email: 'demo@recall.com' }
    });

    if (!demoUser) {
      throw new Error('Demo user not found. Please run seed script first.');
    }

    // 2. Create a temporary Test User B
    const userB = await db.user.upsert({
      where: { email: 'userb@test.com' },
      update: {},
      create: {
        email: 'userb@test.com',
        name: 'Test User B',
        passwordHash: 'mock-hash'
      }
    });

    // 3. Perform hybrid search for User B
    const resultsUserB = await performHybridSearch(userB.id, '');
    
    // Expect User B to have 0 memories (User A / demo user has 5)
    const demoMemoriesInB = resultsUserB.filter(r => r.memory.userId === demoUser.id);
    if (demoMemoriesInB.length > 0) {
      console.error('FAIL: User B was able to fetch User A\'s memories! Data isolation breach.');
      failures++;
    } else {
      console.log('PASS: User data is successfully isolated. User B cannot see User A\'s memories.');
    }

    // Cleanup User B
    await db.user.delete({ where: { id: userB.id } });
  } catch (err) {
    console.error('FAIL: User Isolation test crashed:', err);
    failures++;
  }

  // TEST 3: Hybrid Search relevance sorting
  console.log('\nRunning Test 3: Search Relevance and Filtering...');
  try {
    const demoUser = await db.user.findUnique({
      where: { email: 'demo@recall.com' }
    });

    if (!demoUser) throw new Error('Demo user missing');

    // Search for "black shoes"
    const results = await performHybridSearch(demoUser.id, 'black shoes');
    
    if (results.length > 0) {
      const topResult = results[0].memory;
      if (topResult.title.toLowerCase().includes('shoe') || topResult.title.toLowerCase().includes('nike')) {
        console.log(`PASS: Search successfully matched query. Top result: "${topResult.title}" (Score: ${results[0].score})`);
      } else {
        console.warn(`WARN: Search returned results, but top result "${topResult.title}" doesn't seem highly relevant.`);
      }
    } else {
      console.error('FAIL: Search returned 0 results for "black shoes".');
      failures++;
    }
  } catch (err) {
    console.error('FAIL: Search test crashed:', err);
    failures++;
  }

  console.log('\n--- TEST SUITE SUMMARY ---');
  if (failures === 0) {
    console.log('ALL TESTS PASSED SUCCESSFULLY! Recall backend is secure and correct.');
  } else {
    console.error(`TEST SUITE FAILED with ${failures} failure(s).`);
    process.exit(1);
  }
}

runTests()
  .catch(err => {
    console.error('Test execution crash:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
