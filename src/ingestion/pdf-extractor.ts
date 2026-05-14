import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import type { IngestionResult, IngestionOptions, SupportedFormat } from './types.js';

/**
 * Minimal PDF text extraction.
 * Extracts text from PDF streams by finding text between BT...ET markers.
 * For production use, recommend installing pdf-parse for better extraction.
 */
const extractTextFromPdfBuffer = (buffer: Buffer): { text: string; pages: number } => {
  const content = buffer.toString('latin1');
  
  // Count pages
  const pageCount = (content.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;
  
  // Extract text from BT...ET blocks
  const textBlocks: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  
  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textBlocks.push(tjMatch[1]);
    }
    
    // TJ array format: [(text) num (text) num ...]
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrayMatch[1];
      const textParts = inner.match(/\(([^)]*)\)/g) || [];
      textBlocks.push(textParts.map(t => t.slice(1, -1)).join(''));
    }
  }
  
  const text = textBlocks
    .join('\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .trim();
  
  return { text, pages: pageCount };
};

export const ingestPdf = async (
  filePath: string,
  vaultPath: string,
  options: IngestionOptions = {},
): Promise<IngestionResult> => {
  const rawDir = options.rawDir ?? 'raw';
  const maxLen = options.maxTextLength ?? 100_000;
  
  try {
    const buffer = await readFile(filePath);
    const { text, pages } = extractTextFromPdfBuffer(buffer);
    
    if (!text || text.length < 10) {
      return {
        success: false,
        sourcePath: filePath,
        targetPath: '',
        title: '',
        text: '',
        format: 'pdf',
        pages,
        error: 'No text could be extracted from PDF. For better results, install pdf-parse.',
      };
    }
    
    // Derive title from filename
    const baseName = filePath.replace(/\.pdf$/i, '').split('/').pop() ?? 'Untitled';
    const title = baseName.replace(/[-_]/g, ' ');
    
    const truncatedText = text.slice(0, maxLen);
    const targetPath = `${rawDir}/${baseName.toLowerCase().replace(/\s+/g, '-')}.md`;
    const targetAbs = join(vaultPath, targetPath);
    
    // Write as markdown with frontmatter
    const content = [
      '---',
      `title: "${title}"`,
      `source: "${filePath}"`,
      `format: pdf`,
      `pages: ${pages}`,
      `ingested_at: "${new Date().toISOString()}"`,
      '---',
      '',
      `# ${title}`,
      '',
      truncatedText,
    ].join('\n');
    
    mkdirSync(join(vaultPath, rawDir), { recursive: true });
    writeFileSync(targetAbs, content, 'utf8');
    
    return {
      success: true,
      sourcePath: filePath,
      targetPath,
      title,
      text: truncatedText,
      format: 'pdf',
      pages,
    };
  } catch (error) {
    return {
      success: false,
      sourcePath: filePath,
      targetPath: '',
      title: '',
      text: '',
      format: 'pdf',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
