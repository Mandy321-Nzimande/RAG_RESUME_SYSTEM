import { Check, Zap, Hash, Blend } from 'lucide-react';
import { SearchMode } from '@/types/search.types';
import { SEARCH_MODE_LABELS, SEARCH_MODE_DESCRIPTIONS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';

const ICONS: Record<SearchMode, React.ReactNode> = {
  vector: <Zap className="w-4 h-4" />,
  bm25: <Hash className="w-4 h-4" />,
  hybrid: <Blend className="w-4 h-4" />,
};

interface SearchModeNavProps {
  activeMode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

const MODES: SearchMode[] = ['vector', 'bm25', 'hybrid'];

export function SearchModeNav({ activeMode, onChange }: SearchModeNavProps) {
  return (
    <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Search mode">
      {MODES.map((mode) => {
        const active = mode === activeMode;
        return (
          <button
            key={mode}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode)}
            className={cn(
              'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-all border',
              active
                ? 'bg-indigo-500/10 border-indigo-400/30 text-text-primary'
                : 'border-transparent hover:bg-white/[0.04] text-text-muted hover:text-text-primary'
            )}
          >
            <span className={cn('shrink-0', active ? 'text-primary' : 'text-text-muted')}>
              {ICONS[mode]}
            </span>
            <span className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium leading-tight">{SEARCH_MODE_LABELS[mode]}</span>
              <span className="text-xs text-text-muted leading-tight mt-0.5">
                {SEARCH_MODE_DESCRIPTIONS[mode]}
              </span>
            </span>
            {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
