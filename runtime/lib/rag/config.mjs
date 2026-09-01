/** JS mirror of src/lib/rag/config.ts for the Node indexer. */
export const CHUNK_TARGET_CHARS = 1200;
export const CHUNK_OVERLAP_CHARS = 150;
export const BM25_K1 = 1.2;
export const BM25_B = 0.75;
export const EMBED_DIMS = 768;
export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_BATCH_SIZE = 100;
export const EMBED_CONCURRENCY = 2;
export const MAX_DOC_FREQ_TERMS = 5_000;
