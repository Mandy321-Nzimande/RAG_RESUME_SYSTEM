import { Db } from "mongodb";
import { env } from "../../../config/env";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { mapBm25Result, mapVectorResult } from "../utils/candidateMapper";
import { deduplicateCandidates } from "../utils/deduplicate";
import {
  SearchCandidate,
  SearchFilters,
  SearchOptions,
  HybridSearchResponse,
  RankedResult,
  ComponentTimings
} from "../types/retrieval.types";
import { LLMService } from "./LLMService";

export interface EndToEndSearchResult {
  results: RankedResult[];
  degraded: boolean;
  warnings: string[];
  timings: ComponentTimings;
}

const llmService = new LLMService();

// Query-embedding helper — reuses the same Mistral API used during ingestion
async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!env.mistralApiKey) throw new Error("EMBEDDING_NOT_CONFIGURED");

  const response = await fetch("https://api.mistral.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.mistralApiKey}`
    },
    body: JSON.stringify({
      model: env.mistralEmbedModel,
      input: [query]
    })
  });

  if (!response.ok) throw new Error("EMBEDDING_REQUEST_FAILED");

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: unknown }>;
  };
  const embedding = payload.data?.[0]?.embedding;

  if (
    !Array.isArray(embedding) ||
    !embedding.every((v) => typeof v === "number" && Number.isFinite(v))
  ) {
    throw new Error("EMBEDDING_INVALID_RESPONSE");
  }

  if (embedding.length !== env.embeddingDimension) {
    throw new Error("EMBEDDING_DIMENSION_MISMATCH");
  }

  return embedding;
}

export class SearchService {
  private readonly repo: ResumeRepository;

  constructor(db: Db) {
    this.repo = new ResumeRepository(db);
  }

  async filterCandidates(filters: SearchFilters = {}, topK = env.retrievalDefaultTopK): Promise<SearchCandidate[]> {
    const documents = await this.repo.filterCandidates(filters, Math.min(Math.max(Math.floor(topK), 1), 100));
    return deduplicateCandidates(documents.map((doc) => mapBm25Result(doc, 0)), []);
  }

  // ─── BM25 ──────────────────────────────────────────────────────────────────

  async bm25Search(
    query: string,
    filters: SearchFilters = {},
    topK: number = env.retrievalDefaultTopK
  ): Promise<SearchCandidate[]> {
    const raw = await this.repo.bm25Search(query, filters, topK);
    return raw.map(({ doc, score }) => mapBm25Result(doc, score));
  }

  // ─── Vector ────────────────────────────────────────────────────────────────

  async vectorSearch(
    query: string,
    filters: SearchFilters = {},
    topK: number = env.retrievalDefaultTopK
  ): Promise<{ candidates: SearchCandidate[]; embeddingMs: number }> {
    const embeddingStart = Date.now();
    const queryVector = await generateQueryEmbedding(query);
    const embeddingMs = Date.now() - embeddingStart;

    const raw = await this.repo.vectorSearch(queryVector, filters, topK);
    const candidates = raw.map(({ doc, score }) => mapVectorResult(doc, score));

    return { candidates, embeddingMs };
  }

  // ─── Hybrid (parallel, for debug endpoint) ────────────────────────────────

  async hybridSearch(
    query: string,
    filters: SearchFilters = {},
    topK: number = env.retrievalDefaultTopK
  ): Promise<{
    bm25Candidates: SearchCandidate[];
    vectorCandidates: SearchCandidate[];
    merged: SearchCandidate[];
    timings: HybridSearchResponse["timings"];
  }> {
    // BM25 and embedding/vector run in parallel
    const bm25Start = Date.now();
    const embeddingStart = Date.now();

    const [bm25Raw, embeddingResult] = await Promise.allSettled([
      this.repo.bm25Search(query, filters, topK),
      (async () => {
        const vec = await generateQueryEmbedding(query);
        const embeddingMs = Date.now() - embeddingStart;
        const vectorStart = Date.now();
        const raw = await this.repo.vectorSearch(vec, filters, topK);
        const vectorMs = Date.now() - vectorStart;
        return { raw, embeddingMs, vectorMs };
      })()
    ]);

    const bm25Ms = Date.now() - bm25Start;

    const bm25Candidates =
      bm25Raw.status === "fulfilled"
        ? bm25Raw.value.map(({ doc, score }) => mapBm25Result(doc, score))
        : [];

    const { vectorCandidates, embeddingMs, vectorMs } =
      embeddingResult.status === "fulfilled"
        ? {
            vectorCandidates: embeddingResult.value.raw.map(({ doc, score }) =>
              mapVectorResult(doc, score)
            ),
            embeddingMs: embeddingResult.value.embeddingMs,
            vectorMs: embeddingResult.value.vectorMs
          }
        : { vectorCandidates: [], embeddingMs: 0, vectorMs: 0 };

    const merged = deduplicateCandidates(bm25Candidates, vectorCandidates);

    return {
      bm25Candidates,
      vectorCandidates,
      merged,
      timings: { bm25Ms, embeddingMs, vectorMs }
    };
  }

