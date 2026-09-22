import { RequestHandler } from "express";
import { unlink } from "node:fs/promises";
import { ResumeParserService } from "../services/ResumeParserService";
import { cleanResumeText } from "../utils/textCleaner";
import { detectSkills } from "../../../config/skills";
import { AlgorithmResumeParser } from "../services/AlgorithmResumeParser";
import { LLMResumeParser } from "../services/LLMResumeParser";
import { env } from "../../../config/env";
import { EmbeddingService } from "../services/EmbeddingService";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { ResumeIngestionService } from "../services/ResumeIngestionService";

const resumeParserService = new ResumeParserService();
const algorithmResumeParser = new AlgorithmResumeParser();
const llmResumeParser = new LLMResumeParser();
const embeddingService = new EmbeddingService();
const resumeIngestionRepository = new ResumeIngestionRepository();
const resumeIngestionService = new ResumeIngestionService();

export const getIngestionHealth: RequestHandler = (_request, response) => {
  response.status(200).json({
    status: "ok",
    module: "resume-ingestion"
  });
};

export const uploadResume: RequestHandler = (request, response) => {
  if (!request.file) {
    response.status(400).json({
      success: false,
      errorCode: "MISSING_FILE",
      message: "A PDF resume file is required"
    });
    return;
  }

  response.status(200).json({
    success: true,
    message: "Resume uploaded successfully",
    file: {
      originalName: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size
    }
  });
};

export const extractResumeText: RequestHandler = async (request, response, next) => {
  if (!request.file) {
    response.status(400).json({
      success: false,
      errorCode: "MISSING_FILE",
      message: "A PDF resume file is required"
    });
    return;
  }

  try {
    const rawText = await resumeParserService.extractTextFromPdf(request.file.path);

    response.status(200).json({
      success: true,
      rawText,
      characters: rawText.length
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RESUME_EXTRACTION_FAILED") {
      next(error);
      return;
    }

    next(new Error("RESUME_EXTRACTION_FAILED"));
  } finally {
    await unlink(request.file.path).catch(() => undefined);
  }
};

export const cleanResumeTextController: RequestHandler = (request, response) => {
  if (typeof request.body?.rawText !== "string" || !request.body.rawText.trim()) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_RAW_TEXT",
      message: "rawText must be a non-empty string"
    });
    return;
  }

  const cleanText = cleanResumeText(request.body.rawText);

  response.status(200).json({
    success: true,
    cleanText
  });
};

export const detectResumeSkills: RequestHandler = (request, response) => {
  if (typeof request.body?.rawText !== "string" || !request.body.rawText.trim()) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_RAW_TEXT",
      message: "rawText must be a non-empty string"
    });
    return;
  }

  response.status(200).json({
    success: true,
    skills: detectSkills(request.body.rawText)
  });
};

export const parseResume: RequestHandler = async (request, response) => {
  if (typeof request.body?.rawText !== "string" || !request.body.rawText.trim()) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_RAW_TEXT",
      message: "rawText must be a non-empty string"
    });
    return;
  }

  if (env.useLlmParser) {
    await parseResumeWithLlm(request.body.rawText, response);
    return;
  }

  response.status(200).json({
    success: true,
    resume: algorithmResumeParser.parseResume(request.body.rawText),
    parser: "algorithm"
  });
};

const parseResumeWithLlm = async (rawText: string, response: Parameters<RequestHandler>[1]): Promise<void> => {
  try {
    response.status(200).json({
      success: true,
      resume: await llmResumeParser.parseResume(rawText),
      parser: "llm"
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LLM_PARSER_NOT_CONFIGURED") {
      response.status(503).json({
        success: false,
        errorCode: "LLM_PARSER_NOT_CONFIGURED",
        message: "LLM resume parser is not configured"
      });
      return;
    }

    response.status(502).json({
      success: false,
      errorCode: error instanceof Error ? error.message : "LLM_PARSER_REQUEST_FAILED",
      message: "LLM resume parsing failed"
    });
  }
};

export const parseResumeWithLlmEndpoint: RequestHandler = async (request, response) => {
  if (typeof request.body?.rawText !== "string" || !request.body.rawText.trim()) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_RAW_TEXT",
      message: "rawText must be a non-empty string"
    });
    return;
  }

  if (!env.useLlmParser) {
    response.status(503).json({
      success: false,
      errorCode: "LLM_PARSER_DISABLED",
      message: "LLM resume parser is disabled"
    });
    return;
  }

  try {
    response.status(200).json({
      success: true,
      resume: await llmResumeParser.parseResume(request.body.rawText),
      parser: "llm"
    });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "LLM_PARSER_REQUEST_FAILED";
    response.status(502).json({
      success: false,
      errorCode,
      message: "LLM resume parsing failed"
    });
  }
};

