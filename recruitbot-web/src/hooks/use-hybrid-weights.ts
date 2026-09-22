import { useState } from 'react';

export function useHybridWeights() {
  const [bm25Weight, setBm25Weight] = useState(50);
  const vectorWeight = 100 - bm25Weight;

  function handleBm25Change(value: number) {
    setBm25Weight(value);
  }

  function handleVectorChange(value: number) {
    setBm25Weight(100 - value);
  }

  function applyPreset(bm25: number) {
    setBm25Weight(bm25);
  }

  return { bm25Weight, vectorWeight, handleBm25Change, handleVectorChange, applyPreset };
}
