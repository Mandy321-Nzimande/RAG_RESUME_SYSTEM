export type SearchMode = 'vector' | 'bm25' | 'hybrid';

export interface SearchRequest {
  query: string;
  topK?: number;
  filters?: { minYearsExperience?: number };
  options?: {
    bm25TopK?: number;
    vectorTopK?: number;
    rerankTopN?: number;
    finalTopK?: number;
    summarize?: boolean;
    summaryStyle?: 'short' | 'detailed';
  };
}

export interface SearchResult {
  rank: number;
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  totalExperience?: number;
  skills?: string[];
  sources: ('bm25' | 'vector')[];
  relevanceScore?: number;
  reason?: string;
  summary?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  degraded: boolean;
  warnings: string[];
  timings: {
    embeddingMs?: number;
    bm25Ms?: number;
    vectorMs?: number;
    rerankMs?: number;
    summarizeMs?: number;
    totalMs?: number;
  };
}
