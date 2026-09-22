export const SKILLS = [
  "Java",
  "Core Java",
  "Selenium",
  "Playwright",
  "API Testing",
  "Postman",
  "SQL",
  "MongoDB",
  "Jenkins",
  "Python",
  "C#",
  "REST Assured",
  "Cucumber",
  "GenAI",
  "Langchain",
  "Langgraph",
  "RAG",
  "Azure DevOps",
  "AWS Lambda",
  "GitHub",
  "DeepEval",
  "MCP (Model Context Protocol)"
] as const;

export const detectSkills = (rawText: string): string[] => {
  const normalizedText = rawText.toLowerCase();

  return SKILLS.filter((skill) => {
    const normalizedSkill = skill.toLowerCase();
    let startIndex = normalizedText.indexOf(normalizedSkill);

    while (startIndex >= 0) {
      const characterBefore = normalizedText[startIndex - 1];
      const characterAfter = normalizedText[startIndex + normalizedSkill.length];
      const startsAtBoundary = !characterBefore || !/[a-z0-9+#]/.test(characterBefore);
      const endsAtBoundary = !characterAfter || !/[a-z0-9+#]/.test(characterAfter);

      if (startsAtBoundary && endsAtBoundary) {
        return true;
      }

      startIndex = normalizedText.indexOf(normalizedSkill, startIndex + 1);
    }

    return false;
  });
};