export const embedResume: RequestHandler = async (request, response) => {
  const body = request.body;

  if (typeof body?.rawText !== "string" || !body.rawText.trim() ||
      !Array.isArray(body.skills) || body.skills.some((skill: unknown) => typeof skill !== "string")) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_EMBEDDING_INPUT",
      message: "rawText and skills are required"
    });
    return;
  }

  try {
    const embedding = await embeddingService.generateResumeEmbedding({
      name: typeof body.name === "string" ? body.name : undefined,
      role: typeof body.role === "string" ? body.role : undefined,
      skills: body.skills,
      company: typeof body.company === "string" ? body.company : undefined,
      experienceSummary: typeof body.experienceSummary === "string" ? body.experienceSummary : undefined,
      rawText: body.rawText
    });

    response.status(200).json({
      success: true,
      model: env.mistralEmbedModel,
      dimension: embedding.length,
      embedding
    });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "EMBEDDING_REQUEST_FAILED";
    const statusCode = errorCode === "EMBEDDING_NOT_CONFIGURED" ? 503 : 502;

    response.status(statusCode).json({
      success: false,
      errorCode,
      message: "Resume embedding failed"
    });
  }
};

export const storeResume: RequestHandler = async (request, response) => {
  const body = request.body;
  const resume = body?.resume;

  if (typeof body?.fileName !== "string" || !body.fileName.trim() ||
      typeof body.rawText !== "string" || !body.rawText.trim() ||
      !resume || typeof resume !== "object" ||
      !Array.isArray(resume.skills) || resume.skills.some((skill: unknown) => typeof skill !== "string") ||
      !Array.isArray(body.embedding) ||
      body.embedding.some((value: unknown) => typeof value !== "number" || !Number.isFinite(value)) ||
      body.embedding.length !== env.embeddingDimension) {
    response.status(400).json({
      success: false,
      errorCode: "INVALID_STORAGE_INPUT",
      message: "fileName, resume, rawText, and a valid embedding are required"
    });
    return;
  }

  const now = new Date();
  const storedResume = {
    ...resume,
    fileName: body.fileName,
    rawText: body.rawText,
    embedding: body.embedding,
    embeddingModel: env.mistralEmbedModel,
    embeddingDimension: body.embedding.length,
    createdAt: now,
    updatedAt: now
  };

  try {
    const resumeId = await resumeIngestionRepository.insertResume(storedResume);

    response.status(201).json({
      success: true,
      message: "Resume stored successfully",
      resumeId
    });
  } catch {
    response.status(503).json({
      success: false,
      requestId: response.locals.requestId,
      errorCode: "RESUME_STORAGE_FAILED",
      message: "Resume storage failed"
    });
  }
};

export const ingestResume: RequestHandler = async (request, response, next) => {
  if (!request.file) {
    response.status(400).json({
      success: false,
      errorCode: "FILE_REQUIRED",
      message: "Resume PDF is required"
    });
    return;
  }

  try {
    const result = await resumeIngestionService.ingestResume(request.file);
    response.locals.ingestionLog = {
      fileName: request.file.originalname,
      ...result.timings
    };

    response.status(201).json({
      success: true,
      message: "Resume ingestion completed",
      resumeId: result.resumeId,
      data: {
        name: result.resume.name,
        role: result.resume.role,
        company: result.resume.company,
        totalExperience: result.resume.totalExperience,
        skillsCount: result.resume.skills.length,
        embeddingModel: result.embeddingModel,
        embeddingDimension: result.embeddingDimension
      },
      timings: result.timings
    });
  } catch (error) {
    next(error);
  } finally {
    await resumeIngestionService.cleanupUploadedFile(request.file);
  }
};

export const getResumeById: RequestHandler = async (request, response) => {
  const { id } = request.params;

  if (!id || typeof id !== "string") {
    response.status(400).json({ success: false, errorCode: "MISSING_ID", message: "Resume ID is required" });
    return;
  }

  try {
    const resume = await resumeIngestionRepository.findById(id);
    if (!resume) {
      response.status(404).json({ success: false, errorCode: "NOT_FOUND", message: "Resume not found" });
      return;
    }
    // Strip large embedding from response to keep payload small
    const { embedding: _e, ...safeResume } = resume as unknown as Record<string, unknown>;
    void _e;
    response.status(200).json(safeResume);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FETCH_FAILED";
    response.status(500).json({ success: false, errorCode: "FETCH_FAILED", message });
  }
};
