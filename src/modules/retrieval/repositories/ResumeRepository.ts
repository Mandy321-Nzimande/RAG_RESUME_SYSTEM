import { Db, ObjectId } from "mongodb";
import { SearchFilters } from "../types/retrieval.types";

const COLLECTION = "resumes";

export interface StoredResumeDocument {
  _id: ObjectId;
  rawText: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  company?: string;
  role?: string;
  education?: string;
  totalExperience?: number;
  relevantExperience?: number;
  skills: string[];
  jobTitles?: string[];
  experienceSummary?: string;
  certification?: string;
  embedding: number[];
  embeddingModel: string;
  embeddingDimension: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ResumeRepository {
  constructor(private readonly db: Db) {}

  // ─── Basic fetch ────────────────────────────────────────────────────────────

  async findById(id: string): Promise<StoredResumeDocument | null> {
    try {
      const oid = new ObjectId(id);
      return await this.db
        .collection<StoredResumeDocument>(COLLECTION)
        .findOne({ _id: oid });
    } catch {
      return null;
    }
  }

  async findByIds(ids: string[]): Promise<StoredResumeDocument[]> {
    const oids = ids
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((oid): oid is ObjectId => oid !== null);

    if (oids.length === 0) return [];

    return await this.db
      .collection<StoredResumeDocument>(COLLECTION)
      .find({ _id: { $in: oids } })
      .toArray();
  }

  async filterCandidates(
    filters: SearchFilters = {},
    limit = 20
  ): Promise<StoredResumeDocument[]> {
    return await this.db
      .collection<StoredResumeDocument>(COLLECTION)
      .find(buildMongoFilter(filters))
      .limit(limit)
      .toArray();
  }

  // ─── BM25 / Atlas Search ────────────────────────────────────────────────────

  /**
   * Full-text BM25 search using MongoDB Atlas Search.
   * Falls back to a regex scan when Atlas Search is unavailable.
   */
  async bm25Search(
    query: string,
    filters: SearchFilters = {},
    topK = 20
  ): Promise<Array<{ doc: StoredResumeDocument; score: number }>> {
    const pipeline: object[] = [
      {
        $search: {
          index: "bm25-resume",
          text: {
            query,
            path: [
              "rawText",
              "skills",
              "jobTitles",
              "experienceSummary",
              "role",
              "company"
            ]
          }
        }
      },
      { $addFields: { score: { $meta: "searchScore" } } }
    ];

    const mongoFilter = buildMongoFilter(filters);
    if (Object.keys(mongoFilter).length > 0) pipeline.push({ $match: mongoFilter });

    pipeline.push({ $limit: topK });

    const docs = await this.db
      .collection<StoredResumeDocument & { score: number }>(COLLECTION)
      .aggregate<StoredResumeDocument & { score: number }>(pipeline)
      .toArray();

    return docs.map((d) => ({ doc: d, score: d.score ?? 0 }));
  }

  // ─── Vector / Atlas Vector Search ───────────────────────────────────────────

  /**
   * Approximate nearest-neighbour search using MongoDB Atlas Vector Search.
   * Requires a vector index named "vector_index" on the `embedding` field
   * (dimensions: 1024, similarity: cosine).
   */
  async vectorSearch(
    queryVector: number[],
    filters: SearchFilters = {},
    topK = 20
  ): Promise<Array<{ doc: StoredResumeDocument; score: number }>> {
    const vectorSearchStage: Record<string, unknown> = {
      $vectorSearch: {
        index: "resume_vector_index",
        path: "embedding",
        queryVector,
        numCandidates: topK * 10,
        limit: topK
      }
    };

    const vectorFilter = buildVectorFilter(filters);
    if (Object.keys(vectorFilter).length > 0) {
      (vectorSearchStage["$vectorSearch"] as Record<string, unknown>)["filter"] = {
        ...vectorFilter
      };
    }

    const docs = await this.db
      .collection<StoredResumeDocument>(COLLECTION)
      .aggregate<StoredResumeDocument & { vectorScore: number }>([
        vectorSearchStage,
        { $addFields: { vectorScore: { $meta: "vectorSearchScore" } } }
      ])
      .toArray();

    return docs.map((d) => ({ doc: d, score: d.vectorScore ?? 0 }));
  }
}

function buildMongoFilter(filters: SearchFilters): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (filters.minYearsExperience !== undefined) {
    filter.totalExperience = { $gte: filters.minYearsExperience };
  }

  if (filters.resumeIds?.length) {
    filter._id = {
      $in: filters.resumeIds.flatMap((id) => {
        try {
          return [new ObjectId(id)];
        } catch {
          return [];
        }
      })
    };
  }

  for (const [field, criteria] of Object.entries(filters.hardConstraints ?? {})) {
    const mappedField = field === "experience_years" ? "totalExperience" : field;
    if (mappedField === "certification") {
      const expected = criteria.$eq;
      if (typeof expected === "string") filter.rawText = { $regex: expected, $options: "i" };
    } else if (mappedField === "location" || mappedField === "education" || mappedField === "totalExperience") {
      filter[mappedField] = criteria;
    }
  }
  return filter;
}

function buildVectorFilter(filters: SearchFilters): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (filters.minYearsExperience !== undefined) {
    filter.totalExperience = { $gte: filters.minYearsExperience };
  }

  const experienceCriteria = filters.hardConstraints?.experience_years;
  if (experienceCriteria) filter.totalExperience = experienceCriteria;

  if (filters.resumeIds?.length) {
    filter._id = {
      $in: filters.resumeIds.flatMap((id) => {
        try {
          return [new ObjectId(id)];
        } catch {
          return [];
        }
      })
    };
  }
  return filter;
}
