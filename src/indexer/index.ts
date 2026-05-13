export type { Note, NoteIndex, SectionMap, VaultSection } from "./types.js";
export { DEFAULT_SECTION_MAP } from "./types.js";
export { parseFrontmatter, parseNote, computeContentHash, extractHeadings, extractLinks, extractTags, detectSection } from "./parser.js";
export { buildIndex } from "./builder.js";
export { loadIndex, saveIndex } from "./store.js";
export { createQueryApi } from "./query.js";
export {
  emptyMetadata,
  loadIndexMetadata,
  saveIndexMetadata,
  detectStaleness,
  type IndexMetadata,
  type IndexCacheStatus,
  type CacheEntry,
  type FileEntry,
} from "./index-metadata.js";
