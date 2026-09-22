import { connectDatabase } from "../../../config/database";
import { ResumeIngestionRepository } from "./ResumeIngestionRepository";
import { StoredResume } from "../types/ingestion.types";

jest.mock("../../../config/database", () => ({
	connectDatabase: jest.fn()
}));

describe("ResumeIngestionRepository", () => {
	it("inserts a resume into the resumes collection and returns its ID", async () => {
		const insertOne = jest.fn().mockResolvedValue({
			insertedId: { toHexString: () => "resume-id" }
		});
		(connectDatabase as jest.Mock).mockResolvedValue({
			collection: jest.fn().mockReturnValue({ insertOne })
		});

		const resume = {
			fileName: "resume.pdf",
			rawText: "Resume content",
			skills: ["TypeScript"],
			embedding: [0.1],
			embeddingModel: "mistral-embed",
			embeddingDimension: 1,
			createdAt: new Date(),
			updatedAt: new Date()
		} satisfies StoredResume;

		await expect(new ResumeIngestionRepository().insertResume(resume)).resolves.toBe("resume-id");
		expect(insertOne).toHaveBeenCalledWith(resume);
	});
});
