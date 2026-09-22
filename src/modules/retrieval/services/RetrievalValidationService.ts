import { Db } from "mongodb";

export interface RetrievalReadinessResult {
  ready: boolean;
  collection: string;
  resumeCount: number;
  resumesWithEmbedding: number;
  embeddingModel: string;
  embeddingDimension: number;
  message?: string;
}

export class RetrievalValidationService {
  public async validateReadiness(database: Db, collectionName: string, embeddingModel = "mistral-embed", embeddingDimension = 1024): Promise<RetrievalReadinessResult> {
    const collection = database.collection(collectionName);

    const [resumeCount, resumesWithEmbedding, sampleDocument] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ embedding: { $exists: true, $ne: [] } }),
      collection.find({ embedding: { $exists: true, $ne: [] } }).limit(1).toArray()
    ]);

    const firstEmbeddingDimension = sampleDocument[0]?.embeddingDimension ?? embeddingDimension;
    const ready = resumeCount > 0 && resumesWithEmbedding > 0 && firstEmbeddingDimension === embeddingDimension;

    return {
      ready,
      collection: collectionName,
      resumeCount,
      resumesWithEmbedding,
      embeddingModel,
      embeddingDimension: firstEmbeddingDimension,
      ...(ready ? {} : { message: "Retrieval is not ready. At least one ingested resume with embedding is required." })
    };
  }
}
