import { SearchCandidate } from "../types/retrieval.types";

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

function candidateKey(candidate: SearchCandidate): string {
  // Exact CV content is the safest duplicate signal across separate Mongo IDs.
  if (candidate.rawText?.trim()) return `text:${normalize(candidate.rawText)}`;
  if (candidate.email?.trim()) return `email:${normalize(candidate.email)}`;

  const identity = [candidate.name, candidate.company, candidate.role]
    .filter(Boolean)
    .map((value) => normalize(value as string))
    .join("|");
  return identity ? `identity:${identity}` : `resume:${candidate.resumeId}`;
}

function mergeCandidates(existing: SearchCandidate, candidate: SearchCandidate): SearchCandidate {
  const merged: SearchCandidate = {
    ...existing,
    bm25Score: Math.max(existing.bm25Score ?? 0, candidate.bm25Score ?? 0) || undefined,
    vectorScore: Math.max(existing.vectorScore ?? 0, candidate.vectorScore ?? 0) || undefined,
    sources: Array.from(new Set([...existing.sources, ...candidate.sources]))
  };

  if (!merged.snippet && candidate.snippet) merged.snippet = candidate.snippet;
  if (!merged.rawText && candidate.rawText) merged.rawText = candidate.rawText;
  if (!merged.email && candidate.email) merged.email = candidate.email;
  return merged;
}

/**
 * Merges BM25 and vector results while guaranteeing one result per unique CV.
 * Duplicate uploads with different Mongo IDs are collapsed by normalized text.
 */
export function deduplicateCandidates(
  bm25Candidates: SearchCandidate[],
  vectorCandidates: SearchCandidate[]
): SearchCandidate[] {
  const map = new Map<string, SearchCandidate>();

  for (const candidate of [...bm25Candidates, ...vectorCandidates]) {
    const key = candidateKey(candidate);
    const existing = map.get(key);
    map.set(key, existing ? mergeCandidates(existing, candidate) : { ...candidate });
  }

  return Array.from(map.values());
}
