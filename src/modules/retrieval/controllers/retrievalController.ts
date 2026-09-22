import { RequestHandler } from "express";
import { getDatabase } from "../../../config/database";
import { env } from "../../../config/env";
import { RetrievalValidationService } from "../services/RetrievalValidationService";
import { SearchService } from "../services/SearchService";
import {
  EmbeddingRequest,
  EmbeddingResponse,
  Bm25SearchResponse,
  SearchFilters
} from "../types/retrieval.types";

const retrievalValidationService = new RetrievalValidationService();

// ─── Phase 1: Readiness ───────────────────────────────────────────────────────

export const getRetrievalReadiness: RequestHandler = async (_request, response) => {
  try {
    const database = getDatabase();
    const readiness = await retrievalValidationService.validateReadiness(
      database,
      "resumes",
      env.mistralEmbedModel,
      env.embeddingDimension
    );

    response.status(readiness.ready ? 200 : 503).json(readiness);
  } catch (error) {
    const message = error instanceof Error ? error.message : "DATABASE_UNAVAILABLE";

    response.status(503).json({
      ready: false,
      collection: "resumes",
      resumeCount: 0,
      resumesWithEmbedding: 0,
      embeddingModel: env.mistralEmbedModel,
      embeddingDimension: env.embeddingDimension,
      message
    });
  }
};

// ─── Phase 3: Query embedding ─────────────────────────────────────────────────

interface MistralEmbeddingApiResponse {
  data?: Array<{ embedding?: unknown }>;
  model?: string;
}

export const createQueryEmbedding: RequestHandler = async (request, response) => {
  const body = request.body as Partial<EmbeddingRequest>;
  const input = typeof body.input === "string" ? body.input.trim() : "";

  if (!input) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_EMBEDDING_INPUT",
      message: "input is required and must be a non-empty string"
    });
    return;
  }

  if (!env.mistralApiKey) {
    response.status(503).json({
      success: false,
      errorCode: "EMBEDDING_NOT_CONFIGURED",
      message: "Mistral API key is not configured"
    });
    return;
  }

  const model = (typeof body.model === "string" && body.model.trim())
    ? body.model.trim()
    : env.mistralEmbedModel;

  try {
    const apiResponse = await fetch("https://api.mistral.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.mistralApiKey}`
      },
      body: JSON.stringify({ model, input: [input] })
    });

    if (!apiResponse.ok) {
      throw new Error(`MISTRAL_API_ERROR: ${apiResponse.status}`);
    }

    const payload = (await apiResponse.json()) as MistralEmbeddingApiResponse;
    const embedding = payload.data?.[0]?.embedding;

    if (
      !Array.isArray(embedding) ||
      !embedding.every((v) => typeof v === "number" && Number.isFinite(v))
    ) {
      throw new Error("EMBEDDING_INVALID_RESPONSE");
    }

    if (embedding.length !== env.embeddingDimension) {
      throw new Error(
        `EMBEDDING_DIMENSION_MISMATCH: got ${embedding.length}, expected ${env.embeddingDimension}`
      );
    }

    const result: EmbeddingResponse = {
      embedding,
      model: payload.model ?? model,
      dimension: embedding.length
    };

    response.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "EMBEDDING_FAILED";
    response.status(502).json({
      success: false,
      errorCode: "EMBEDDING_FAILED",
      message
    });
  }
};

// ─── Phase 5: BM25 search ─────────────────────────────────────────────────────

interface Bm25RequestBody {
  query?: unknown;
  topK?: unknown;
  filters?: {
    minYearsExperience?: unknown;
    skills?: unknown;
  };
}

