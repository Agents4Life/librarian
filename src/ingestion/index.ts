import { extname } from 'node:path';
import type { IngestionResult, IngestionOptions, SupportedFormat } from './types.js';
import { ingestPdf } from './pdf-extractor.js';
import { ingestEpub } from './epub-extractor.js';

export type { IngestionResult, IngestionOptions, SupportedFormat } from './types.js';

const SUPPORTED_EXTENSIONS: Record<string, SupportedFormat> = {
  '.pdf': 'pdf',
  '.epub': 'epub',
};

export const getSupportedFormats = (): string[] => Object.keys(SUPPORTED_EXTENSIONS);

export const isSupported = (filePath: string): boolean => {
  const ext = extname(filePath).toLowerCase();
  return ext in SUPPORTED_EXTENSIONS;
};

export const ingest = async (
  filePath: string,
  vaultPath: string,
  options?: IngestionOptions,
): Promise<IngestionResult> => {
  const ext = extname(filePath).toLowerCase();
  const format = SUPPORTED_EXTENSIONS[ext];

  if (!format) {
    return {
      success: false,
      sourcePath: filePath,
      targetPath: '',
      title: '',
      text: '',
      format: 'pdf', // default, shouldn't matter
      error: `Unsupported file format: ${ext}. Supported: ${getSupportedFormats().join(', ')}`,
    };
  }

  switch (format) {
    case 'pdf':
      return ingestPdf(filePath, vaultPath, options);
    case 'epub':
      return ingestEpub(filePath, vaultPath, options);
  }
};
