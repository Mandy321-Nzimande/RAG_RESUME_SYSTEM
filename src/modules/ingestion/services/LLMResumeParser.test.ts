import { env } from "../../../config/env";
import { LLMResumeParser } from "./LLMResumeParser";

describe("LLMResumeParser", () => {
	const parser = new LLMResumeParser();
	const originalApiKey = env.groqApiKey;

	afterEach(() => {
		jest.restoreAllMocks();
		Object.defineProperty(env, "groqApiKey", {
			configurable: true,
			value: originalApiKey
		});
	});

	it("does not require an LLM key when the parser is not configured", async () => {
		Object.defineProperty(env, "groqApiKey", {
			configurable: true,
			value: undefined
		});

		await expect(parser.parseResume("Candidate resume text")).rejects.toThrow("LLM_PARSER_NOT_CONFIGURED");
	});

	it("accepts a schema-valid provider response", async () => {
		Object.defineProperty(env, "groqApiKey", {
			configurable: true,
			value: "test-key"
		});
		jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						name: "Rajesh Mohan Kumar",
						role: "Test Architect",
						skills: ["Python", "RAG"]
					})
				}
			}]
		}), { status: 200 }));

		await expect(parser.parseResume("Rajesh Mohan Kumar\nTest Architect\nPython\nRAG")).resolves.toEqual({
			name: "Rajesh Mohan Kumar",
			role: "Test Architect",
			skills: ["Python", "RAG"]
		});
	});

	it("rejects provider output that does not include a string skills array", async () => {
		Object.defineProperty(env, "groqApiKey", {
			configurable: true,
			value: "test-key"
		});
		jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
			choices: [{ message: { content: JSON.stringify({ name: "Candidate", skills: ["Python", 7] }) } }]
		}), { status: 200 }));

		await expect(parser.parseResume("Candidate resume text")).rejects.toThrow("LLM_PARSER_INVALID_RESPONSE");
	});
});
