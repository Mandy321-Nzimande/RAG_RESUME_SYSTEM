import { env } from "../../../config/env";

export interface ResumeEmbeddingInput {
	name?: string;
	role?: string;
	skills: string[];
	company?: string;
	experienceSummary?: string;
	rawText: string;
}

interface MistralEmbeddingResponse {
	data?: Array<{ embedding?: unknown }>;
}

export class EmbeddingService {
	async generateResumeEmbedding(input: ResumeEmbeddingInput): Promise<number[]> {
		if (!env.mistralApiKey) {
			throw new Error("EMBEDDING_NOT_CONFIGURED");
		}

		const embeddingText = [
			input.name,
			input.role,
			input.skills.join(", "),
			input.company,
			input.experienceSummary,
			input.rawText
		].filter(Boolean).join("\n");

		const response = await fetch("https://api.mistral.ai/v1/embeddings", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.mistralApiKey}`
			},
			body: JSON.stringify({
				model: env.mistralEmbedModel,
				input: [embeddingText]
			})
		});

		if (!response.ok) {
			throw new Error("EMBEDDING_REQUEST_FAILED");
		}

		const payload = await response.json() as MistralEmbeddingResponse;
		const embedding = payload.data?.[0]?.embedding;

		if (!Array.isArray(embedding) || !embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
			throw new Error("EMBEDDING_INVALID_RESPONSE");
		}

		if (embedding.length !== env.embeddingDimension) {
			throw new Error("EMBEDDING_DIMENSION_MISMATCH");
		}

		return embedding;
	}
}