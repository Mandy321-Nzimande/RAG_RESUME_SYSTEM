import { SearchMode } from '@/types/search.types';

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  vector: 'Vector Search',
  bm25: 'BM25 Keyword',
  hybrid: 'Hybrid',
};

export const SEARCH_MODE_DESCRIPTIONS: Record<SearchMode, string> = {
  vector: 'Semantic similarity via embeddings',
  bm25: 'Keyword relevance scoring',
  hybrid: 'BM25 + Vector combined',
};

export const SCORE_COLORS: Record<SearchMode, string> = {
  vector: 'text-score-vector bg-score-vector/10',
  bm25: 'text-score-bm25 bg-score-bm25/10',
  hybrid: 'text-score-hybrid bg-score-hybrid/10',
};

export const MODE_BADGE_COLORS: Record<SearchMode, string> = {
  vector: 'bg-score-vector/20 text-score-vector',
  bm25: 'bg-score-bm25/20 text-score-bm25',
  hybrid: 'bg-score-hybrid/20 text-score-hybrid',
};

export const SUGGESTION_CHIPS = [
  { label: '🔍 Selenium QA 3 yrs', query: 'Selenium automation engineer 3 years experience' },
  { label: '🐍 Python ML dev', query: 'Python developer with machine learning' },
  { label: '☁️ Java AWS backend', query: 'Java backend developer AWS cloud' },
  { label: '⚡ Lead QA Cypress', query: 'Lead QA engineer with Cypress and CI/CD' },
];
