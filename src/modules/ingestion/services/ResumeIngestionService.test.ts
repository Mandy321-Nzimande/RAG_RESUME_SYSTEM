import { ResumeIngestionService } from "./ResumeIngestionService";

describe("ResumeIngestionService", () => {
	it("orchestrates extraction, parsing, embedding, and storage", async () => {
		const insertResume = jest.fn().mockResolvedValue("resume-id");
		const extractTextFromPdf = jest.fn().mockResolvedValue("Candidate\nSenior Engineer\nPython");
		const parseResume = jest.fn().mockReturnValue({
			name: "Candidate",
			role: "Senior Engineer",
			skills: ["Python"]
		});
		const generateResumeEmbedding = jest.fn().mockResolvedValue([0.1, 0.2]);
		const file = {
			path: "uploads/resume.pdf",
			originalname: "resume.pdf"
		} as Express.Multer.File;

		const result = await new ResumeIngestionService(
			{ extractTextFromPdf } as never,
			{ parseResume } as never,
			{} as never,
			{ generateResumeEmbedding } as never,
			{ insertResume } as never
		).ingestResume(file);

		expect(extractTextFromPdf).toHaveBeenCalledWith(file.path);
		expect(parseResume).toHaveBeenCalled();
		expect(generateResumeEmbedding).toHaveBeenCalledWith(expect.objectContaining({
			name: "Candidate",
			role: "Senior Engineer",
			skills: ["Python"]
		}));
		expect(insertResume).toHaveBeenCalledWith(expect.objectContaining({
			fileName: "resume.pdf",
			rawText: expect.any(String),
			embedding: [0.1, 0.2],
			embeddingDimension: 2
		}));
		expect(result).toMatchObject({
			resumeId: "resume-id",
			embeddingDimension: 2,
			timings: {
				extractMs: expect.any(Number),
				cleanMs: expect.any(Number),
				parseMs: expect.any(Number),
				embeddingMs: expect.any(Number),
				mongoInsertMs: expect.any(Number),
				totalMs: expect.any(Number)
			}
		});
	});
});
