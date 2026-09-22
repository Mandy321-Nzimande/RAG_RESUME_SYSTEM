import { SearchCandidate } from "../types/retrieval.types";

/**
 * Merges two candidate lists (BM25 + vector) by resumeId.
 *
 * Rules:
 * - If a candidate appears in both lists the scores from each source are kept.
 * - The `sources` array records which retrieval paths produced this candidate.
 * - No duplicate resumeId reaches the re-ranker.
 */
export function deduplicateCandidates(
  bm25Candidates: SearchCandidate[],
  vectorCandidates: SearchCandidate[]
): SearchCandidate[] {
  const map = new Map<string, SearchCandidate>();

  for (const candidate of bm25Candidates) {
    map.set(candidate.resumeId, { ...candidate, sources: ["bm25"] });
  }

  for (const candidate of vectorCandidates) {
    const existing = map.get(candidate.resumeId);

    if (existing) {
      // Already found by BM25 — merge vector score and mark both sources
      existing.vectorScore = candidate.vectorScore;
      if (!existing.sources.includes("vector")) {
        existing.sources.push("vector");
      }
      // Prefer the richer snippet
      if (!existing.snippet && candidate.snippet) {
        existing.snippet = candidate.snippet;
      }
    } else {
      map.set(candidate.resumeId, { ...candidate, sources: ["vector"] });
    }
  }

  return Array.from(map.values());
}
