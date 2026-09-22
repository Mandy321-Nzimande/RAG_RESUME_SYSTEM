import { Router } from "express";
import { agentChat, filterCandidates } from "../controllers/agentController";

export const agentRoutes = Router();
agentRoutes.post("/agent/chat", agentChat);
agentRoutes.post("/agent/filter-candidates", filterCandidates);