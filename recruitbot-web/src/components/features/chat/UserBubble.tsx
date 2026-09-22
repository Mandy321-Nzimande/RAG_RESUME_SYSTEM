import { motion } from 'framer-motion';
import { formatTime } from '@/lib/utils/formatters';

interface UserBubbleProps {
  text: string;
  timestamp: Date;
}

export function UserBubble({ text, timestamp }: UserBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-end px-4"
    >
      <div className="flex flex-col items-end gap-1 max-w-[75%]">
        <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-accent text-white text-sm leading-relaxed">
          {text}
        </div>
        <span className="text-xs text-text-muted">{formatTime(timestamp)}</span>
      </div>
    </motion.div>
  );
}
