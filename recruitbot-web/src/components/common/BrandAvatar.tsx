import { StatusDot } from './StatusDot';

export function BrandAvatar() {
  return (
    <div className="flex items-center gap-3 pb-2">
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-primary to-accent shadow-lg">
        <span className="text-white font-bold text-base select-none">R</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-text-primary font-semibold text-sm leading-tight">RecruitBot</span>
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <StatusDot />
          Online
        </span>
      </div>
    </div>
  );
}