  // ─── End-to-end search pipeline ───────────────────────────────────────────

  async endToEndSearch(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<EndToEndSearchResult> {
    const totalStart = Date.now();
    const warnings: string[] = [];
    let degraded = false;

    const bm25TopK = options.bm25TopK ?? env.retrievalDefaultTopK;
    const vectorTopK = options.vectorTopK ?? env.retrievalDefaultTopK;
    const rerankTopN = options.rerankTopN ?? env.rerankDefaultTopN;
    const finalTopK = options.finalTopK ?? rerankTopN;
    const minSimilarity = options.minSimilarity ?? env.minSimilarity;
    const summarize = options.summarize ?? false;
    const summaryStyle = options.summaryStyle ?? "short";

    // ── Step 1: BM25 and vector run in parallel ────────────────────────────
    const bm25Start = Date.now();
    const embeddingStart = Date.now();

    const [bm25Result, vectorResult] = await Promise.allSettled([
      this.repo.bm25Search(query, filters, bm25TopK),
      (async () => {
        const vec = await generateQueryEmbedding(query);
        const embeddingMs = Date.now() - embeddingStart;
        const vectorStart = Date.now();
        const raw = await this.repo.vectorSearch(vec, filters, vectorTopK);
        const vectorMs = Date.now() - vectorStart;
        return { raw, embeddingMs, vectorMs };
      })()
    ]);

    const bm25Ms = Date.now() - bm25Start;

    const bm25Failed = bm25Result.status === "rejected";
    const vectorFailed = vectorResult.status === "rejected";

    // Both failed — unrecoverable
    if (bm25Failed && vectorFailed) {
      return {
        results: [],
        degraded: true,
        warnings: ["BM25_FAILED", "VECTOR_FAILED"],
        timings: { bm25Ms, embeddingMs: 0, vectorMs: 0, totalMs: Date.now() - totalStart }
      };
    }

    if (bm25Failed) {
      degraded = true;
      warnings.push("BM25_FAILED");
    }
    if (vectorFailed) {
      degraded = true;
      warnings.push("VECTOR_FAILED");
    }

    const bm25Candidates = bm25Failed
      ? []
      : bm25Result.value.map(({ doc, score }) => mapBm25Result(doc, score));

    const { vectorCandidates, embeddingMs, vectorMs } = vectorFailed
      ? { vectorCandidates: [], embeddingMs: 0, vectorMs: 0 }
      : {
          vectorCandidates: vectorResult.value.raw.map(({ doc, score }) =>
            mapVectorResult(doc, score)
          ),
          embeddingMs: vectorResult.value.embeddingMs,
          vectorMs: vectorResult.value.vectorMs
        };

    // ── Step 2: Merge and deduplicate ─────────────────────────────────────
    const relevantVectorCandidates = vectorCandidates.filter(
      (candidate) => (candidate.vectorScore ?? 0) >= minSimilarity
    );
    const merged = deduplicateCandidates(bm25Candidates, relevantVectorCandidates);
    const constrained = merged.filter((candidate) => matchesHardConstraints(candidate, filters.hardConstraints));
    const topCandidates = constrained.slice(0, rerankTopN);

    // ── Step 3: LLM re-rank ───────────────────────────────────────────────
    const rerankStart = Date.now();
    let rerankMs = 0;
    let rankedResults: RankedResult[];

    try {
      const reranked = await llmService.rerankCandidates(query, topCandidates, rerankTopN);
      rerankMs = Date.now() - rerankStart;

      // Build a lookup from resumeId → full candidate for enrichment
      const candidateMap = new Map(topCandidates.map((c) => [c.resumeId, c]));

      rankedResults = reranked.slice(0, finalTopK).map((r) => {
        const candidate = candidateMap.get(r.resumeId);
        return {
          rank: r.rank,
          resumeId: r.resumeId,
          name: candidate?.name,
          role: candidate?.role,
          company: candidate?.company,
          totalExperience: candidate?.totalExperience,
          skills: candidate?.skills,
          sources: candidate?.sources ?? [],
          retrievalScore: candidate?.vectorScore,
          relevanceScore: r.relevanceScore,
          reason: r.reason
        };
      });
    } catch {
      rerankMs = Date.now() - rerankStart;
      degraded = true;
      warnings.push("LLM_RERANK_FAILED");

      // Fallback ordering: BM25 first (by score), then vector-only
      const bm25Only = topCandidates
        .filter((c) => c.sources.includes("bm25"))
        .sort((a, b) => (b.bm25Score ?? 0) - (a.bm25Score ?? 0));
      const vectorOnly = topCandidates.filter(
        (c) => !c.sources.includes("bm25") && c.sources.includes("vector")
      );

      rankedResults = [...bm25Only, ...vectorOnly]
        .slice(0, finalTopK)
        .map((c, i) => ({
          rank: i + 1,
          resumeId: c.resumeId,
          name: c.name,
          role: c.role,
          company: c.company,
          totalExperience: c.totalExperience,
          skills: c.skills,
          sources: c.sources,
          retrievalScore: c.vectorScore
        }));
    }

    // ── Step 4: Optional summaries ────────────────────────────────────────
    let summarizeMs = 0;

    if (summarize && rankedResults.length > 0) {
      const summarizeStart = Date.now();

      const summaryResults = await Promise.allSettled(
        rankedResults.map(async (result) => {
          const candidate = topCandidates.find((c) => c.resumeId === result.resumeId);
          if (!candidate?.snippet) return { resumeId: result.resumeId, summary: undefined };

          const summary = await llmService.summarizeCandidateFit({
            query,
            candidate: { resumeId: result.resumeId, snippet: candidate.snippet },
            style: summaryStyle,
            maxTokens: 150
          });

          return { resumeId: result.resumeId, summary: summary.trim() };
        })
      );

      summarizeMs = Date.now() - summarizeStart;

      const anySummarizationFailed = summaryResults.some((r) => r.status === "rejected");
      if (anySummarizationFailed) {
        degraded = true;
        warnings.push("SUMMARIZATION_FAILED");
      }

      rankedResults = rankedResults.map((result, i) => {
        const summaryResult = summaryResults[i];
        return {
          ...result,
          summary:
            summaryResult.status === "fulfilled"
              ? summaryResult.value.summary
              : undefined
        };
      });
    }

    return {
      results: rankedResults,
      degraded,
      warnings,
      timings: {
        embeddingMs,
        bm25Ms,
        vectorMs,
        rerankMs,
        summarizeMs,
        totalMs: Date.now() - totalStart
      }
    };
  }
}

function matchesHardConstraints(
  candidate: SearchCandidate,
  constraints: SearchFilters["hardConstraints"] = {}
): boolean {
  for (const [field, criteria] of Object.entries(constraints)) {
    const value = field === "experience_years"
      ? candidate.totalExperience
      : field === "certification"
      ? candidate.certification ?? candidate.rawText
      : candidate[field as keyof SearchCandidate];

    for (const [operator, expected] of Object.entries(criteria)) {
      if (operator === "$eq" && field === "certification" && typeof value === "string" && typeof expected === "string") {
        if (!value.toLowerCase().includes(expected.toLowerCase())) return false;
      } else if (operator === "$eq" && value !== expected) return false;
      if (operator === "$lt" && !(typeof value === "number" && typeof expected === "number" && value < expected)) return false;
      if (operator === "$lte" && !(typeof value === "number" && typeof expected === "number" && value <= expected)) return false;
      if (operator === "$gt" && !(typeof value === "number" && typeof expected === "number" && value > expected)) return false;
      if (operator === "$gte" && !(typeof value === "number" && typeof expected === "number" && value >= expected)) return false;
      if (operator === "$regex" && !(typeof value === "string" && value.toLowerCase().includes(String(expected).toLowerCase()))) return false;
    }
  }
  return true;
}
