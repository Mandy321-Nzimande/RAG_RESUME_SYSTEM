import { useState } from 'react';
import { ChatTopbar } from '@/components/features/chat/ChatTopbar';
import { ChatMessages } from '@/components/features/chat/ChatMessages';
import { SuggestionChips } from '@/components/features/chat/SuggestionChips';
import { ChatInputBar } from '@/components/features/chat/ChatInputBar';
import { CandidateModal } from '@/components/features/candidate/CandidateModal';
import { useChatStore } from '@/lib/stores/chat.store';
import { useSearch } from '@/hooks/use-search';

export function ChatPage() {
  const messages = useChatStore((s) => s.messages);
  const { submitQuery } = useSearch();
  const [inputValue, setInputValue] = useState('');

  const showChips = messages.length === 0;

  function handleChipSelect(query: string) {
    setInputValue(query);
    submitQuery(query);
  }

  return (
    <div className="flex flex-col h-full">
      <ChatTopbar />
      <ChatMessages />
      {showChips && <SuggestionChips onSelect={handleChipSelect} />}
      <ChatInputBar onSubmit={submitQuery} initialValue={inputValue} />
      <CandidateModal />
    </div>
  );
}
