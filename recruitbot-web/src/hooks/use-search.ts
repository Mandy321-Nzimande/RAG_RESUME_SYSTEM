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
      const data = await searchApi.search({
        query: trimmed,
        options: {
          finalTopK: topK,
          rerankTopN: Math.max(topK * 2, 10),
          bm25TopK: 20,
          vectorTopK: 20,
          summarize: false, // disabled until LLM is confirmed working
        },
      });

      const durationMs = data.timings?.totalMs;
      setResults(data.results, trimmed, durationMs ?? 0);

      addBotMessage(
        createElement(ResultsList, {
          results: data.results,
          searchMode,
          durationMs,
          query: trimmed,
        })
      );

      // Only show a warning for critical failures (both search strategies failed)
      // LLM rerank/summarize failures are handled gracefully — results still shown
      const criticalWarnings = data.warnings.filter(
        (w) => w === 'BM25_FAILED' || w === 'VECTOR_FAILED' || w === 'SEARCH_UNAVAILABLE'
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
