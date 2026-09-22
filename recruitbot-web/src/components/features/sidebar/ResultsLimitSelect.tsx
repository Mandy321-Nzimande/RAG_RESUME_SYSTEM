import { useSearchStore } from '@/lib/stores/search.store';

const OPTIONS = [3, 5, 10, 20];

export function ResultsLimitSelect() {
  const { topK, setTopK } = useSearchStore();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted whitespace-nowrap">Show top</span>
      <select
        value={topK}
        onChange={(e) => setTopK(Number(e.target.value))}
        aria-label="Results limit"
        className="flex-1 bg-bg-card border border-white/10 rounded-md text-xs text-text-primary px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
      >
        {OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span className="text-xs text-text-muted">results</span>
    </div>
  );
}
