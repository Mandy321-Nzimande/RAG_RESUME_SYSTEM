import { env } from "../../../config/env";
import { ParsedResume } from "../types/ingestion.types";

const isOptionalString = (value: unknown): value is string | undefined =>
	value === undefined || typeof value === "string";

const isValidParsedResume = (value: unknown): value is ParsedResume => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const resume = value as Record<string, unknown>;
	return Array.isArray(resume.skills) &&
		resume.skills.every((skill) => typeof skill === "string") &&
		isOptionalString(resume.name) &&
		isOptionalString(resume.email) &&
		isOptionalString(resume.phone) &&
		isOptionalString(resume.location) &&
		isOptionalString(resume.company) &&
		isOptionalString(resume.role) &&
		isOptionalString(resume.education) &&
		isOptionalString(resume.experienceSummary) &&
		(resume.totalExperience === undefined || typeof resume.totalExperience === "number") &&
		(resume.relevantExperience === undefined || typeof resume.relevantExperience === "number") &&
		(resume.jobTitles === undefined || (Array.isArray(resume.jobTitles) && resume.jobTitles.every((title) => typeof title === "string")));
};

export class LLMResumeParser {
	async parseResume(rawText: string): Promise<ParsedResume> {
		if (!env.groqApiKey) {
			throw new Error("LLM_PARSER_NOT_CONFIGURED");
		}

		const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.groqApiKey}`
			},
			body: JSON.stringify({
				model: env.groqModel,
				temperature: 0,
				response_format: { type: "json_object" },
				messages: [
					{
						role: "system",
						content: "Extract a resume into JSON. Use only evidence in the text. Omit unknown optional fields. Always include skills as an array of strings."
					},
					{
						role: "user",
						content: rawText
					}
				]
			})
		});

		if (!response.ok) {
			throw new Error("LLM_PARSER_REQUEST_FAILED");
		}

		const payload = await response.json() as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = payload.choices?.[0]?.message?.content;

		if (!content) {
			throw new Error("LLM_PARSER_INVALID_RESPONSE");
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(content);
		} catch {
			throw new Error("LLM_PARSER_INVALID_RESPONSE");
		}

		if (!isValidParsedResume(parsed)) {
			throw new Error("LLM_PARSER_INVALID_RESPONSE");
		}

		return parsed;
	}
}