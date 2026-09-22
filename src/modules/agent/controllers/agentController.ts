import { RequestHandler } from "express";
import { AgentService } from "../services/AgentService";

const agentService = new AgentService();

export const agentChat: RequestHandler = async (request, response) => {
  const body = request.body as {
    message?: unknown;
    topK?: unknown;
    filters?: { minYearsExperience?: unknown };
  };
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_AGENT_MESSAGE",
      message: "message is required and must be a non-empty string"
    });
    return;
  }
  if (message.length > 1000) {
    response.status(400).json({ success: false, errorCode: "MESSAGE_TOO_LONG", message: "message must not exceed 1000 characters" });
    return;
  }

  const rawTopK = body.topK;
  const topK = rawTopK === undefined ? 10 : typeof rawTopK === "number" && Number.isFinite(rawTopK) && rawTopK > 0 ? Math.min(Math.floor(rawTopK), 20) : null;
  if (topK === null) {
    response.status(400).json({ success: false, errorCode: "INVALID_TOP_K", message: "topK must be a positive integer no greater than 20" });
    return;
  }

  const filters: { minYearsExperience?: number } = {};
  if (body.filters?.minYearsExperience !== undefined) {
    if (typeof body.filters.minYearsExperience !== "number" || body.filters.minYearsExperience < 0) {
      response.status(400).json({ success: false, errorCode: "INVALID_FILTER", message: "filters.minYearsExperience must be non-negative" });
      return;
    }
    filters.minYearsExperience = body.filters.minYearsExperience;
  }
  try {
    response.status(200).json(await agentService.chat(message, filters, topK));
  } catch (error) {
    response.status(503).json({ success: false, errorCode: "AGENT_UNAVAILABLE", message: error instanceof Error ? error.message : "Agent unavailable" });
  }
};