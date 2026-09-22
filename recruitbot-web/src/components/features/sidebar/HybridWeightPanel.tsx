import { motion } from 'framer-motion';
import { useHybridWeights } from '@/hooks/use-hybrid-weights';
import { cn } from '@/lib/utils/cn';

const PRESETS = [
  { label: '50/50', bm25: 50 },
  { label: '70/30', bm25: 70 },
  { label: '30/70', bm25: 30 },
];

export function HybridWeightPanel() {
  const { bm25Weight, vectorWeight, handleBm25Change, handleVectorChange, applyPreset } =
    useHybridWeights();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-3 pt-1 pb-2">
        <p className="text-xs font-medium uppercase tracking-widest text-text-muted">
          Search Weights
        </p>

        {/* BM25 slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-score-bm25">BM25</span>
            <span className="text-text-muted">{bm25Weight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={bm25Weight}
            onChange={(e) => handleBm25Change(Number(e.target.value))}
            aria-label="BM25 weight"
            className="w-full accent-score-bm25 cursor-pointer"
          />
        </div>

        {/* Vector slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-score-vector">Vector</span>
            <span className="text-text-muted">{vectorWeight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={vectorWeight}
            onChange={(e) => handleVectorChange(Number(e.target.value))}
            aria-label="Vector weight"
            className="w-full accent-score-vector cursor-pointer"
          />
        </div>

        {/* Preset pills */}
        <div className="flex gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.bm25)}
              className={cn(
                'flex-1 text-xs py-1 rounded-md border transition-all',
                bm25Weight === p.bm25
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-white/10 text-text-muted hover:border-white/20 hover:text-text-primary'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
