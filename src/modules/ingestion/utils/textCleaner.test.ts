import { cleanResumeText } from "./textCleaner";

describe("cleanResumeText", () => {
  it("normalizes raw resume text by removing duplicate spacing and blank lines", () => {
    const rawText = "Rajesh Mohan Kumar\n\n\nTest Architect & Senior Agentic Test Engineer   \n RAG";

    expect(cleanResumeText(rawText)).toBe(
      "Rajesh Mohan Kumar\nTest Architect & Senior Agentic Test Engineer\nRAG"
    );
  });

  it("keeps useful technical symbols such as C#, C++, and .NET intact", () => {
    const rawText = "C#   and C++\n.NET Core\n\nJavaScript";

    expect(cleanResumeText(rawText)).toBe("C# and C++\n.NET Core\nJavaScript");
  });

  it("returns an empty string when the input is not a valid string", () => {
    expect(cleanResumeText(undefined as unknown as string)).toBe("");
    expect(cleanResumeText(null as unknown as string)).toBe("");
  });
});
