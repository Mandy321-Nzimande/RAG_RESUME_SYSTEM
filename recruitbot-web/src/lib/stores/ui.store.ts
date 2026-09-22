import { create } from 'zustand';

interface UiState {
  modalResumeId: string | null;
  sidebarOpen: boolean;
  openModal: (resumeId: string) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  modalResumeId: null,
  sidebarOpen: false,
  openModal: (resumeId) => set({ modalResumeId: resumeId }),
  closeModal: () => set({ modalResumeId: null }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
