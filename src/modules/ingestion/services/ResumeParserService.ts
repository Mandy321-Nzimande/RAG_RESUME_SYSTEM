import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export class ResumeParserService {
	async extractTextFromPdf(filePath: string): Promise<string> {
		const parser = new PDFParse({ data: await readFile(filePath) });

		try {
			const result = await parser.getText();
			const rawText = result.text.trim();

			if (!rawText) {
				throw new Error("RESUME_EXTRACTION_FAILED");
			}

			return rawText;
		} finally {
			await parser.destroy();
		}
	}
}