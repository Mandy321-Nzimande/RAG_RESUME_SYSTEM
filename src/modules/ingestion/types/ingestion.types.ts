export interface IngestionModuleStatus {
  status: "ok";
  module: "resume-ingestion";
}

export interface ParsedResume {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  company?: string;
  role?: string;
  education?: string;
  totalExperience?: number;
  relevantExperience?: number;
  skills: string[];
  jobTitles?: string[];
  experienceSummary?: string;
}

export interface StoredResume extends ParsedResume {
  fileName: string;
  rawText: string;
  embedding: number[];
  embeddingModel: string;
  embeddingDimension: number;
  createdAt: Date;
  updatedAt: Date;
}