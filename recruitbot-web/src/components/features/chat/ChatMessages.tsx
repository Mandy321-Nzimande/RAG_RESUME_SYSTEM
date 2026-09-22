import { useEffect, useRef } from 'react';
import { useChatStore } from '@/lib/stores/chat.store';
import { useSearchStore } from '@/lib/stores/search.store';
import { UserBubble } from './UserBubble';
import { BotBubble } from './BotBubble';
import { LoadingDots } from '@/components/common/LoadingDots';
import { WelcomeMessage } from './WelcomeMessage';

export function ChatMessages() {
  const messages = useChatStore((s) => s.messages);
  const isSearching = useSearchStore((s) => s.isSearching);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSearching]);

  return (
    <div
      className="flex-1 overflow-y-auto flex flex-col gap-4 py-4"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {/* Welcome message always shown when thread is empty */}
      {messages.length === 0 && (
        <BotBubble>
          <WelcomeMessage />
        </BotBubble>
      )}

      {messages.map((msg) =>
        msg.type === 'user' ? (
          <UserBubble key={msg.id} text={msg.text ?? ''} timestamp={msg.timestamp} />
        ) : (
          <BotBubble key={msg.id} timestamp={msg.timestamp}>
            {msg.content}
          </BotBubble>
        )
      )}

      {/* Typing indicator */}
      {isSearching && (
        <BotBubble>
          <LoadingDots />
        </BotBubble>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
