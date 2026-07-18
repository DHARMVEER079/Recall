# Recall — AI-Powered Personal Digital Memory

Recall is a production-quality, fully responsive web application and PWA that acts as a private search engine for your own digital memory. It is a universal "Save & Find Later" platform where users can save web links, upload screenshots/PDFs, write text notes, and later retrieve them using natural-language AI semantic search.

## Tech Stack & Architecture

- **Framework**: Next.js (App Router, Server Actions)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (via Prisma ORM)
- **Search Engine**: Local Hybrid Search (Fuzzy Keyword search using Fuse.js + Vector Cosine Similarity in memory)
- **AI Engine**: Google Gemini API (`@google/genai`) for summaries, tags, OCR, and embeddings, with an intelligent offline mock fallback system.
- **PWA**: manifest.json, service worker register, Web Share Target support.

---

## Getting Started

### 1. Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)

### 2. Installation
Navigate to the project root and install the dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```env
# Database URL for SQLite
DATABASE_URL="file:./dev.db"

# JWT Secret for session authentication
JWT_SECRET="your-jwt-secret-here"

# Google Gemini API Key for semantic search, OCR, summaries, and Q&A
# Get a key from Google AI Studio: https://aistudio.google.com/
# If left blank, Recall runs in intelligent offline Demo/Fallback mode.
GEMINI_API_KEY="your-gemini-api-key-here"
```

### 4. Database Setup & Seeding
Initialize the SQLite database schema and generate the Prisma Client:
```bash
npx prisma db push
```

Load the default demo seed data (adds demo user `demo@recall.com` with password `password123` and pre-populated memories):
```bash
node prisma/seed.js
```

---

## Running the Application

### Running Locally (Development Mode)
Launch the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Backend Verification Tests
We have built a test suite to verify SSRF blocks, database user data isolation, and search relevance. Run it using:
```bash
npx tsx src/scripts/test.ts
```

### Building for Production
To build a production bundle and run the server:
```bash
npm run build
npm run start
```

---

## Core Product Features & Implementation

### 1. Secure Save & SSRF Protections (`src/lib/scraper.ts`)
The URL ingestion scraper resolves target hostnames to IP addresses and checks them against private network boundaries (e.g. `127.0.0.1`, `10.0.0.0/8`, AWS metadata endpoint `169.254.169.254`) before making HTTP requests. This prevents Server-Side Request Forgery (SSRF) vulnerabilities.

### 2. Hybrid Search Engine (`src/lib/search.ts`)
When a user queries their memory, Recall combines:
- Cosine similarity matching on 768-dimensional AI embeddings.
- Fuzzy keyword match using `Fuse.js` for typo tolerance.
- Sorting filters (Relevance, Newest, Oldest).

### 3. PWA & Web Share Target (`public/manifest.json`)
The application defines a PWA manifest linking standalone layouts and custom icons. It includes a `share_target` block so users on Android/Chrome can click "Share to Recall" directly from external apps.

### 4. Privacy Center (`src/app/settings/page.tsx`)
Enforces data portability and compliance. Users can:
- Export all memories, tags, and search history as a JSON backup.
- Permanently purge search histories.
- Delete individual or all saved memories.
- Permanently delete their account.
