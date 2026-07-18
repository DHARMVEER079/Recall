import { GoogleGenAI } from '@google/genai';

// Initialize Gemini Client if API key is present
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Helper to generate a deterministic mock embedding vector of 768 dimensions
 * for local keyword-based semantic comparisons when Gemini is offline.
 */
function generateMockVector(text: string): number[] {
  const dims = 768;
  const vector = new Array(dims).fill(0);
  const normalized = text.toLowerCase();

  // Simple hashing to fill the vector deterministically
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const index = (charCode * (i + 1)) % dims;
    vector[index] += Math.sin(charCode + i);
  }

  // Normalize vector to unit length
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
    vector[0] = 1.0; // fallback
  }

  return vector;
}

/**
 * Generate 768-dimension semantic embeddings
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const aiClient = getGenAIClient();
  if (!aiClient) {
    // Graceful fallback to deterministic mock embedding vector
    return generateMockVector(text);
  }

  try {
    const response = await aiClient.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });
    
    const resAny = response as any;
    if (resAny.embedding?.values) {
      return resAny.embedding.values;
    }
    if (resAny.embeddings?.values) {
      return resAny.embeddings.values;
    }
    if (Array.isArray(resAny.embeddings) && resAny.embeddings[0]?.values) {
      return resAny.embeddings[0].values;
    }
    throw new Error('No embedding values returned from Gemini API.');
  } catch (error) {
    console.error('Gemini Embedding Error, falling back to mock:', error);
    return generateMockVector(text);
  }
}

export interface AIProcessedResult {
  title: string;
  summary: string;
  category: string; // Products, Articles, Videos, Documents, Screenshots, Places, Ideas
  tags: string[];
  ocrText?: string;
}

/**
 * Classify and extract metadata from saved items (links, PDFs, images, notes)
 */
export async function processSavedContent(
  type: 'link' | 'image' | 'pdf' | 'note',
  rawContent: string, // URL for link, extracted text for doc, note text for note
  originalTitle?: string,
  mimeType?: string,
  fileBuffer?: Buffer
): Promise<AIProcessedResult> {
  const aiClient = getGenAIClient();

  if (!aiClient) {
    // Offline / Mock fallback pipeline
    return runMockProcessingPipeline(type, rawContent, originalTitle, mimeType);
  }

  try {
    if (type === 'image' && fileBuffer) {
      // Multimodal processing for screenshot / image
      const imagePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType || 'image/png'
        }
      };

      const prompt = `Analyze this image (which may be a screenshot, photograph, or design). 
Perform OCR and extract any visible text. Identify products, brands, places, colors, objects, and overall context. 
Return your analysis strictly in JSON format matching this TypeScript interface:
{
  title: string; // concise title for this image/screenshot (e.g. "Nike Air Max Mockup" or "Goa Beach Sunset")
  summary: string; // brief description of what is in the image and why someone would save it
  category: "Screenshots" | "Products" | "Places" | "Ideas"; 
  tags: string[]; // 3-6 relevant tags (e.g., ["shoes", "nike", "shopping", "design"])
  ocrText: string; // all visible text extracted word-for-word from the image
}
Do not write markdown formatting in your response. Output only raw JSON.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [imagePart, prompt],
      });

      const responseText = response.text?.trim() || '{}';
      // Clean potential JSON markdown blocks
      const cleanJsonStr = responseText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      return {
        title: parsed.title || originalTitle || 'Screenshot',
        summary: parsed.summary || 'Visual memory processed by AI.',
        category: parsed.category || 'Screenshots',
        tags: parsed.tags || ['Image'],
        ocrText: parsed.ocrText || ''
      };
    }

    // Text-based pipeline (Links, PDFs, Notes)
    const prompt = `Analyze the following saved content.
Type of content: ${type}
Original Title: ${originalTitle || 'Unknown'}
Content body/raw context:
${rawContent.substring(0, 12000)}

Please summarize, tag, and categorize this content. Return your analysis strictly in JSON format:
{
  title: string; // a refined, clean, concise title. (Keep the original if it is already clean, or generate a better one)
  summary: string; // a clear 1-2 sentence summary of what this is
  category: "Products" | "Articles" | "Videos" | "Documents" | "Places" | "Ideas";
  tags: string[]; // 3-6 relevant tags
}
Return only the raw JSON.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text?.trim() || '{}';
    const cleanJsonStr = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJsonStr);

    return {
      title: parsed.title || originalTitle || 'Saved Item',
      summary: parsed.summary || 'Content processed by AI.',
      category: parsed.category || (type === 'pdf' ? 'Documents' : 'Articles'),
      tags: parsed.tags || [type]
    };
  } catch (error) {
    console.error('Gemini content processing failed, falling back to Mock:', error);
    return runMockProcessingPipeline(type, rawContent, originalTitle, mimeType);
  }
}

