import { unlink } from "node:fs/promises";
import { env } from "../../../config/env";
import { AlgorithmResumeParser } from "./AlgorithmResumeParser";
import { EmbeddingService } from "./EmbeddingService";
import { LLMResumeParser } from "./LLMResumeParser";
import { ResumeParserService } from "./ResumeParserService";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { cleanResumeText } from "../utils/textCleaner";
import { ParsedResume } from "../types/ingestion.types";

export interface ResumeIngestionResult {
	resumeId: string;
	resume: ParsedResume;
	embeddingModel: string;
	embeddingDimension: number;
	timings: {
		extractMs: number;
		cleanMs: number;
		parseMs: number;
		embeddingMs: number;
		mongoInsertMs: number;
		totalMs: number;
	};
}

const elapsedMs = (startedAt: bigint): number =>
	Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(1));

export class ResumeIngestionService {
	constructor(
		private readonly resumeParserService = new ResumeParserService(),
		private readonly algorithmResumeParser = new AlgorithmResumeParser(),
		private readonly llmResumeParser = new LLMResumeParser(),
		private readonly embeddingService = new EmbeddingService(),
		private readonly resumeIngestionRepository = new ResumeIngestionRepository()
	) {}

	async ingestResume(file: Express.Multer.File): Promise<ResumeIngestionResult> {
		const totalStartedAt = process.hrtime.bigint();
		const extractStartedAt = process.hrtime.bigint();
		const rawText = await this.resumeParserService.extractTextFromPdf(file.path);
		const extractMs = elapsedMs(extractStartedAt);

		const cleanStartedAt = process.hrtime.bigint();
		const cleanText = cleanResumeText(rawText);
		const cleanMs = elapsedMs(cleanStartedAt);

		const parseStartedAt = process.hrtime.bigint();
		const resume = env.useLlmParser
			? await this.llmResumeParser.parseResume(cleanText)
			: this.algorithmResumeParser.parseResume(cleanText);
		const parseMs = elapsedMs(parseStartedAt);

		const embeddingStartedAt = process.hrtime.bigint();
		const embedding = await this.embeddingService.generateResumeEmbedding({
			name: resume.name,
			role: resume.role,
			skills: resume.skills,
			company: resume.company,
			experienceSummary: resume.experienceSummary,
			rawText: cleanText
		});
		const embeddingMs = elapsedMs(embeddingStartedAt);

		const now = new Date();
		const mongoInsertStartedAt = process.hrtime.bigint();
		const resumeId = await this.resumeIngestionRepository.insertResume({
			fileName: file.originalname,
			rawText: cleanText,
			...resume,
			embedding,
			embeddingModel: env.mistralEmbedModel,
			embeddingDimension: embedding.length,
			createdAt: now,
			updatedAt: now
		});
		const mongoInsertMs = elapsedMs(mongoInsertStartedAt);

		return {
			resumeId,
			resume,
			embeddingModel: env.mistralEmbedModel,
			embeddingDimension: embedding.length,
			timings: {
				extractMs,
				cleanMs,
				parseMs,
				embeddingMs,
				mongoInsertMs,
				totalMs: elapsedMs(totalStartedAt)
			}
		};
	}

	async cleanupUploadedFile(file: Express.Multer.File): Promise<void> {
		await unlink(file.path).catch(() => undefined);
	}
}