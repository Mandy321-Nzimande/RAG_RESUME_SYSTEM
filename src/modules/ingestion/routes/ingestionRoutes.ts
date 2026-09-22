import { Router } from "express";
import { cleanResumeTextController, detectResumeSkills, embedResume, extractResumeText, ingestResume, parseResume, parseResumeWithLlmEndpoint, storeResume, uploadResume as uploadResumeController, getIngestionHealth, getResumeById } from "../controllers/ingestionController";
import { uploadResume } from "../../../config/multerConfig";

export const ingestionRoutes = Router();

ingestionRoutes.get("/resume/health", getIngestionHealth);
ingestionRoutes.post("/resume/upload", uploadResume.single("file"), uploadResumeController);
ingestionRoutes.post("/resume/extract", uploadResume.single("file"), extractResumeText);
ingestionRoutes.post("/resume/clean", cleanResumeTextController);
ingestionRoutes.post("/resume/skills", detectResumeSkills);
ingestionRoutes.post("/resume/parse", parseResume);
ingestionRoutes.post("/resume/llm-parse", parseResumeWithLlmEndpoint);
ingestionRoutes.post("/resume/embed", embedResume);
ingestionRoutes.post("/resume/store", storeResume);
ingestionRoutes.post("/resume/ingest", uploadResume.single("file"), ingestResume);
ingestionRoutes.post("/resume/inject", uploadResume.single("resume"), ingestResume);
ingestionRoutes.get("/resume/:id", getResumeById);