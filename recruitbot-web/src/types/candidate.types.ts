export interface Experience {
  company: string;
  title: string;
  duration?: string;
  description?: string;
}

export interface Education {
  degree: string;
  institution: string;
  year?: string;
}

export interface CandidateProfile {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  role?: string;
  company?: string;
  education?: string;
  skills?: string[];
  jobTitles?: string[];
  experienceSummary?: string;
  totalExperience?: number;
  relevantExperience?: number;
  rawText?: string;
  embeddingModel?: string;
  createdAt?: string;
  updatedAt?: string;
}
