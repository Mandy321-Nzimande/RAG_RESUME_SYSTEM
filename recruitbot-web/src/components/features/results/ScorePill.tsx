import { cn } from '@/lib/utils/cn';
import { SearchMode } from '@/types/search.types';
import { SCORE_COLORS } from '@/lib/utils/constants';

interface ScorePillProps {
  score: number | undefined;
  searchMode: SearchMode;
}

const LABELS: Record<SearchMode, string> = {
  vector: 'Similarity',
  bm25: 'BM25',
  hybrid: 'Score',
};

export function ScorePill({ score, searchMode }: ScorePillProps) {
  // Don't render a pill when there's no meaningful score
  if (score === undefined || score === null) return null;

  // Scores > 1 are BM25 relevance — show as raw number
  // Scores <= 1 are cosine similarity — show as percentage
  const display = score > 1 ? score.toFixed(2) : (score * 100).toFixed(0) + '%';

  return (
    <span
      className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', SCORE_COLORS[searchMode])}
      aria-label={`${LABELS[searchMode]}: ${display}`}
    >
      {display}
    </span>
  );
}
