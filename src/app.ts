import cors from "cors";
import express from "express";
import { requestId } from "./middleware/requestId";
import { logger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import { pingDatabase } from "./config/database";
import { ingestionRoutes } from "./modules/ingestion/routes/ingestionRoutes";
import { retrievalRoutes } from "./modules/retrieval/routes/retrievalRoutes";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(requestId);
app.use(logger);

app.get("/v1/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    app: "resume-rag-backend",
    version: "1.0.0",
    uptime: Number(process.uptime().toFixed(1))
  });
});

app.get("/v1/health/db", async (_request, response) => {
  try {
    const latencyMs = await pingDatabase();

    response.status(200).json({
      status: "ok",
      database: "mongodb",
      connected: true,
      latencyMs
    });
  } catch {
    response.status(503).json({
      status: "error",
      database: "mongodb",
      connected: false,
      errorCode: "DB_CONNECTION_FAILED"
    });
  }
});

app.use("/v1", ingestionRoutes);
app.use("/v1", retrievalRoutes);

app.use(errorHandler);