import apiClient from './client';
import { AgentResponse, SearchRequest, SearchResponse } from '@/types/search.types';

export const searchApi = {
  async search(params: SearchRequest): Promise<SearchResponse> {
    const response = await apiClient.post<SearchResponse>('/v1/search', params);
    return response.data;
  },

  async agentChat(message: string, topK: number): Promise<AgentResponse> {
    const response = await apiClient.post<AgentResponse>('/v1/agent/chat', {
      message,
      topK,
    });
    return response.data;
  },

  async readiness() {
    const response = await apiClient.get('/v1/search/readiness');
    return response.data as { ready: boolean; resumeCount: number; resumesWithEmbedding: number };
  },
};
