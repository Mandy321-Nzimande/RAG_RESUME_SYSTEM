import { RetrievalValidationService } from "./RetrievalValidationService";

describe("RetrievalValidationService", () => {
  it("returns ready when resumes exist with valid embeddings", async () => {
    const collection = {
      countDocuments: jest.fn(async (query = {}) => {
        if (query && Object.keys(query).length === 0) {
          return 1;
        }

        if (query.embedding) {
          return 1;
        }

        return 0;
      }),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [{ embeddingDimension: 1024 }]
        })
      }))
    };

    const service = new RetrievalValidationService();
    const result = await service.validateReadiness({ collection: () => collection } as any, "resumes");

    expect(result.ready).toBe(true);
    expect(result.resumeCount).toBe(1);
    expect(result.resumesWithEmbedding).toBe(1);
    expect(result.embeddingDimension).toBe(1024);
    expect(result.collection).toBe("resumes");
  });

  it("returns not ready when embeddings are missing", async () => {
    const collection = {
      countDocuments: jest.fn(async () => 0),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => []
        })
      }))
    };

    const service = new RetrievalValidationService();
    const result = await service.validateReadiness({ collection: () => collection } as any, "resumes");

    expect(result.ready).toBe(false);
    expect(result.resumeCount).toBe(0);
    expect(result.resumesWithEmbedding).toBe(0);
    expect(result.message).toContain("Retrieval is not ready");
  });
});
