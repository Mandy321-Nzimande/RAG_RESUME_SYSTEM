import { SUGGESTION_CHIPS } from '@/lib/utils/constants';

interface SuggestionChipsProps {
  onSelect: (query: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3" role="list" aria-label="Suggested queries">
      {SUGGESTION_CHIPS.map((chip) => (
        <button
          key={chip.label}
          role="listitem"
          onClick={() => onSelect(chip.query)}
          className="px-3 py-1.5 rounded-full border border-white/10 text-xs text-text-muted hover:text-text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
