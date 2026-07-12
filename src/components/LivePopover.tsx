import { useEffect, useRef } from 'react';
import { useJson } from '../hooks/useDataLoader';
import type { PipelineStatus } from '../types';

interface Props {
  onClose: () => void;
  generatedAt?: string;
}

// Keyed sources are switched off in the pipeline (secrets can't ship client-side).
const SOURCES: Array<{ key: keyof PipelineStatus; label: string; unit?: string; disabled?: boolean }> = [
  { key: 'abuseipdb', label: 'AbuseIPDB', unit: 'IPs', disabled: true },
  { key: 'blocklist_de', label: 'Blocklist.de', unit: 'IPs' },
  { key: 'feodo', label: 'Feodo Tracker', unit: 'IPs' },
  { key: 'ipsum', label: 'IPsum', unit: 'IPs' },
  { key: 'dshield_topports', label: 'DShield', unit: 'ports' },
  { key: 'otx', label: 'OTX', unit: 'pulses', disabled: true },
  { key: 'greynoise', label: 'GreyNoise', disabled: true },
];

function formatTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }) +
    ' ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}


export default function LivePopover({ onClose, generatedAt }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: status } = useJson<PipelineStatus>('/data/meta/last-updated.json');

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // Defer so the opening click doesn't immediately close
    const id = requestAnimationFrame(() => document.addEventListener('mousedown', handle));
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('mousedown', handle);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 bg-panel border border-border rounded-lg p-4 font-mono text-[11px] shadow-2xl z-50 w-[280px]"
      style={{ maxWidth: 'calc(100vw - 24px)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="label-uppercase">Data Sources</span>
        <button onClick={onClose} className="text-muted hover:text-primary text-sm leading-none">&times;</button>
      </div>

      <div className="space-y-2">
        {SOURCES.map(({ key, label, unit, disabled }) => {
          const s = status?.[key] as any;
          if (disabled) {
            return (
              <div key={key} className="flex items-center justify-between gap-3 opacity-60">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-muted" />
                  <span className="text-muted line-through">{label}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted text-[9px] uppercase tracking-wider">disabled</span>
                </div>
              </div>
            );
          }
          const ok = s?.ok;
          const count = s?.count ?? s?.enriched;
          const detail = count != null && unit ? `${count.toLocaleString()} ${unit}` : count != null ? `${count}` : undefined;
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-success' : ok === false ? 'bg-danger' : 'bg-muted'}`} />
                <span className="text-primary">{label}</span>
              </div>
              <div className="text-right">
                {detail && <span className="text-secondary">{detail}</span>}
                {!detail && ok === false && <span className="text-danger text-[9px]">failed</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="divider" />

      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-muted">Last updated</span>
          <span className="text-primary">{formatTime(status?.lastRun || generatedAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Cadence</span>
          <span className="text-primary">periodic snapshot</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Data hour</span>
          <span className="text-primary">{status?.hour || '—'}</span>
        </div>
      </div>
    </div>
  );
}
