import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Initialize Supabase client if credentials are provided in env
const getSupabaseClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    return createClient(url, key);
  }
  return null;
};

// Ensure local directory exists (only used for local fallback)
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating uploads directory:', err);
  }
}

export interface UploadedFileResponse {
  filePath: string; // The URL/relative path
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadedFileResponse> {
  // 1. Validate MIME types
  const allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'application/pdf'
  ];

  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error(`File type ${mimeType} is not supported. Allowed formats: PNG, JPEG, WEBP, PDF.`);
  }

  // 2. Validate File Size limits (5MB for images, 10MB for PDF)
  const isPdf = mimeType === 'application/pdf';
  const sizeLimit = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;

  if (fileBuffer.length > sizeLimit) {
    throw new Error(`File is too large. Maximum size for ${isPdf ? 'PDFs' : 'Images'} is ${isPdf ? '10MB' : '5MB'}.`);
  }

  // 3. Sanitize filename
  const ext = path.extname(originalName).toLowerCase();
  const safeBaseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100);

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const safeFileName = `${safeBaseName}-${uniqueSuffix}${ext}`;

  const supabase = getSupabaseClient();

  if (supabase) {
    // CLOUD MODE: Upload to Supabase Storage Bucket ("memories")
    const { data, error } = await supabase.storage
      .from('memories')
      .upload(safeFileName, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error details:', error);
      throw new Error(`Cloud upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('memories')
      .getPublicUrl(safeFileName);

    return {
      filePath: publicUrlData.publicUrl,
      fileName: safeFileName,
      fileSize: fileBuffer.length,
      mimeType
    };
  } else {
    // LOCAL MODE: Save to local public/uploads directory
    await ensureUploadsDir();
    const absoluteDestPath = path.join(UPLOADS_DIR, safeFileName);
    await fs.writeFile(absoluteDestPath, fileBuffer);

    return {
      filePath: `/uploads/${safeFileName}`,
      fileName: safeFileName,
      fileSize: fileBuffer.length,
      mimeType
    };
  }
}

export async function deleteUploadedFile(relativeOrPublicUrlPath: string): Promise<void> {
  const supabase = getSupabaseClient();
  const fileName = path.basename(relativeOrPublicUrlPath);

  if (supabase && relativeOrPublicUrlPath.startsWith('http')) {
    // CLOUD MODE: Delete from Supabase bucket
    const { error } = await supabase.storage
      .from('memories')
      .remove([fileName]);

    if (error) {
      console.warn(`Cloud file deletion failed for ${fileName}: ${error.message}`);
    }
  } else {
    // LOCAL MODE: Delete from local disk
    const absolutePath = path.join(UPLOADS_DIR, fileName);
    try {
      await fs.unlink(absolutePath);
    } catch (err: any) {
      console.warn(`Local file deletion failed for ${absolutePath}: ${err.message}`);
    }
  }
}
