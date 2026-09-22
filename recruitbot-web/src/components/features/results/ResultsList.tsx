import { SearchResult, SearchMode } from '@/types/search.types';
import { ResultSummary } from './ResultSummary';
import { ResultCard } from './ResultCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useUiStore } from '@/lib/stores/ui.store';

interface ResultsListProps {
  results: SearchResult[];
  searchMode: SearchMode;
  durationMs?: number;
  query: string;
}

export function ResultsList({ results, searchMode, durationMs, query }: ResultsListProps) {
  const openModal = useUiStore((s) => s.openModal);

  return (
    <div className="flex flex-col gap-0">
      <ResultSummary
        count={results.length}
        searchMode={searchMode}
        durationMs={durationMs}
        query={query}
      />
      {results.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((result, i) => (
            <ResultCard
              key={result.resumeId}
              result={result}
              searchMode={searchMode}
              index={i}
              onSelect={openModal}
            />
          ))}
        </div>
      )}
    </div>
  );
}
