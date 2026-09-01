/** Central tunables for chunking, BM25, RRF, embeddings, and context budget. */
export const CHUNK_TARGET_CHARS = 1200;
export const CHUNK_OVERLAP_CHARS = 150;
export const BM25_K1 = 1.2;
export const BM25_B = 0.75;
export const RRF_K = 60;
export const CONTEXT_BUDGET_CHARS = 6000;
export const EMBED_DIMS = 768;
export const EMBED_MODEL = "gemini-embedding-001";

export const BM25_CANDIDATE_LIMIT = 150;
export const VECTOR_CANDIDATE_LIMIT = 60;
export const MAX_CHUNKS_PER_RESOURCE = 3;
export const NEIGHBOR_EXPANSION_TOP = 3;
export const MAX_QUERY_TERMS = 30;
export const MAX_DOC_FREQ_TERMS = 5_000;
export const CORPUS_STATS_CACHE_MS = 10 * 60 * 1000;
export const SEMANTIC_CACHE_DISTANCE = 0.12;
export const RETRIEVAL_CACHE_TTL_MS = 15 * 60 * 1000;
export const CHAT_TEMPERATURE = 0.2;
export const MAX_TOOL_STEPS = 2;
export const HISTORY_VERBATIM_TURNS = 6;

export const EMBED_BATCH_SIZE = 100;
export const EMBED_CONCURRENCY = 2;
