import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { formatTime } from '@/lib/utils/formatters';

interface BotBubbleProps {
  children: ReactNode;
  timestamp?: Date;
}

export function BotBubble({ children, timestamp }: BotBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start px-4"
    >
      <div className="flex flex-col gap-1 max-w-[90%]">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-bg-card border border-white/[0.07] text-sm text-text-primary leading-relaxed">
          {children}
        </div>
        {timestamp && (
          <span className="text-xs text-text-muted pl-1">{formatTime(timestamp)}</span>
        )}
      </div>
    </motion.div>
  );
}
