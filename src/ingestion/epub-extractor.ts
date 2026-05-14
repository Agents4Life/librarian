import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { IngestionResult, IngestionOptions } from './types.js';

/**
 * Minimal EPUB text extraction.
 * EPUBs are ZIP files containing XHTML/HTML files.
 * We extract text by finding HTML content files and stripping tags.
 * For production use, recommend installing epub-parse or similar.
 */

const stripHtml = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Check if a buffer is a ZIP file (EPUB is a ZIP) */
const isZipBuffer = (buffer: Buffer): boolean =>
  buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;

/** Find XHTML/HTML file offsets in the ZIP (simplified) */
const findHtmlFiles = (content: string): string[] => {
  const files: string[] = [];
  // Look for common EPUB content file patterns in local file headers
  const regex = /[\x00-\xff]{0,100}(chapter\d*\.x?html?|content\d*\.x?html?|section\d*\.x?html?|[\w-]+\.x?html?)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    if (name && !files.includes(name)) {
      files.push(name);
    }
  }
  return files;
};

export const ingestEpub = async (
  filePath: string,
  vaultPath: string,
  options: IngestionOptions = {},
): Promise<IngestionResult> => {
  const rawDir = options.rawDir ?? 'raw';
  const maxLen = options.maxTextLength ?? 100_000;
  
  try {
    const buffer = await readFile(filePath);
    
    if (!isZipBuffer(buffer)) {
      return {
        success: false,
        sourcePath: filePath,
        targetPath: '',
        title: '',
        text: '',
        format: 'epub',
        error: 'File is not a valid EPUB (ZIP) file.',
      };
    }
    
    // TODO: This decodes the entire ZIP buffer as UTF-8, which is technically incorrect.
    // A proper EPUB parser (e.g., jszip or yauzl) should be used to parse the ZIP directory
    // and extract per-file XHTML/HTML content. The current approach works for uncompressed
    // EPUB entries because the HTML tags remain visible in the raw byte stream, but will
    // fail for compressed entries.
    const content = buffer.toString('utf8');
    
    // Find all text content between HTML tags
    const textParts: string[] = [];
    
    // Look for body content patterns
    const bodyRegex = /<body[^>]*>([\s\S]*?)<\/body>/gi;
    let match;
    while ((match = bodyRegex.exec(content)) !== null) {
      const stripped = stripHtml(match[1]);
      if (stripped.length > 20) {
        textParts.push(stripped);
      }
    }
    
    // Also try paragraph content
    if (textParts.length === 0) {
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      while ((match = pRegex.exec(content)) !== null) {
        const stripped = stripHtml(match[1]);
        if (stripped.length > 10) {
          textParts.push(stripped);
        }
      }
    }
    
    const text = textParts.join('\n\n').trim();
    
    if (text.length < 20) {
      return {
        success: false,
        sourcePath: filePath,
        targetPath: '',
        title: '',
        text: '',
        format: 'epub',
        error: 'No text could be extracted from EPUB. For better results, install epub-parse.',
      };
    }
    
    // Derive title
    const baseName = (filePath.replace(/\.epub$/i, '').split('/').pop() ?? 'Untitled');
    const title = baseName.replace(/[-_]/g, ' ');
    
    const truncatedText = text.slice(0, maxLen);
    const targetPath = `${rawDir}/${baseName.toLowerCase().replace(/\s+/g, '-')}.md`;
    const targetAbs = join(vaultPath, targetPath);
    
    const mdContent = [
      '---',
      `title: "${title}"`,
      `source: "${filePath}"`,
      `format: epub`,
      `ingested_at: "${new Date().toISOString()}"`,
      '---',
      '',
      `# ${title}`,
      '',
      truncatedText,
    ].join('\n');
    
    await mkdir(join(vaultPath, rawDir), { recursive: true });
    await writeFile(targetAbs, mdContent, 'utf8');
    
    return {
      success: true,
      sourcePath: filePath,
      targetPath,
      title,
      text: truncatedText,
      format: 'epub',
    };
  } catch (error) {
    return {
      success: false,
      sourcePath: filePath,
      targetPath: '',
      title: '',
      text: '',
      format: 'epub',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
