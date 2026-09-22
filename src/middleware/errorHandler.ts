import { ErrorRequestHandler } from "express";
import multer from "multer";

const errorResponse = (requestId: string, errorCode: string, message: string) => ({
  success: false,
  requestId,
  errorCode,
  message
});

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const requestId = response.locals.requestId;
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  console.error(JSON.stringify({
    requestId,
    method: request.method,
    endpoint: request.originalUrl,
    error: errorMessage
  }));

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({
        ...errorResponse(requestId, "FILE_TOO_LARGE", "Resume exceeds maximum upload size")
      });
      return;
    }
  }

  if (errorMessage === "INVALID_FILE_TYPE") {
    response.status(415).json(errorResponse(requestId, "INVALID_FILE_TYPE", "Only PDF files are allowed"));
    return;
  }

  if (errorMessage === "RESUME_EXTRACTION_FAILED") {
    response.status(422).json(errorResponse(requestId, "RESUME_EXTRACTION_FAILED", "Resume extraction failed"));
    return;
  }

  if (errorMessage.startsWith("LLM_PARSER_") || errorMessage === "RESUME_PARSE_FAILED") {
    response.status(422).json(errorResponse(requestId, "RESUME_PARSE_FAILED", "Resume parsing failed"));
    return;
  }

  if (errorMessage.startsWith("EMBEDDING_")) {
    response.status(502).json(errorResponse(requestId, "EMBEDDING_FAILED", "Mistral embedding failed"));
    return;
  }

  if (errorMessage === "MONGODB_URI is not configured" || errorMessage.startsWith("MongoDB") || errorMessage === "RESUME_STORAGE_FAILED") {
    response.status(503).json(errorResponse(requestId, "INGESTION_FAILED", "Resume ingestion failed"));
    return;
  }

  response.status(500).json(errorResponse(requestId, "INGESTION_FAILED", "Resume ingestion failed"));
};