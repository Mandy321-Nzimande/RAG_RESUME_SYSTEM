import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useUiStore } from '@/lib/stores/ui.store';
import { candidateApi } from '@/lib/api/candidate.api';
import { CandidateProfile } from '@/types/candidate.types';
import toast from 'react-hot-toast';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-widest text-text-muted">{title}</p>
      {children}
    </div>
  );
}

function ModalContent({ candidate }: { candidate: CandidateProfile }) {
  const skillList = candidate.skills ?? [];
  const jobTitles = candidate.jobTitles ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{candidate.name ?? 'Candidate'}</h2>
        {(candidate.role || candidate.company) && (
          <p className="text-sm text-text-muted mt-0.5">
            {[candidate.role, candidate.company].filter(Boolean).join(' @ ')}
          </p>
        )}
      </div>

      {(candidate.email || candidate.phone || candidate.location) && (
        <Section title="Contact">
          <div className="flex flex-col gap-1 text-sm text-text-muted">
            {candidate.email && <span>✉ {candidate.email}</span>}
            {candidate.phone && <span>📞 {candidate.phone}</span>}
            {candidate.location && <span>📍 {candidate.location}</span>}
          </div>
        </Section>
      )}

      {candidate.totalExperience !== undefined && (
        <Section title="Experience">
          <p className="text-sm text-text-primary">{candidate.totalExperience} years total</p>
          {candidate.experienceSummary && (
            <p className="text-sm text-text-muted leading-relaxed">{candidate.experienceSummary}</p>
          )}
        </Section>
      )}

      {jobTitles.length > 0 && (
        <Section title="Job Titles">
          <div className="flex flex-wrap gap-1.5">
            {jobTitles.map((t) => (
              <span key={t} className="px-2 py-1 rounded-md bg-white/5 text-xs text-text-primary border border-white/10">
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}

      {skillList.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {skillList.map((skill) => (
              <span key={skill} className="px-2 py-1 rounded-md bg-primary/10 text-primary/90 text-xs border border-primary/20">
                {skill}
              </span>
            ))}
          </div>
        </Section>
      )}

      {candidate.education && (
        <Section title="Education">
          <p className="text-sm text-text-muted">{candidate.education}</p>
        </Section>
      )}

      {candidate.embeddingModel && (
        <Section title="Embedding">
          <p className="text-xs text-text-muted">Model: {candidate.embeddingModel}</p>
        </Section>
      )}
    </div>
  );
}

export function CandidateModal() {
  const { modalResumeId, closeModal } = useUiStore();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isOpen = modalResumeId !== null;

  useEffect(() => {
    if (!modalResumeId) { setCandidate(null); return; }
    setLoading(true);
    candidateApi
      .getCandidate(modalResumeId)
      .then(setCandidate)
      .catch(() => { toast.error('Failed to load candidate profile.'); closeModal(); })
      .finally(() => setLoading(false));
  }, [modalResumeId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeModal(); }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => closeRef.current?.focus(), 50);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Candidate profile"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl max-h-[88vh] overflow-y-auto bg-bg-surface rounded-2xl border border-white/[0.1] shadow-2xl p-6"
          >
            <button
              ref={closeRef}
              onClick={closeModal}
              aria-label="Close profile"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}

            {!loading && candidate && <ModalContent candidate={candidate} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
