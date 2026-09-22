import { env } from "../../../config/env";
import { EmbeddingService } from "./EmbeddingService";

describe("EmbeddingService", () => {
	const service = new EmbeddingService();
	const originalApiKey = env.mistralApiKey;
	const embedding = Array.from({ length: env.embeddingDimension }, (_, index) => index / 1000);

	afterEach(() => {
		jest.restoreAllMocks();
		Object.defineProperty(env, "mistralApiKey", {
			configurable: true,
			value: originalApiKey
		});
	});

	it("requires a Mistral API key", async () => {
		Object.defineProperty(env, "mistralApiKey", {
			configurable: true,
			value: undefined
		});

		await expect(service.generateResumeEmbedding({
			name: "Candidate",
			skills: ["Python"],
			rawText: "Candidate resume"
		})).rejects.toThrow("EMBEDDING_NOT_CONFIGURED");
	});

	it("sends structured resume context and accepts a configured 1024-dimensional vector", async () => {
		Object.defineProperty(env, "mistralApiKey", {
			configurable: true,
			value: "test-mistral-key"
		});
		const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
			data: [{ embedding }]
		}), { status: 200 }));

		await expect(service.generateResumeEmbedding({
			name: "Rajesh Mohan Kumar",
			role: "Test Architect",
			skills: ["Python", "RAG"],
			company: "Testleaf",
			experienceSummary: "13+ years of experience",
			rawText: "Resume source text"
		})).resolves.toHaveLength(1024);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.mistral.ai/v1/embeddings",
			expect.objectContaining({
			method: "POST",
			headers: expect.objectContaining({ Authorization: "Bearer test-mistral-key" }),
			body: expect.stringContaining("Rajesh Mohan Kumar")
		})
		);
	});

	it("rejects provider errors and invalid vector responses", async () => {
		Object.defineProperty(env, "mistralApiKey", {
			configurable: true,
			value: "test-mistral-key"
		});
		jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("provider error", { status: 500 }));
		await expect(service.generateResumeEmbedding({ skills: ["Python"], rawText: "Resume" }))
			.rejects.toThrow("EMBEDDING_REQUEST_FAILED");

		jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
			data: [{ embedding: ["not-a-number"] }]
		}), { status: 200 }));
		await expect(service.generateResumeEmbedding({ skills: ["Python"], rawText: "Resume" }))
			.rejects.toThrow("EMBEDDING_INVALID_RESPONSE");

		jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
			data: [{ embedding: [0.1] }]
		}), { status: 200 }));
		await expect(service.generateResumeEmbedding({ skills: ["Python"], rawText: "Resume" }))
			.rejects.toThrow("EMBEDDING_DIMENSION_MISMATCH");
	});
});
