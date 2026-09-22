import { useRef, useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useSearchStore } from '@/lib/stores/search.store';

interface ChatInputBarProps {
  onSubmit: (query: string) => void;
  initialValue?: string;
}

export function ChatInputBar({ onSubmit, initialValue = '' }: ChatInputBarProps) {
  const [value, setValue] = useState(initialValue);
  const isSearching = useSearchStore((s) => s.isSearching);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px'; // max 6 lines ≈ 144px
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || isSearching) return;
    onSubmit(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  const canSend = value.trim().length > 0 && !isSearching;

  return (
    <div className="shrink-0 px-4 pb-4 pt-2 border-t border-white/[0.07] bg-bg-base">
      <div className="flex items-end gap-2 bg-bg-card rounded-xl border border-white/[0.07] px-3 py-2.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); autoResize(); }}
          onKeyDown={handleKeyDown}
          placeholder="Ask me to find candidates…"
          rows={1}
          aria-label="Search query"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted resize-none outline-none leading-relaxed min-h-[24px]"
        />
        <button
          onClick={submit}
          disabled={!canSend}
          aria-label="Send query"
          className={cn(
            'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
            canSend
              ? 'bg-gradient-to-br from-primary to-accent text-white shadow-md hover:opacity-90'
              : 'opacity-40 cursor-not-allowed bg-white/10 text-text-muted'
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-text-muted text-center mt-1.5">
        Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-xs">Enter</kbd> to search ·{' '}
        <kbd className="px-1 py-0.5 rounded bg-white/10 text-xs">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
