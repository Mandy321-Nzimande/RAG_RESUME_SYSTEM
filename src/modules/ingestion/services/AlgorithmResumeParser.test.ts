import { AlgorithmResumeParser } from "./AlgorithmResumeParser";

describe("AlgorithmResumeParser", () => {
  it("extracts a structured resume from cleaned resume text", () => {
    const parser = new AlgorithmResumeParser();
    const rawText = [
      "Rajesh Mohan Kumar",
      "Test Architect & Senior Agentic Test Engineer",
      "Testleaf Software Solutions Private Limited",
      "B.Tech - Information Technology",
      "13+ years of experience",
      "Skills: Selenium WebDriver, Core Java, C#, Python, REST Assured, Postman, RAG, DeepEval, MCP (Model Context Protocol)"
    ].join("\n");

    const result = parser.parseResume(rawText);

    expect(result.name).toBe("Rajesh Mohan Kumar");
    expect(result.role).toBe("Test Architect & Senior Agentic Test Engineer");
    expect(result.company).toContain("Testleaf");
    expect(result.education).toContain("B.Tech");
    expect(result.totalExperience).toBe(13);
    expect(result.skills).toEqual(
      expect.arrayContaining([
        "Selenium",
        "Core Java",
        "C#",
        "Python",
        "REST Assured",
        "Postman",
        "RAG",
        "DeepEval",
        "MCP (Model Context Protocol)"
      ])
    );
  });
});
