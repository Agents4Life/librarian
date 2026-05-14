export type SupportedFormat = 'pdf' | 'epub';

export interface IngestionResult {
  success: boolean;
  sourcePath: string;        // original file path
  targetPath: string;        // where it was saved in raw/
  title: string;
  author?: string;
  text: string;              // extracted text content
  format: SupportedFormat;
  pages?: number;
  error?: string;
}

export interface IngestionOptions {
  /** Target raw directory within vault */
  rawDir?: string;
  /** Maximum text length to extract (chars) */
  maxTextLength?: number;
  /** Whether to preserve original file */
  keepOriginal?: boolean;
}
