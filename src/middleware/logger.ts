import { RequestHandler } from "express";

interface IngestionLogData {
  fileName?: string;
  extractMs?: number;
  cleanMs?: number;
  parseMs?: number;
  embeddingMs?: number;
  mongoInsertMs?: number;
  totalMs?: number;
}

export const logger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const logData: IngestionLogData | undefined = response.locals.ingestionLog;
    const entry: Record<string, unknown> = {
      requestId: response.locals.requestId,
      method: request.method,
      endpoint: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    };

    if (logData) {
      Object.assign(entry, logData);
    }

    console.log(JSON.stringify(entry));
  });

  next();
};