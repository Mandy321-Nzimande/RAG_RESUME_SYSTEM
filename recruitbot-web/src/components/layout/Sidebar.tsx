import { AnimatePresence } from 'framer-motion';
import { BrandAvatar } from '@/components/common/BrandAvatar';
import { SearchModeNav } from '@/components/features/sidebar/SearchModeNav';
import { HybridWeightPanel } from '@/components/features/sidebar/HybridWeightPanel';
import { ResultsLimitSelect } from '@/components/features/sidebar/ResultsLimitSelect';
import { ClearChatButton } from '@/components/features/sidebar/ClearChatButton';
import { useSearchStore } from '@/lib/stores/search.store';
import { Link, useLocation } from 'react-router-dom';
import { Upload, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-xs font-medium uppercase tracking-widest text-text-muted px-1', className)}>
      {children}
    </p>
  );
}

export function Sidebar() {
  const { searchMode, setSearchMode } = useSearchStore();
  const location = useLocation();

  return (
    <aside className="w-[260px] shrink-0 bg-bg-surface border-r border-white/[0.07] flex flex-col p-5 gap-4 overflow-y-auto">
      <BrandAvatar />

      {/* Nav links */}
      <nav className="flex flex-col gap-1">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
            location.pathname === '/'
              ? 'bg-primary/10 text-primary'
              : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Search
        </Link>
        <Link
          to="/upload"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
            location.pathname === '/upload'
              ? 'bg-primary/10 text-primary'
              : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
          )}
        >
          <Upload className="w-4 h-4" />
          Upload Resume
        </Link>
      </nav>

      <div className="h-px bg-white/[0.07]" />

      <SectionLabel>Search Mode</SectionLabel>
      <SearchModeNav activeMode={searchMode} onChange={setSearchMode} />

      <AnimatePresence>
        {searchMode === 'hybrid' && <HybridWeightPanel />}
      </AnimatePresence>

      <div className="mt-auto flex flex-col gap-4">
        <div className="h-px bg-white/[0.07]" />
        <SectionLabel>Results limit</SectionLabel>
        <ResultsLimitSelect />
        <ClearChatButton />
        <p className="text-xs text-text-muted text-center pt-1">RecruitBot v2.0</p>
      </div>
    </aside>
  );
}
