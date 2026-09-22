import axios from 'axios';
import { IngestionResponse } from '@/types/api.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const ingestionApi = {
  async injectResume(file: File, onProgress?: (pct: number) => void): Promise<IngestionResponse> {
    const form = new FormData();
    form.append('resume', file);

    const response = await axios.post<IngestionResponse>(
      `${API_BASE_URL}/v1/resume/inject`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total && onProgress) {
            onProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      }
    );
    return response.data;
  },
};
