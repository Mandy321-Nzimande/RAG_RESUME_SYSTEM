import { X } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat.store';
import { useSearchStore } from '@/lib/stores/search.store';

export function ClearChatButton() {
  const clearMessages = useChatStore((s) => s.clearMessages);
  const clearResults = useSearchStore((s) => s.clearResults);

  function handleClear() {
    clearMessages();
    clearResults();
  }

  return (
    <button
      onClick={handleClear}
      aria-label="Clear chat"
      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-white/10 text-xs text-text-muted hover:text-text-primary hover:border-white/20 transition-all"
    >
      <X className="w-3.5 h-3.5" />
      Clear chat
    </button>
  );
}
