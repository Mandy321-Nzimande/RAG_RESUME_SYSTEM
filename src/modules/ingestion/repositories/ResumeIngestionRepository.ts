import { connectDatabase } from "../../../config/database";
import { StoredResume } from "../types/ingestion.types";
import { ObjectId } from "mongodb";

export class ResumeIngestionRepository {
  async insertResume(resume: StoredResume): Promise<string> {
    const database = await connectDatabase();
    const result = await database.collection<StoredResume>("resumes").insertOne(resume);
    return result.insertedId.toHexString();
  }

  async findById(id: string): Promise<(StoredResume & { _id: ObjectId }) | null> {
    try {
      const oid = new ObjectId(id);
      const database = await connectDatabase();
      return await database
        .collection<StoredResume & { _id: ObjectId }>("resumes")
        .findOne({ _id: oid });
    } catch {
      return null;
    }
  }
}