import { Router } from "express";
import {
  getRetrievalReadiness,
  createQueryEmbedding,
  bm25Search,
  vectorSearch,
  hybridSearch,
  rerankCandidates,
  summarizeCandidate,
  fullSearch
} from "../controllers/retrievalController";

export const retrievalRoutes = Router();

// Phase 1 — readiness check
retrievalRoutes.get("/search/readiness", getRetrievalReadiness);

// Phase 3 — query embedding
retrievalRoutes.post("/embeddings", createQueryEmbedding);

// Phase 5 — BM25 search
retrievalRoutes.post("/search/bm25", bm25Search);

// Phase 6 — Vector search
retrievalRoutes.post("/search/vector", vectorSearch);

// Phase 8 — Hybrid search (debug)
retrievalRoutes.post("/search/hybrid", hybridSearch);

// Phase 11 — LLM re-rank
retrievalRoutes.post("/search/rerank", rerankCandidates);

// Phase 12 — Candidate summarization
retrievalRoutes.post("/search/summarize", summarizeCandidate);

// Phase 14 — Full end-to-end search
retrievalRoutes.post("/search", fullSearch);
