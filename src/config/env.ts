import dotenv from "dotenv";

dotenv.config();

const parsePositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  port: parsePositiveNumber(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME ?? "resume_rag",
  mistralApiKey: process.env.MISTRAL_API_KEY,
  mistralEmbedModel: process.env.MISTRAL_EMBED_MODEL ?? "mistral-embed",
  embeddingDimension: parsePositiveNumber(process.env.EMBEDDING_DIMENSION, 1024),
  useLlmParser: process.env.USE_LLM_PARSER === "true",
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
  webSearchApiKey: process.env.WEB_SEARCH_API_KEY,
  webSearchApiUrl: process.env.WEB_SEARCH_API_URL ?? "https://api.tavily.com/search",
  maxUploadSizeMb: parsePositiveNumber(process.env.MAX_UPLOAD_SIZE_MB, 5),
  retrievalDefaultTopK: parsePositiveNumber(process.env.RETRIEVAL_DEFAULT_TOP_K, 20),
  rerankDefaultTopN: parsePositiveNumber(process.env.RERANK_DEFAULT_TOP_N, 10),
  searchP95TargetMs: parsePositiveNumber(process.env.SEARCH_P95_TARGET_MS, 5000)
} as const;