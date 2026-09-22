import { cn } from '@/lib/utils/cn';
import { SearchMode } from '@/types/search.types';
import { SEARCH_MODE_LABELS, MODE_BADGE_COLORS } from '@/lib/utils/constants';
import { formatDuration } from '@/lib/utils/formatters';

interface ResultSummaryProps {
  count: number;
  searchMode: SearchMode;
  durationMs?: number;
  query: string;
}

export function ResultSummary({ count, searchMode, durationMs, query }: ResultSummaryProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-3 pb-3 border-b border-white/[0.07]">
      <span className="text-sm text-text-primary font-medium">
        Found <strong>{count}</strong> candidate{count !== 1 ? 's' : ''}
      </span>
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', MODE_BADGE_COLORS[searchMode])}>
        {SEARCH_MODE_LABELS[searchMode]}
      </span>
      {durationMs !== undefined && (
        <span className="text-xs text-text-muted">{formatDuration(durationMs)}</span>
      )}
      <p className="w-full text-xs text-text-muted truncate" title={query}>
        "{query}"
      </p>
    </div>
  );
}
