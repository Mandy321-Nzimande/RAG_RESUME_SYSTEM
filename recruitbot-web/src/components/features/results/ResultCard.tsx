import { motion } from 'framer-motion';
import { Briefcase, Star } from 'lucide-react';
import { SearchResult, SearchMode } from '@/types/search.types';
import { RankBadge } from './RankBadge';
import { ScorePill } from './ScorePill';
import { cn } from '@/lib/utils/cn';

interface ResultCardProps {
  result: SearchResult;
  searchMode: SearchMode;
  index: number;
  onSelect: (resumeId: string) => void;
}

export function ResultCard({ result, searchMode, index, onSelect }: ResultCardProps) {
  // Use the best available score — LLM relevanceScore first, then vector, then bm25
  const score = result.relevanceScore ?? undefined;
  const snippet = result.summary ?? result.reason ?? '';
  const truncated = snippet.length > 200 ? snippet.slice(0, 200) + '…' : snippet;

  // Clean up names that are just resume section headers
  const displayName = result.name && result.name.length > 2
    ? result.name
    : 'Candidate';

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.06 }}
      onClick={() => onSelect(result.resumeId)}
      aria-label={`View profile of ${displayName}, rank ${result.rank}`}
      className={cn(
        'w-full text-left p-4 rounded-xl border border-white/[0.07] bg-bg-base',
        'hover:border-white/[0.14] hover:shadow-lg transition-all cursor-pointer'
      )}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 mb-2">
        <RankBadge rank={result.rank} />
        <span className="flex-1 font-semibold text-sm text-text-primary truncate">
          {displayName}
        </span>
        <ScorePill score={score} searchMode={searchMode} />
      </div>

      {/* Role / company / experience */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {result.role && (
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Briefcase className="w-3 h-3" />
            <span className="truncate max-w-[180px]">{result.role}</span>
          </span>
        )}
        {result.totalExperience !== undefined && (
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Star className="w-3 h-3" />
            {result.totalExperience} yrs
          </span>
        )}
        {result.company && (
          <span className="text-xs text-text-muted truncate max-w-[160px]">@ {result.company}</span>
        )}
      </div>

      {/* Skills */}
      {result.skills && result.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {result.skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary/80"
            >
              {skill}
            </span>
          ))}
          {result.skills.length > 5 && (
            <span className="text-xs text-text-muted">+{result.skills.length - 5}</span>
          )}
        </div>
      )}

      {/* Snippet / reason */}
      {truncated && (
        <p className="text-xs text-text-muted leading-relaxed">{truncated}</p>
      )}

      {/* Sources */}
      <div className="flex gap-1 mt-2">
        {result.sources.map((s) => (
          <span
            key={s}
            className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              s === 'bm25'
                ? 'bg-score-bm25/10 text-score-bm25'
                : 'bg-score-vector/10 text-score-vector'
            )}
          >
            {s}
          </span>
        ))}
      </div>
    </motion.button>
  );
}
