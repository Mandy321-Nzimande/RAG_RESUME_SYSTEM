import { Router } from "express";
import { agentChat } from "../controllers/agentController";

export const agentRoutes = Router();
agentRoutes.post("/agent/chat", agentChat);