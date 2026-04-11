import { useEffect, useRef, useState } from 'react';
import type { LatestData } from '../types';

const POLL_INTERVAL_MS = 60_000;
const NEW_FLAG_TTL_MS = 12_000;

interface State {
  data: LatestData | null;
  newPairKeys: Set<string>;
  lastUpdated: number;
  pollError: string | null;
}

function pairKey(p: { src: string; tgt: string; category: number }) {
  return `${p.src}|${p.tgt}|${p.category}`;
}

// Polls /data/latest.json on an interval, diffs the pair set against the previous
// snapshot, and exposes a `newPairKeys` set containing pairs that just appeared.
// New pairs decay back to "historical" after NEW_FLAG_TTL_MS so the globe can
// keep them as static lines once the appearance animation has completed.
export function useRealtimeData(): State {
  const [state, setState] = useState<State>({ data: null, newPairKeys: new Set(), lastUpdated: 0, pollError: null });
  const previousKeysRef = useRef<Set<string>>(new Set());
  const decayTimeoutRef = useRef<number | null>(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch('/data/latest.json?t=' + Date.now());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: LatestData = await res.json();
        if (cancelled) return;

        const currentKeys = new Set(json.pairs.map(pairKey));
        let newKeys: Set<string> = new Set();
        if (initialLoad.current) {
          // First load: nothing is "new" yet — all data is historical.
          initialLoad.current = false;
        } else {
          // Compute the diff
          for (const k of currentKeys) {
            if (!previousKeysRef.current.has(k)) newKeys.add(k);
          }
        }
        previousKeysRef.current = currentKeys;

        setState({
          data: json,
          newPairKeys: newKeys,
          lastUpdated: Date.now(),
          pollError: null,
        });

        // Decay new flags
        if (decayTimeoutRef.current) window.clearTimeout(decayTimeoutRef.current);
        if (newKeys.size > 0) {
          decayTimeoutRef.current = window.setTimeout(() => {
            if (cancelled) return;
            setState((s) => ({ ...s, newPairKeys: new Set() }));
          }, NEW_FLAG_TTL_MS);
        }
      } catch (e: any) {
        if (cancelled) return;
        setState((s) => ({ ...s, pollError: e.message }));
      }
    };

    tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (decayTimeoutRef.current) window.clearTimeout(decayTimeoutRef.current);
    };
  }, []);

  return state;
}
