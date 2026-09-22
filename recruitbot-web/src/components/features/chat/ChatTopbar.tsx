import { useSearchStore } from '@/lib/stores/search.store';
import { SEARCH_MODE_LABELS, MODE_BADGE_COLORS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';

export function ChatTopbar() {
  const searchMode = useSearchStore((s) => s.searchMode);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-bg-surface shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs select-none">R</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary">RecruitBot</span>
          <span className="text-xs text-text-muted">{SEARCH_MODE_LABELS[searchMode]} · Semantic retrieval</span>
        </div>
      </div>
      <span
        className={cn('px-2.5 py-1 rounded-full text-xs font-medium', MODE_BADGE_COLORS[searchMode])}
        aria-label={`Active search mode: ${SEARCH_MODE_LABELS[searchMode]}`}
      >
        {SEARCH_MODE_LABELS[searchMode]}
      </span>
    </div>
  );
}
