import { env } from "../../../config/env";
import {
  RerankResultItem,
  SearchCandidate,
  SummarizeRequest
} from "../types/retrieval.types";

// ─── Groq raw-fetch helper ────────────────────────────────────────────────────

interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqChatResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

async function groqChat(
  messages: GroqChatMessage[],
  maxTokens = 1024
): Promise<string> {
  if (!env.groqApiKey) throw new Error("GROQ_NOT_CONFIGURED");

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.groqApiKey}`
      },
      body: JSON.stringify({
        model: env.groqModel,
        messages,
        max_tokens: maxTokens,
        temperature: 0.1
      })
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`GROQ_REQUEST_FAILED: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as GroqChatResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) throw new Error("GROQ_EMPTY_RESPONSE");

  return content;
}

// ─── JSON extraction helper ───────────────────────────────────────────────────

function extractJson<T>(raw: string): T {
  // Strip optional markdown code fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as T;
}

// ─── LLMService ───────────────────────────────────────────────────────────────

export class LLMService {
  /**
   * Re-ranks candidates using the Groq LLM.
   * Returns only the IDs supplied — hallucinated IDs are filtered out.
   */
  async rerankCandidates(
    query: string,
    candidates: SearchCandidate[],
    topK: number = env.rerankDefaultTopN
  ): Promise<RerankResultItem[]> {
    if (candidates.length === 0) return [];

    const allowedIds = new Set(candidates.map((c) => c.resumeId));

    const candidateList = candidates
      .slice(0, topK)
      .map(
        (c, i) =>
          `${i + 1}. resumeId: "${c.resumeId}"\n   snippet: "${c.snippet ?? ""}"`
      )
      .join("\n\n");

    const systemPrompt = `You are an expert recruiter assistant. Re-rank the provided resume candidates by relevance to the search query.
Return ONLY valid JSON — an array of objects with keys: resumeId, rank (1 = best), relevanceScore (0.0–1.0), reason (one sentence).
Do NOT invent candidates. Only rank the resumeIds given to you.`;

    const userPrompt = `Query: "${query}"

Candidates:
${candidateList}

Return JSON array of all candidates ranked by relevance.`;

    const raw = await groqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      1024
    );

    let parsed: RerankResultItem[];

    try {
      parsed = extractJson<RerankResultItem[]>(raw);
    } catch {
      throw new Error("RERANK_INVALID_JSON");
    }

    if (!Array.isArray(parsed)) throw new Error("RERANK_INVALID_SCHEMA");

    // Filter out hallucinated IDs and ensure required fields
    return parsed
      .filter(
        (item) =>
          typeof item.resumeId === "string" &&
          allowedIds.has(item.resumeId) &&
          typeof item.rank === "number" &&
          typeof item.relevanceScore === "number"
      )
      .sort((a, b) => a.rank - b.rank)
      .slice(0, topK);
  }

  /**
   * Generates an optional fit summary for a single candidate.
   */
  async summarizeCandidateFit(request: SummarizeRequest): Promise<string> {
    const { query, candidate, style = "short", maxTokens = 150 } = request;

    const systemPrompt = `You are a recruiter assistant. Write a concise candidate fit summary based ONLY on the provided snippet.
Style: ${style}. Do not invent facts. Maximum ~${maxTokens} tokens.`;

    const userPrompt = `Job requirement: "${query}"

Candidate snippet: "${candidate.snippet}"

Write a ${style} fit summary.`;

    return await groqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      maxTokens
    );
  }

  /**
   * Placeholder for query-time metadata extraction / normalization.
   * Ingestion metadata remains the authoritative stored source.
   */
  async extractMetadata(rawText: string): Promise<Record<string, unknown>> {
    const systemPrompt = `Extract structured metadata from resume text. Return JSON with keys: name, role, skills (array), totalExperience (number).`;

    const raw = await groqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText.slice(0, 2000) }
      ],
      512
    );

    try {
      return extractJson<Record<string, unknown>>(raw);
    } catch {
      return {};
    }
  }
}