export const bm25Search: RequestHandler = async (request, response) => {
  const body = request.body as Bm25RequestBody;

  // ── Validate query ──────────────────────────────────────────────────────────
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_SEARCH_QUERY",
      message: "Search query is required"
    });
    return;
  }

  if (query.length > 1000) {
    response.status(400).json({
      success: false,
      errorCode: "QUERY_TOO_LONG",
      message: "Search query must not exceed 1000 characters"
    });
    return;
  }

  // ── Validate topK ───────────────────────────────────────────────────────────
  const rawTopK = body.topK;
  const topK =
    rawTopK === undefined
      ? env.retrievalDefaultTopK
      : typeof rawTopK === "number" && Number.isFinite(rawTopK) && rawTopK > 0
      ? Math.min(Math.floor(rawTopK), 100)
      : null;

  if (topK === null) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_TOP_K",
      message: "topK must be a positive integer no greater than 100"
    });
    return;
  }

  // ── Validate filters ────────────────────────────────────────────────────────
  const filters: SearchFilters = {};
  if (body.filters?.minYearsExperience !== undefined) {
    const mye = body.filters.minYearsExperience;
    if (typeof mye !== "number" || !Number.isFinite(mye) || mye < 0) {
      response.status(400).json({
        success: false,
        errorCode: "INVALID_FILTER",
        message: "filters.minYearsExperience must be a non-negative number"
      });
      return;
    }
    filters.minYearsExperience = mye;
  }

  // ── Execute search ──────────────────────────────────────────────────────────
  try {
    const db = getDatabase();
    const searchService = new SearchService(db);
    const candidates = await searchService.bm25Search(query, filters, topK);

    const results: Bm25SearchResponse["results"] = candidates.map((c) => ({
      resumeId: c.resumeId,
      name: c.name,
      role: c.role,
      score: c.bm25Score ?? 0,
      matchedSkills: c.skills ?? []
    }));

    const result: Bm25SearchResponse = {
      mode: "bm25",
      query,
      count: results.length,
      results
    };

    response.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "BM25_SEARCH_FAILED";

    // Atlas Search index not configured — surface a clear error
    if (message.includes("$search") || message.includes("index")) {
      response.status(503).json({
        success: false,
        errorCode: "ATLAS_SEARCH_UNAVAILABLE",
        message:
          "Atlas Search index is not configured. Create a search index named 'default' on the resumes collection."
      });
      return;
    }

    response.status(500).json({
      success: false,
      errorCode: "BM25_SEARCH_FAILED",
      message
    });
  }
};

// ─── Phase 6: Vector search ───────────────────────────────────────────────────

interface VectorRequestBody {
  query?: unknown;
  topK?: unknown;
  filters?: {
    minYearsExperience?: unknown;
  };
}

