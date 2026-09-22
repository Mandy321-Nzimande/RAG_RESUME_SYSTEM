// ─── Candidate shape ─────────────────────────────────────────────────────────

export interface SearchCandidate {
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  skills?: string[];
  snippet?: string;
  rawText?: string;
  email?: string;
  bm25Score?: number;
  vectorScore?: number;
  location?: string;
  education?: string;
  certification?: string;
  totalExperience?: number;
  sources: ("bm25" | "vector")[];
}

// ─── Re-ranked result ─────────────────────────────────────────────────────────

export interface RankedResult {
  rank: number;
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  totalExperience?: number;
  skills?: string[];
  sources: ("bm25" | "vector")[];
  relevanceScore?: number;
  reason?: string;
  summary?: string;
  retrievalScore?: number;
}

// ─── Search request shapes ────────────────────────────────────────────────────

export interface SearchFilters {
  minYearsExperience?: number;
  skills?: string[];
  hardConstraints?: Record<string, Record<string, number | string | boolean>>;
  resumeIds?: string[];
}

export interface SearchOptions {
  bm25TopK?: number;
  vectorTopK?: number;
  rerankTopN?: number;
  finalTopK?: number;
  summarize?: boolean;
  summaryStyle?: "short" | "detailed";
  minSimilarity?: number;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  options?: SearchOptions;
}

// ─── Component timings ────────────────────────────────────────────────────────

export interface ComponentTimings {
  embeddingMs?: number;
  bm25Ms?: number;
  vectorMs?: number;
  rerankMs?: number;
  summarizeMs?: number;
  totalMs?: number;
}

// ─── Final search response ────────────────────────────────────────────────────

export interface SearchResponse {
  query: string;
  results: RankedResult[];
  degraded: boolean;
  warnings: string[];
  timings: ComponentTimings;
}

// ─── BM25 endpoint response ───────────────────────────────────────────────────

export interface Bm25ResultItem {
  resumeId: string;
  name?: string;
  role?: string;
  score: number;
  matchedSkills?: string[];
}

export interface Bm25SearchResponse {
  mode: "bm25";
  query: string;
  count: number;
  results: Bm25ResultItem[];
}

// ─── Vector endpoint response ─────────────────────────────────────────────────

export interface VectorResultItem {
  resumeId: string;
  name?: string;
  role?: string;
  vectorScore: number;
}

export interface VectorSearchResponse {
  mode: "vector";
  count: number;
  results: VectorResultItem[];
}

// ─── Hybrid endpoint response ─────────────────────────────────────────────────

export interface HybridSearchResponse {
  mode: "hybrid-debug";
  bm25: Array<{ resumeId: string; name?: string; score: number }>;
  vector: Array<{ resumeId: string; name?: string; score: number }>;
  timings: {
    bm25Ms: number;
    embeddingMs: number;
    vectorMs: number;
  };
}

// ─── Re-rank shapes ───────────────────────────────────────────────────────────

export interface RerankCandidate {
  resumeId: string;
  snippet: string;
}

export interface RerankRequest {
  query: string;
  candidates: RerankCandidate[];
  topK?: number;
}

export interface RerankResultItem {
  resumeId: string;
  rank: number;
  relevanceScore: number;
  reason: string;
}

export interface RerankResponse {
  results: RerankResultItem[];
  model: string;
}

// ─── Summarize shapes ─────────────────────────────────────────────────────────

export interface SummarizeRequest {
  query: string;
  candidate: RerankCandidate;
  style?: "short" | "detailed";
  maxTokens?: number;
}

export interface SummarizeResponse {
  resumeId: string;
  summary: string;
}

// ─── Embedding endpoint shapes ────────────────────────────────────────────────

export interface EmbeddingRequest {
  model: string;
  input: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimension: number;
}
