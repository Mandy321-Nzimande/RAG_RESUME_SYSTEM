import { detectSkills } from "./skills";

describe("detectSkills", () => {
  it("detects multiple resume skills from a realistic text sample", () => {
    const rawText = "Experienced in Selenium WebDriver, Python, RAG, DeepEval and MCP (Model Context Protocol).";

    expect(detectSkills(rawText)).toEqual([
      "Selenium",
      "Python",
      "RAG",
      "DeepEval",
      "MCP (Model Context Protocol)"
    ]);
  });
});
