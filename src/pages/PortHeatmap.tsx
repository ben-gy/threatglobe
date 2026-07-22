// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import { useMemo, useState } from 'react';
import { useJson } from '../hooks/useDataLoader';
import type { PortData } from '../types';
import portServicesRaw from '../data/port-services.json';

const portServices: Record<string, { name: string; description: string }> = portServicesRaw as any;

export default function PortHeatmap() {
  const { data } = useJson<PortData>('/data/ports/top50.json');
  const [selected, setSelected] = useState<number | null>(null);

  const maxRecords = useMemo(() => {
    if (!data?.ports) return 1;
    return Math.max(1, ...data.ports.map((p) => p.records));
  }, [data]);

  const selectedPort = useMemo(
    () => data?.ports.find((p) => p.port === selected) || null,
    [data, selected]
  );

  return (
    <div>
      <p className="text-secondary text-xs leading-relaxed mb-4 max-w-2xl">
        The most-targeted network ports across the public internet right now, aggregated from the SANS Internet Storm Center
        distributed honeypot and firewall sensors. Click any port to see what service runs on it and why it's being scanned.
      </p>

      {!data && <div className="text-secondary text-xs">Loading…</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-1 max-h-[60vh] overflow-y-auto scrollbar-thin pr-2">
            {data.ports.map((p) => {
              const info = portServices[String(p.port)];
              const intensity = Math.min(1, (p.records / maxRecords) ** 0.4);
              const isSel = selected === p.port;
              return (
                <button
                  key={p.port}
                  onClick={() => setSelected(p.port)}
                  className={`w-full text-left px-3 py-2 rounded border transition-all ${
                    isSel ? 'border-accent bg-accent/10' : 'border-border bg-panel hover:border-accent/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-[10px] text-muted w-7 shrink-0">#{p.rank || '—'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-base font-semibold text-primary">{p.port}</span>
                        <span className="text-[11px] text-secondary truncate uppercase tracking-wider">
                          {info?.name || p.service || 'Unknown'}
                        </span>
                      </div>
                      <div className="mt-1.5 bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${intensity * 100}%`,
                            background: `linear-gradient(90deg, #22d3ee ${(1 - intensity) * 50}%, #f59e0b 100%)`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-mono text-[11px] text-primary">{p.records.toLocaleString()}</div>
                      <div className="text-[9px] text-muted uppercase tracking-wider">records</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="bg-bg/40 border border-border rounded p-4 h-fit md:sticky md:top-0">
            {selectedPort ? (
              <div>
                <div className="label-uppercase">Port</div>
                <div className="font-mono text-3xl font-semibold mt-1">{selectedPort.port}</div>
                <div className="mt-1 text-[12px] text-primary uppercase tracking-wider">
                  {portServices[String(selectedPort.port)]?.name || selectedPort.service || 'Unknown service'}
                </div>
                <p className="text-[11px] text-secondary mt-3 leading-relaxed">
                  {portServices[String(selectedPort.port)]?.description ||
                    'No description available for this port. It may be ephemeral or a custom service.'}
                </p>
                <div className="divider" />
                <dl className="text-[10px] space-y-1.5 font-mono">
                  <Row label="Records" value={selectedPort.records.toLocaleString()} />
                  <Row label="Sources" value={selectedPort.sources.toLocaleString()} />
                  <Row label="Targets" value={selectedPort.targets.toLocaleString()} />
                </dl>
              </div>
            ) : (
              <div className="text-secondary text-[11px]">Select any port for service details and stats.</div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-primary">{value}</dd>
    </div>
  );
}
