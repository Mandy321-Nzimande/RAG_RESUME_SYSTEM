import { StoredResumeDocument } from "../repositories/ResumeRepository";
import { SearchCandidate } from "../types/retrieval.types";

const SNIPPET_MAX_CHARS = 600;

/**
 * Builds a snippet for LLM re-ranking from a stored resume.
 * Snippet is size-controlled to avoid bloating LLM prompts.
 */
function buildSnippet(doc: StoredResumeDocument): string {
  const parts = [
    doc.name,
    doc.role,
    doc.company,
    doc.skills?.join(", "),
    doc.experienceSummary,
    doc.totalExperience !== undefined
      ? `${doc.totalExperience} years experience`
      : undefined
  ]
    .filter(Boolean)
    .join(" | ");

  return parts.length > SNIPPET_MAX_CHARS
    ? parts.slice(0, SNIPPET_MAX_CHARS) + "…"
    : parts;
}

/**
 * Maps a BM25 query result to the normalised SearchCandidate shape.
 */
export function mapBm25Result(
  doc: StoredResumeDocument,
  score: number
): SearchCandidate {
  return {
    resumeId: doc._id.toHexString(),
    name: doc.name,
    role: doc.role,
    company: doc.company,
    skills: doc.skills,
    snippet: buildSnippet(doc),
    rawText: doc.rawText,
    email: doc.email,
    location: doc.location,
    education: doc.education,
    certification: doc.certification,
    totalExperience: doc.totalExperience,
    bm25Score: score,
    sources: ["bm25"]
  };
}

/**
 * Maps a vector search result to the normalised SearchCandidate shape.
 */
export function mapVectorResult(
  doc: StoredResumeDocument,
  score: number
): SearchCandidate {
  return {
    resumeId: doc._id.toHexString(),
    name: doc.name,
    role: doc.role,
    company: doc.company,
    skills: doc.skills,
    snippet: buildSnippet(doc),
    rawText: doc.rawText,
    email: doc.email,
    location: doc.location,
    education: doc.education,
    certification: doc.certification,
    totalExperience: doc.totalExperience,
    vectorScore: score,
    sources: ["vector"]
  };
}
