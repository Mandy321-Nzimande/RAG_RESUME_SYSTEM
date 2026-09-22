export interface ApiError {
  success: false;
  errorCode: string;
  message: string;
}

export interface IngestionResponse {
  success: boolean;
  resumeId?: string;
  name?: string;
  skills?: string[];
  totalExperience?: number;
  embeddingDimension?: number;
  message?: string;
}
