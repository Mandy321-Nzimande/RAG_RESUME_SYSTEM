import { cn } from '@/lib/utils/cn';

interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  const isTop = rank <= 3;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0',
        isTop
          ? 'bg-gradient-to-br from-primary to-accent text-white'
          : 'bg-white/10 text-text-muted'
      )}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}