/**
 * Ask a contextual Q&A question about a specific memory
 */
export async function askMemoryQuestion(
  memoryContext: string,
  question: string,
  userNotesContext?: string
): Promise<string> {
  const aiClient = getGenAIClient();

  if (!aiClient) {
    return runMockQa(memoryContext, question, userNotesContext);
  }

  try {
    const prompt = `You are Recall, a smart personal memory assistant. The user is asking a question about a memory they saved.
Here is the context of the saved memory:
${memoryContext}

${userNotesContext ? `User's personal notes on this memory:\n${userNotesContext}` : ''}

Question: "${question}"

Provide a concise, helpful answer based strictly on the memory context. If the user asks "why did I save this?", look at their personal notes or infer the intent based on the content (e.g. study, shopping, reference). If you don't know or if it is not in the text, say so honestly. Do not make up facts.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Sorry, I couldn't process an answer for that.";
  } catch (error: any) {
    console.error('Q&A error:', error);
    return `AI Q&A is currently unavailable: ${error.message}. Here is the mock fallback: ${runMockQa(memoryContext, question, userNotesContext)}`;
  }
}

/**
 * Local offline Mock Processing pipeline
 */
function runMockProcessingPipeline(
  type: 'link' | 'image' | 'pdf' | 'note',
  content: string,
  originalTitle?: string,
  mimeType?: string
): AIProcessedResult {
  const text = (originalTitle + ' ' + content).toLowerCase();
  
  let title = originalTitle || 'Untitled Memory';
  let summary = 'Saved memory processing complete.';
  let category = 'Ideas';
  let tags: string[] = [];

  // 1. Categorization Rules
  if (type === 'pdf') {
    category = 'Documents';
    tags = ['pdf', 'document'];
  } else if (type === 'image') {
    category = 'Screenshots';
    tags = ['image', 'screenshot'];
  } else if (type === 'link') {
    category = 'Articles';
    tags = ['link', 'bookmark'];
  } else {
    category = 'Ideas';
    tags = ['note', 'thought'];
  }

  // Keywords heuristics
  if (text.includes('buy') || text.includes('price') || text.includes('amazon') || text.includes('shoe') || text.includes('product') || text.includes('laptop') || text.includes('rs') || text.includes('₹') || text.includes('$')) {
    category = 'Products';
    tags.push('shopping', 'wishlist');
  } else if (text.includes('restaurant') || text.includes('hotel') || text.includes('travel') || text.includes('trip') || text.includes('goa') || text.includes('visit') || text.includes('food') || text.includes('cafe')) {
    category = 'Places';
    tags.push('travel', 'explore');
  } else if (text.includes('react') || text.includes('api') || text.includes('doc') || text.includes('tutorial') || text.includes('guide') || text.includes('programming') || text.includes('research') || text.includes('ai') || text.includes('science')) {
    if (type !== 'pdf') category = 'Articles';
    tags.push('tech', 'reference');
  } else if (text.includes('youtube') || text.includes('video') || text.includes('playlist') || text.includes('watch') || text.includes('movie') || text.includes('netflix')) {
    category = 'Videos';
    tags.push('media', 'watch-later');
  }

  // 2. Summary & Tag Generation based on words
  if (type === 'link') {
    summary = `Saved URL from ${new URL(content).hostname}. Auto-extracted metadata for reference.`;
  } else if (type === 'pdf') {
    summary = `Document containing text about ${title.toLowerCase()}. Summarized for easy reading.`;
  } else if (type === 'image') {
    summary = `Image/screenshot capture. Contains visual text and objects.`;
  } else {
    summary = `Personal text note: "${content.length > 60 ? content.substring(0, 60) + '...' : content}"`;
  }

  // Generate some random tags from uppercase words or keywords
  const cleanTags = Array.from(new Set(tags));

  return {
    title,
    summary,
    category,
    tags: cleanTags.slice(0, 5),
    ocrText: type === 'image' ? 'Mock OCR: Extracted text from screenshot.' : undefined
  };
}

/**
 * Local offline Mock Q&A
 */
function runMockQa(memoryContext: string, question: string, userNotes?: string): string {
  const q = question.toLowerCase();
  if (q.includes('summary') || q.includes('summarize')) {
    return `[Mock AI] This memory describes a saved resource. The core title is "${memoryContext.substring(0, 50)}...". It was categorized by Recall and is ready for reference.`;
  }
  if (q.includes('why') && q.includes('save')) {
    if (userNotes) {
      return `[Mock AI] Based on your notes, you saved this because: "${userNotes}".`;
    }
    return `[Mock AI] You saved this for future reference. No personal notes were written, but it matches your interest in this topic.`;
  }
  return `[Mock AI] I parsed your question: "${question}". Since the Gemini API key is not currently configured, I cannot perform a full semantic synthesis of this content, but you can see the original text details in the fields below.`;
}
