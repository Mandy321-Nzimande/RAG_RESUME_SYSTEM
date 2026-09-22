import { create } from 'zustand';
import { SearchMode, SearchResult } from '@/types/search.types';

interface SearchState {
  searchMode: SearchMode;
  topK: number;
  results: SearchResult[];
  isSearching: boolean;
  lastQuery: string;
  lastDurationMs: number;
  setSearchMode: (mode: SearchMode) => void;
  setTopK: (k: number) => void;
  setResults: (results: SearchResult[], query: string, durationMs: number) => void;
  setSearching: (v: boolean) => void;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchMode: 'vector',
  topK: 5,
  results: [],
  isSearching: false,
  lastQuery: '',
  lastDurationMs: 0,
  setSearchMode: (mode) => set({ searchMode: mode }),
  setTopK: (k) => set({ topK: k }),
  setResults: (results, query, durationMs) =>
    set({ results, lastQuery: query, lastDurationMs: durationMs }),
  setSearching: (v) => set({ isSearching: v }),
  clearResults: () => set({ results: [], lastQuery: '', lastDurationMs: 0 }),
}));
