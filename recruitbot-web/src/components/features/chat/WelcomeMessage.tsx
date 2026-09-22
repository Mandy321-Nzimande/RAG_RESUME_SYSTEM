import { Zap, Hash, Blend } from 'lucide-react';

export function WelcomeMessage() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-text-primary font-medium">
        👋 Hi! I'm RecruitBot — your AI-powered resume search assistant.
      </p>
      <p className="text-text-muted text-sm">
        Ask me to find candidates using natural language. I support three search modes:
      </p>
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-score-vector mt-0.5 shrink-0" />
          <span className="text-sm text-text-muted">
            <span className="text-score-vector font-medium">Vector Search</span> — finds candidates
            by semantic meaning, even when wording differs
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Hash className="w-4 h-4 text-score-bm25 mt-0.5 shrink-0" />
          <span className="text-sm text-text-muted">
            <span className="text-score-bm25 font-medium">BM25 Keyword</span> — finds candidates
            by exact keyword relevance scoring
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Blend className="w-4 h-4 text-score-hybrid mt-0.5 shrink-0" />
          <span className="text-sm text-text-muted">
            <span className="text-score-hybrid font-medium">Hybrid</span> — combines both for the
            best results
          </span>
        </div>
      </div>
      <p className="text-text-muted text-sm mt-1">
        Try one of the suggestions below or type your own query.
      </p>
    </div>
  );
}
