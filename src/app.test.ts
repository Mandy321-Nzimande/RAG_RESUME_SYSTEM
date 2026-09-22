import request from "supertest";
import { app } from "./app";

describe("HTTP integration contracts", () => {
	it("returns health status and a request ID", async () => {
		const response = await request(app).get("/v1/health");

		expect(response.status).toBe(200);
		expect(response.body.status).toBe("ok");
		expect(response.headers["x-request-id"]).toEqual(expect.any(String));
	});

	it("rejects ingestion without a file", async () => {
		const response = await request(app).post("/v1/resume/ingest");

		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({
			success: false,
			errorCode: "FILE_REQUIRED",
			message: "Resume PDF is required"
		});
		expect(response.headers["x-request-id"]).toEqual(expect.any(String));
	});

	it("rejects non-PDF uploads", async () => {
		const response = await request(app)
			.post("/v1/resume/ingest")
			.attach("file", Buffer.from("not a PDF"), {
				filename: "resume.txt",
				contentType: "text/plain"
			});

		expect(response.status).toBe(415);
		expect(response.body).toMatchObject({
			success: false,
			errorCode: "INVALID_FILE_TYPE",
			message: "Only PDF files are allowed"
		});
		expect(response.body.requestId).toEqual(expect.any(String));
	});

	it("validates parse, embed, and store endpoint inputs", async () => {
		const parseResponse = await request(app)
			.post("/v1/resume/parse")
			.send({ rawText: "" });
		const embedResponse = await request(app)
			.post("/v1/resume/embed")
			.send({ rawText: "Resume", skills: ["Python", 42] });
		const storeResponse = await request(app)
			.post("/v1/resume/store")
			.send({ fileName: "resume.pdf", rawText: "Resume", resume: { skills: ["Python"] }, embedding: [0.1] });

		expect(parseResponse.status).toBe(400);
		expect(parseResponse.body.errorCode).toBe("INVALID_RAW_TEXT");
		expect(embedResponse.status).toBe(400);
		expect(embedResponse.body.errorCode).toBe("INVALID_EMBEDDING_INPUT");
		expect(storeResponse.status).toBe(400);
		expect(storeResponse.body.errorCode).toBe("INVALID_STORAGE_INPUT");
	});
});
