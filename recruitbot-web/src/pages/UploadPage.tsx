import { useRef, useState, DragEvent } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ingestionApi } from '@/lib/api/ingestion.api';
import { IngestionResponse } from '@/types/api.types';
import { cn } from '@/lib/utils/cn';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const STEPS = [
  'PDF Upload',
  'Text Extraction',
  'Resume Parsing',
  'Embedding Generation',
  'MongoDB Storage',
];

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<IngestionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);

  function validateFile(f: File): string | null {
    if (f.type !== 'application/pdf') return 'Only PDF files are allowed.';
    if (f.size > 5 * 1024 * 1024) return 'File must be smaller than 5 MB.';
    return null;
  }

  function pickFile(f: File) {
    const err = validateFile(f);
    if (err) { setErrorMsg(err); setState('error'); return; }
    setFile(f);
    setState('idle');
    setErrorMsg('');
    setResult(null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  async function upload() {
    if (!file) return;
    setState('uploading');
    setProgress(0);
    setResult(null);
    setErrorMsg('');
    try {
      const data = await ingestionApi.injectResume(file, setProgress);
      setResult(data);
      setState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setErrorMsg(msg);
      setState('error');
    }
  }

  function reset() {
    setFile(null);
    setState('idle');
    setProgress(0);
    setResult(null);
    setErrorMsg('');
  }

  const activeStep = Math.min(Math.floor((progress / 100) * STEPS.length), STEPS.length - 1);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="w-full max-w-lg flex flex-col gap-6">

        <div className="text-center">
          <h1 className="text-xl font-semibold text-text-primary">Upload Resume</h1>
          <p className="text-sm text-text-muted mt-1">Upload a PDF resume to ingest it into the RAG pipeline</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          aria-label="Upload PDF resume"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all',
            dragging ? 'border-primary bg-primary/5' : 'border-white/20 hover:border-primary/50 hover:bg-white/[0.02]'
          )}
        >
          <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
          <Upload className="w-10 h-10 text-text-muted" />
          {file ? (
            <div className="flex items-center gap-2 text-sm text-text-primary">
              <FileText className="w-4 h-4 text-primary" />
              {file.name}
            </div>
          ) : (
            <>
              <p className="text-sm text-text-primary font-medium">Drag &amp; drop a PDF here</p>
              <p className="text-xs text-text-muted">or click to browse · PDF only · max 5 MB</p>
            </>
          )}
        </div>

        {/* Upload button */}
        {file && state !== 'success' && (
          <button
            onClick={upload}
            disabled={state === 'uploading'}
            aria-label="Start ingestion"
            className={cn(
              'w-full py-3 rounded-xl font-medium text-sm transition-all',
              state === 'uploading'
                ? 'bg-primary/40 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90'
            )}
          >
            {state === 'uploading' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Ingesting...
              </span>
            ) : 'Ingest Resume'}
          </button>
        )}

        {/* Progress steps */}
        {state === 'uploading' && (
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-bg-card border border-white/[0.07]">
            <p className="text-xs text-text-muted mb-1">Pipeline progress</p>
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full shrink-0 transition-all',
                  i < activeStep ? 'bg-emerald-400' : i === activeStep ? 'bg-primary animate-pulse' : 'bg-white/20'
                )} />
                <span className={cn('text-sm',
                  i < activeStep ? 'text-emerald-400' : i === activeStep ? 'text-text-primary' : 'text-text-muted'
                )}>{step}</span>
              </div>
            ))}
          </div>
        )}

        {/* Success */}
        {state === 'success' && result && (
          <div className="flex flex-col gap-4 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Resume ingested successfully</span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-text-muted">
              {result.name && <span>Name: <strong className="text-text-primary">{result.name}</strong></span>}
              {result.resumeId && <span>ID: <code className="text-xs bg-white/5 px-1 py-0.5 rounded">{result.resumeId}</code></span>}
              {result.totalExperience !== undefined && <span>Experience: <strong className="text-text-primary">{result.totalExperience} years</strong></span>}
              {result.embeddingDimension && <span>Embedding: <strong className="text-text-primary">{result.embeddingDimension}d</strong> · Vector search ready</span>}
              {result.skills && result.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.skills.slice(0, 8).map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs">{s}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={reset} className="text-xs text-text-muted hover:text-text-primary underline self-start">
              Upload another
            </button>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-red-400">Upload failed</span>
              <span className="text-xs text-text-muted">{errorMsg}</span>
              <button onClick={reset} className="text-xs text-text-muted hover:text-text-primary underline self-start mt-1">Try again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
