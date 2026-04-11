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
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Port Heatmap</h1>
        <p className="text-secondary text-sm mt-1 max-w-2xl">
          The most-targeted network ports on the internet right now, aggregated from the SANS Internet Storm Center
          distributed honeypot and firewall sensors. Click a port to see what service runs on it and why it's being scanned.
        </p>
      </header>

      {!data && <div className="text-secondary">Loading port data…</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-1.5">
            {data.ports.map((p) => {
              const info = portServices[String(p.port)];
              const intensity = Math.min(1, (p.records / maxRecords) ** 0.4);
              const isSel = selected === p.port;
              return (
                <button
                  key={p.port}
                  onClick={() => setSelected(p.port)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    isSel ? 'border-accent bg-accent/10' : 'border-border bg-card hover:border-accent/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-lg text-primary w-16 shrink-0">#{p.rank || '—'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xl font-semibold text-primary">{p.port}</span>
                        <span className="text-sm text-secondary truncate">
                          {info?.name || p.service || 'Unknown service'}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-bg rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${intensity * 100}%`,
                            background: `rgba(${Math.round(0 + intensity * 230)},${Math.round(180 - intensity * 80)},${Math.round(216 - intensity * 130)},0.9)`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-mono text-sm text-primary">{p.records.toLocaleString()}</div>
                      <div className="text-[10px] text-secondary">records</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start bg-surface border border-border rounded-lg p-5 h-fit">
            {selectedPort ? (
              <div>
                <div className="text-xs text-secondary uppercase tracking-wider">Port</div>
                <div className="font-mono text-4xl font-semibold">{selectedPort.port}</div>
                <div className="mt-1 text-lg text-primary">
                  {portServices[String(selectedPort.port)]?.name || selectedPort.service || 'Unknown service'}
                </div>
                <p className="text-sm text-secondary mt-3 leading-relaxed">
                  {portServices[String(selectedPort.port)]?.description ||
                    'No description available for this port. It may be an ephemeral port or a custom service.'}
                </p>
                <dl className="mt-4 text-xs space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-secondary">Records</dt>
                    <dd className="font-mono">{selectedPort.records.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-secondary">Unique sources</dt>
                    <dd className="font-mono">{selectedPort.sources.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-secondary">Unique targets</dt>
                    <dd className="font-mono">{selectedPort.targets.toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="text-secondary text-sm">
                Click any port on the left for its service description and scanning stats.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
