import { env } from "../../../config/env";
import { getDatabase } from "../../../config/database";
import { SearchService } from "../../retrieval/services/SearchService";
import { LLMService } from "../../retrieval/services/LLMService";
import { RankedResult, SearchFilters } from "../../retrieval/types/retrieval.types";
import { parseRecruiterQuery, ParsedQuery } from "./QueryParser";

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

export interface AgentChatResult {
  answer: string;
  candidates: RankedResult[];
  parsed_query: ParsedQuery;
  tools_used: string[];
  sources: WebSource[];
  degraded: boolean;
  warnings: string[];
}

interface TavilyResponse {
  results?: Array<{ title?: unknown; url?: unknown; content?: unknown }>;
}

const CANDIDATE_TERMS = /candidate|resume|cv|hire|developer|engineer|analyst|designer|manager|applicant|talent/i;
const llmService = new LLMService();

async function webSearch(query: string): Promise<WebSource[]> {
  if (!env.webSearchApiKey) throw new Error("WEB_SEARCH_NOT_CONFIGURED");

  const response = await fetch(env.webSearchApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.webSearchApiKey,
      query,
      max_results: 5,
      search_depth: "basic",
      include_answer: false
    })
  });

  if (!response.ok) throw new Error(`WEB_SEARCH_FAILED: ${response.status}`);
  const payload = (await response.json()) as TavilyResponse;

  return (payload.results ?? []).flatMap((item) => {
    if (typeof item.title !== "string" || typeof item.url !== "string") return [];
    return [{
      title: item.title,
      url: item.url,
      snippet: typeof item.content === "string" ? item.content.slice(0, 400) : ""
    }];
  });
}

function candidateAnswer(query: string, candidates: RankedResult[]): string {
  if (candidates.length === 0) return `No matching candidate was retrieved for "${query}".`;
  return `I found ${candidates.length} candidate${candidates.length === 1 ? "" : "s"} matching "${query}". Candidate details below are based only on the retrieved resumes.`;
}

export class AgentService {
  async chat(query: string, filters: SearchFilters = {}, topK = 10): Promise<AgentChatResult> {
    const parsed_query = parseRecruiterQuery(query);
    const experienceConstraint = parsed_query.hard_constraints.experience_years;
    const parsedMinYears = experienceConstraint?.$gte;
    const effectiveFilters: SearchFilters = {
      ...filters,
      hardConstraints: parsed_query.has_hard_constraints ? parsed_query.hard_constraints : undefined,
      ...(typeof parsedMinYears === "number" ? { minYearsExperience: parsedMinYears } : {})
    };
    const searchService = new SearchService(getDatabase());
    const tools_used: string[] = [];

    if (parsed_query.has_hard_constraints) {
      const exactCandidates = await searchService.filterCandidates(
        { hardConstraints: parsed_query.hard_constraints },
        100
      );
      tools_used.push("filter_candidates");

      if (exactCandidates.length === 0) {
        return {
          answer: `No candidates matched the stated criteria for "${query}".`,
          candidates: [],
          parsed_query,
          tools_used,
          sources: [],
          degraded: false,
          warnings: []
        };
      }

      effectiveFilters.resumeIds = exactCandidates.map((candidate) => candidate.resumeId);
    }

    const search = await searchService.endToEndSearch(parsed_query.semantic_query || query, effectiveFilters, {
      finalTopK: Math.min(Math.max(Math.floor(topK), 1), 20),
      rerankTopN: Math.min(Math.max(Math.floor(topK) * 2, 10), 50),
      bm25TopK: 20,
      vectorTopK: 20,
      summarize: false
    });

    tools_used.push("search_candidates");
    const warnings = [...search.warnings];
    const candidateSearch = CANDIDATE_TERMS.test(query);
    let verifiedCandidates = search.results;
    if (verifiedCandidates.length > 0) {
      try {
        const verifiedIds = await llmService.verifyCandidateResults(
          query,
          parsed_query.hard_constraints,
          verifiedCandidates
        );
        verifiedCandidates = verifiedCandidates.filter((candidate) => verifiedIds.includes(candidate.resumeId));
      } catch {
        warnings.push("GROUNDED_VERIFICATION_FAILED");
      }
    }

    const needsExternalContext = !candidateSearch || verifiedCandidates.length === 0;
    let sources: WebSource[] = [];
    let answer = candidateAnswer(query, verifiedCandidates);

    if (needsExternalContext && env.webSearchApiKey) {
      try {
        sources = await webSearch(query);
        tools_used.push("web_search");
        if (!candidateSearch && sources.length > 0) {
          answer = `I found ${sources.length} external source${sources.length === 1 ? "" : "s"} with context for "${query}".`;
        } else if (verifiedCandidates.length === 0) {
          answer += " I also searched external sources for additional context.";
        }
      } catch {
        warnings.push("WEB_SEARCH_FAILED");
      }
    }

    if (needsExternalContext && !env.webSearchApiKey) warnings.push("WEB_SEARCH_NOT_CONFIGURED");

    return {
      answer,
      candidates: verifiedCandidates,
      parsed_query,
      tools_used,
      sources,
      degraded: search.degraded || warnings.includes("WEB_SEARCH_FAILED"),
      warnings: [...new Set(warnings)]
    };
  }
}