export const vectorSearch: RequestHandler = async (request, response) => {
  const body = request.body as VectorRequestBody;

  // ── Validate query ──────────────────────────────────────────────────────────
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_SEARCH_QUERY",
      message: "Search query is required"
    });
    return;
  }

  if (query.length > 1000) {
    response.status(400).json({
      success: false,
      errorCode: "QUERY_TOO_LONG",
      message: "Search query must not exceed 1000 characters"
    });
    return;
  }

  // ── Validate topK ───────────────────────────────────────────────────────────
  const rawTopK = body.topK;
  const topK =
    rawTopK === undefined
      ? env.retrievalDefaultTopK
      : typeof rawTopK === "number" && Number.isFinite(rawTopK) && rawTopK > 0
      ? Math.min(Math.floor(rawTopK), 100)
      : null;

  if (topK === null) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_TOP_K",
      message: "topK must be a positive integer no greater than 100"
    });
    return;
  }

  // ── Validate filters ────────────────────────────────────────────────────────
  const filters: SearchFilters = {};
  if (body.filters?.minYearsExperience !== undefined) {
    const mye = body.filters.minYearsExperience;
    if (typeof mye !== "number" || !Number.isFinite(mye) || mye < 0) {
      response.status(400).json({
        success: false,
        errorCode: "INVALID_FILTER",
        message: "filters.minYearsExperience must be a non-negative number"
      });
      return;
    }
    filters.minYearsExperience = mye;
  }

  // ── Execute search ──────────────────────────────────────────────────────────
  try {
    const db = getDatabase();
    const searchService = new SearchService(db);
    const { candidates } = await searchService.vectorSearch(query, filters, topK);

    const results = candidates.map((c) => ({
      resumeId: c.resumeId,
      name: c.name,
      role: c.role,
      vectorScore: c.vectorScore ?? 0
    }));

    response.status(200).json({
      mode: "vector",
      count: results.length,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "VECTOR_SEARCH_FAILED";

    if (message === "EMBEDDING_NOT_CONFIGURED") {
      response.status(503).json({
        success: false,
        errorCode: "EMBEDDING_NOT_CONFIGURED",
        message: "Mistral API key is not configured"
      });
      return;
    }

    if (message.includes("$vectorSearch") || message.includes("vector_index")) {
      response.status(503).json({
        success: false,
        errorCode: "VECTOR_INDEX_UNAVAILABLE",
        message:
          "Atlas Vector Search index is not configured. Create a vector index named 'vector_index' on the resumes.embedding field (dimensions: 1024, similarity: cosine)."
      });
      return;
    }

    response.status(500).json({
      success: false,
      errorCode: "VECTOR_SEARCH_FAILED",
      message
    });
  }
};

// ─── Phase 8: Hybrid search (debug) ──────────────────────────────────────────

interface HybridRequestBody {
  query?: unknown;
  topK?: unknown;
  filters?: {
    minYearsExperience?: unknown;
  };
}

export const hybridSearch: RequestHandler = async (request, response) => {
  const body = request.body as HybridRequestBody;

  // ── Validate query ──────────────────────────────────────────────────────────
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_SEARCH_QUERY",
      message: "Search query is required"
    });
    return;
  }

  if (query.length > 1000) {
    response.status(400).json({
      success: false,
      errorCode: "QUERY_TOO_LONG",
      message: "Search query must not exceed 1000 characters"
    });
    return;
  }

  // ── Validate topK ───────────────────────────────────────────────────────────
  const rawTopK = body.topK;
  const topK =
    rawTopK === undefined
      ? env.retrievalDefaultTopK
      : typeof rawTopK === "number" && Number.isFinite(rawTopK) && rawTopK > 0
      ? Math.min(Math.floor(rawTopK), 100)
      : null;

  if (topK === null) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_TOP_K",
      message: "topK must be a positive integer no greater than 100"
    });
    return;
  }

  // ── Validate filters ────────────────────────────────────────────────────────
  const filters: SearchFilters = {};
  if (body.filters?.minYearsExperience !== undefined) {
    const mye = body.filters.minYearsExperience;
    if (typeof mye !== "number" || !Number.isFinite(mye) || mye < 0) {
      response.status(400).json({
        success: false,
        errorCode: "INVALID_FILTER",
        message: "filters.minYearsExperience must be a non-negative number"
      });
      return;
    }
    filters.minYearsExperience = mye;
  }

  // ── Execute hybrid (parallel) ───────────────────────────────────────────────
  try {
    const db = getDatabase();
    const searchService = new SearchService(db);
    const { bm25Candidates, vectorCandidates, timings } =
      await searchService.hybridSearch(query, filters, topK);

    // Shape for the debug response — scores kept separate, not merged
    const bm25Results = bm25Candidates.map((c) => ({
      resumeId: c.resumeId,
      name: c.name,
      score: c.bm25Score ?? 0
    }));

    const vectorResults = vectorCandidates.map((c) => ({
      resumeId: c.resumeId,
      name: c.name,
      score: c.vectorScore ?? 0
    }));

    response.status(200).json({
      mode: "hybrid-debug",
      bm25: bm25Results,
      vector: vectorResults,
      timings: {
        bm25Ms: timings.bm25Ms,
        embeddingMs: timings.embeddingMs,
        vectorMs: timings.vectorMs
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "HYBRID_SEARCH_FAILED";

    if (message === "EMBEDDING_NOT_CONFIGURED") {
      response.status(503).json({
        success: false,
        errorCode: "EMBEDDING_NOT_CONFIGURED",
        message: "Mistral API key is not configured"
      });
      return;
    }

    response.status(500).json({
      success: false,
      errorCode: "HYBRID_SEARCH_FAILED",
      message
    });
  }
};

// ─── Phase 11: LLM re-rank ────────────────────────────────────────────────────

import { LLMService } from "../services/LLMService";

const llmService = new LLMService();

interface RerankRequestBody {
  query?: unknown;
  candidates?: unknown;
  topK?: unknown;
}

export const rerankCandidates: RequestHandler = async (request, response) => {
  const body = request.body as RerankRequestBody;

  // ── Validate query ──────────────────────────────────────────────────────────
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_SEARCH_QUERY",
      message: "Search query is required"
    });
    return;
  }

  // ── Validate candidates ─────────────────────────────────────────────────────
  if (!Array.isArray(body.candidates) || body.candidates.length === 0) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_CANDIDATES",
      message: "candidates must be a non-empty array"
    });
    return;
  }

  // Each candidate must have a non-empty resumeId string and snippet string
  const invalidCandidate = (body.candidates as unknown[]).find(
    (c) =>
      typeof c !== "object" ||
      c === null ||
      typeof (c as Record<string, unknown>).resumeId !== "string" ||
      !(c as Record<string, unknown>).resumeId ||
      typeof (c as Record<string, unknown>).snippet !== "string"
  );

  if (invalidCandidate !== undefined) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_CANDIDATE_SHAPE",
      message: "Each candidate must have a non-empty resumeId string and a snippet string"
    });
    return;
  }

  // Cap candidates at 50 to prevent oversized prompts
  if ((body.candidates as unknown[]).length > 50) {
    response.status(400).json({
      success: false,
      errorCode: "TOO_MANY_CANDIDATES",
      message: "candidates must not exceed 50 items"
    });
    return;
  }

  // ── Validate topK ───────────────────────────────────────────────────────────
  const rawTopK = body.topK;
  const topK =
    rawTopK === undefined
      ? env.rerankDefaultTopN
      : typeof rawTopK === "number" && Number.isFinite(rawTopK) && rawTopK > 0
      ? Math.min(Math.floor(rawTopK), 50)
      : null;

  if (topK === null) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_TOP_K",
      message: "topK must be a positive integer no greater than 50"
    });
    return;
  }

  // ── Build SearchCandidate list from request body ────────────────────────────
  const candidates = (body.candidates as Array<{ resumeId: string; snippet: string }>).map(
    (c) => ({
      resumeId: c.resumeId,
      snippet: c.snippet,
      sources: [] as ("bm25" | "vector")[]
    })
  );

  // ── Execute LLM re-rank ─────────────────────────────────────────────────────
  try {
    const results = await llmService.rerankCandidates(query, candidates, topK);

    // Guard: returned IDs must be a strict subset of input IDs
    const inputIds = new Set(candidates.map((c) => c.resumeId));
    const safeResults = results.filter((r) => inputIds.has(r.resumeId));

    response.status(200).json({
      results: safeResults,
      model: env.groqModel
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RERANK_FAILED";

    if (message === "GROQ_NOT_CONFIGURED") {
      response.status(503).json({
        success: false,
        errorCode: "GROQ_NOT_CONFIGURED",
        message: "Groq API key is not configured"
      });
      return;
    }

    if (message === "RERANK_INVALID_JSON" || message === "RERANK_INVALID_SCHEMA") {
      response.status(502).json({
        success: false,
        errorCode: message,
        message: "LLM returned an invalid response. Try again."
      });
      return;
    }

    response.status(500).json({
      success: false,
      errorCode: "RERANK_FAILED",
      message
    });
  }
};

// ─── Phase 12: Candidate summarization ───────────────────────────────────────

interface SummarizeRequestBody {
  query?: unknown;
  candidate?: unknown;
  style?: unknown;
  maxTokens?: unknown;
}

export const summarizeCandidate: RequestHandler = async (request, response) => {
  const body = request.body as SummarizeRequestBody;

  // ── Validate query ──────────────────────────────────────────────────────────
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_SEARCH_QUERY",
      message: "Search query is required"
    });
    return;
  }

  // ── Validate candidate ──────────────────────────────────────────────────────
  if (
    typeof body.candidate !== "object" ||
    body.candidate === null
  ) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_CANDIDATE",
      message: "candidate must be an object with resumeId and snippet"
    });
    return;
  }

  const candidate = body.candidate as Record<string, unknown>;

  if (
    typeof candidate.resumeId !== "string" ||
    !candidate.resumeId.trim()
  ) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_CANDIDATE",
      message: "candidate.resumeId must be a non-empty string"
    });
    return;
  }

  if (typeof candidate.snippet !== "string") {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_CANDIDATE",
      message: "candidate.snippet must be a string"
    });
    return;
  }

  // ── Validate style ──────────────────────────────────────────────────────────
  const validStyles = ["short", "detailed"] as const;
  type SummaryStyle = (typeof validStyles)[number];

  const rawStyle = body.style;
  const isValidStyle = rawStyle === undefined || validStyles.includes(rawStyle as SummaryStyle);

  if (!isValidStyle) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_STYLE",
      message: "style must be 'short' or 'detailed'"
    });
    return;
  }

  const style: SummaryStyle =
    rawStyle === undefined ? "short" : (rawStyle as SummaryStyle);

  // ── Validate maxTokens ──────────────────────────────────────────────────────
  const rawMaxTokens = body.maxTokens;
  const maxTokens =
    rawMaxTokens === undefined
      ? 150
      : typeof rawMaxTokens === "number" &&
        Number.isFinite(rawMaxTokens) &&
        rawMaxTokens > 0
      ? Math.min(Math.floor(rawMaxTokens), 500)
      : null;

  if (maxTokens === null) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_MAX_TOKENS",
      message: "maxTokens must be a positive integer no greater than 500"
    });
    return;
  }

  // ── Generate summary ────────────────────────────────────────────────────────
  try {
    const summary = await llmService.summarizeCandidateFit({
      query,
      candidate: {
        resumeId: candidate.resumeId as string,
        snippet: candidate.snippet as string
      },
      style,
      maxTokens
    });

    response.status(200).json({
      resumeId: candidate.resumeId as string,
      summary: summary.trim()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SUMMARIZE_FAILED";

    if (message === "GROQ_NOT_CONFIGURED") {
      response.status(503).json({
        success: false,
        errorCode: "GROQ_NOT_CONFIGURED",
        message: "Groq API key is not configured"
      });
      return;
    }

    // Summarization failure must NOT remove the candidate — return a degraded response
    response.status(200).json({
      resumeId: candidate.resumeId as string,
      summary: null,
      degraded: true,
      warning: "SUMMARIZATION_FAILED"
    });
  }
};

// ─── Phase 14: Full end-to-end search ────────────────────────────────────────

interface FullSearchRequestBody {
  query?: unknown;
  filters?: {
    minYearsExperience?: unknown;
  };
  options?: {
    bm25TopK?: unknown;
    vectorTopK?: unknown;
    rerankTopN?: unknown;
    finalTopK?: unknown;
    summarize?: unknown;
    summaryStyle?: unknown;
  };
}

export const fullSearch: RequestHandler = async (request, response) => {
  const body = request.body as FullSearchRequestBody;

  // ── Validate query ──────────────────────────────────────────────────────────
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_SEARCH_QUERY",
      message: "Search query is required"
    });
    return;
  }

  if (query.length > 1000) {
    response.status(400).json({
      success: false,
      errorCode: "QUERY_TOO_LONG",
      message: "Search query must not exceed 1000 characters"
    });
    return;
  }

  // ── Validate filters ────────────────────────────────────────────────────────
  const filters: SearchFilters = {};
  if (body.filters?.minYearsExperience !== undefined) {
    const mye = body.filters.minYearsExperience;
    if (typeof mye !== "number" || !Number.isFinite(mye) || mye < 0) {
      response.status(400).json({
        success: false,
        errorCode: "INVALID_FILTER",
        message: "filters.minYearsExperience must be a non-negative number"
      });
      return;
    }
    filters.minYearsExperience = mye;
  }

  // ── Validate options ────────────────────────────────────────────────────────
  const opts = body.options ?? {};

  const capInt = (val: unknown, max: number, fallback: number): number | null => {
    if (val === undefined) return fallback;
    if (typeof val === "number" && Number.isFinite(val) && val > 0)
      return Math.min(Math.floor(val), max);
    return null;
  };

  const bm25TopK  = capInt(opts.bm25TopK,   100, env.retrievalDefaultTopK);
  const vectorTopK = capInt(opts.vectorTopK,  100, env.retrievalDefaultTopK);
  const rerankTopN = capInt(opts.rerankTopN,   50, env.rerankDefaultTopN);
  const finalTopK  = capInt(opts.finalTopK,    50, env.rerankDefaultTopN);

  if (bm25TopK === null || vectorTopK === null || rerankTopN === null || finalTopK === null) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_OPTION",
      message: "bm25TopK, vectorTopK, rerankTopN, and finalTopK must be positive integers"
    });
    return;
  }

  const summarize = opts.summarize === undefined ? false : opts.summarize === true;

  const validStyles = ["short", "detailed"];
  const summaryStyle =
    opts.summaryStyle === undefined
      ? "short"
      : validStyles.includes(opts.summaryStyle as string)
      ? (opts.summaryStyle as "short" | "detailed")
      : null;

  if (summaryStyle === null) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_STYLE",
      message: "options.summaryStyle must be 'short' or 'detailed'"
    });
    return;
  }

  // ── Execute pipeline ────────────────────────────────────────────────────────
  try {
    const db = getDatabase();
    const searchService = new SearchService(db);

    const result = await searchService.endToEndSearch(query, filters, {
      bm25TopK,
      vectorTopK,
      rerankTopN,
      finalTopK,
      summarize,
      summaryStyle
    });

    // Both searches failed — return 503
    if (
      result.warnings.includes("BM25_FAILED") &&
      result.warnings.includes("VECTOR_FAILED")
    ) {
      response.status(503).json({
        success: false,
        errorCode: "SEARCH_UNAVAILABLE",
        message: "No retrieval strategy is currently available"
      });
      return;
    }

    response.status(200).json({
      query,
      results: result.results,
      degraded: result.degraded,
      warnings: result.warnings,
      timings: result.timings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SEARCH_FAILED";
    response.status(500).json({
      success: false,
      errorCode: "SEARCH_FAILED",
      message
    });
  }
};
