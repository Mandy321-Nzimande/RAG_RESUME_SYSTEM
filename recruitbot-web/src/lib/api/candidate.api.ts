import apiClient from './client';
import { CandidateProfile } from '@/types/candidate.types';

export const candidateApi = {
  async getCandidate(id: string): Promise<CandidateProfile> {
    // The backend stores resumes — fetch by ID from the ingestion collection
    const response = await apiClient.get<CandidateProfile>(`/v1/resume/${id}`);
    return response.data;
  },
};
