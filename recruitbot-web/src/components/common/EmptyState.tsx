import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = 'No candidates found',
  description = 'Try a different query or broaden your search filters.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <SearchX className="w-10 h-10 text-text-muted opacity-50" />
      <p className="text-text-primary font-medium">{title}</p>
      <p className="text-text-muted text-sm max-w-xs">{description}</p>
    </div>
  );
}
