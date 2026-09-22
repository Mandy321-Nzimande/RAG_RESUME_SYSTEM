import { deduplicateCandidates } from "./deduplicate";
import { SearchCandidate } from "../types/retrieval.types";

const candidate = (resumeId: string, rawText: string): SearchCandidate => ({
  resumeId,
  rawText,
  name: "Candidate",
  sources: ["vector"],
  vectorScore: 0.8
});

describe("deduplicateCandidates", () => {
  it("keeps one result for duplicate CV content with different IDs", () => {
    const result = deduplicateCandidates(
      [candidate("one", "Name\nPython Developer")],
      [candidate("two", "name python developer")]
    );

    expect(result).toHaveLength(1);
  });

  it("keeps distinct CVs", () => {
    const result = deduplicateCandidates(
      [candidate("one", "Python Developer")],
      [candidate("two", "Java Developer")]
    );

    expect(result).toHaveLength(2);
  });
});