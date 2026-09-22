import { useSearchStore } from '@/lib/stores/search.store';
import { useChatStore } from '@/lib/stores/chat.store';
import { searchApi } from '@/lib/api/search.api';
import { ResultsList } from '@/components/features/results/ResultsList';
import { createElement } from 'react';

export function useSearch() {
  const { searchMode, topK, setSearching, setResults } = useSearchStore();
  const { addUserMessage, addBotMessage } = useChatStore();

  async function submitQuery(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;

    addUserMessage(trimmed);
    setSearching(true);

    try {
      const data = await searchApi.agentChat(trimmed, topK);

      setResults(data.candidates, trimmed, 0);

      addBotMessage(
        createElement(
          'div',
          { className: 'flex flex-col gap-3' },
          createElement('p', { className: 'text-text-primary' }, data.answer),
          createElement(
            'div',
            { className: 'flex flex-wrap gap-2 text-xs text-text-muted' },
            'Tools used:',
            ...data.tools_used.map((tool) =>
              createElement(
                'span',
                { key: tool, className: 'px-2 py-1 rounded-full bg-white/[0.06]' },
                tool === 'search_candidates' ? 'Candidate search' : 'Web search'
              )
            )
          ),
          data.sources.length > 0
            ? createElement(
                'div',
                { className: 'flex flex-col gap-1 text-xs text-text-muted' },
                createElement('span', null, 'External sources:'),
                ...data.sources.map((source) =>
                  createElement(
                    'a',
                    { key: source.url, href: source.url, target: '_blank', rel: 'noreferrer', className: 'text-score-vector hover:underline' },
                    source.title
                  )
                )
              )
            : null
        )
      );

      addBotMessage(
        createElement(ResultsList, {
          results: data.candidates,
          searchMode,
          durationMs: undefined,
          query: trimmed,
        })
      );

      const criticalWarnings = data.warnings.filter(
        (warning) =>
          warning === 'BM25_FAILED' ||
          warning === 'VECTOR_FAILED' ||
          warning === 'SEARCH_UNAVAILABLE'
      );
      if (criticalWarnings.length > 0) {
        addBotMessage(
          createElement(
            'p',
            { className: 'text-xs text-amber-400' },
            `⚠ Partial results only: ${criticalWarnings.join(', ')}`
          )
        );
      }

      const optionalWarnings = data.warnings.filter(
        (warning) =>
          warning !== 'BM25_FAILED' &&
          warning !== 'VECTOR_FAILED' &&
          warning !== 'SEARCH_UNAVAILABLE'
      );
      if (optionalWarnings.length > 0) {
        addBotMessage(
          createElement(
            'p',
            { className: 'text-xs text-text-muted' },
            `Additional services unavailable: ${optionalWarnings.join(', ')}`
          )
        );
      }
    } catch {
      addBotMessage(
        createElement(
          'p',
          { className: 'text-red-400 text-sm' },
          'Search failed. Check your connection or try again.'
        )
      );
    } finally {
      setSearching(false);
    }
  }

  return { submitQuery };
}
