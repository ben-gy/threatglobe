import { useMemo, useState } from 'react';
import { useJson } from '../../hooks/useDataLoader';
import type { CountryProfile, BilateralData } from '../../types';
import { flag, countryName } from '../../utils/countries';
import { CATEGORY_LABELS, CATEGORY_TO_GROUP, GROUP_COLOURS, GROUP_LABELS } from '../../utils/colours';
import portServicesRaw from '../../data/port-services.json';

const portServices: Record<string, { name: string; description: string }> = portServicesRaw as any;

interface Props {
  country: string;
  bilateral: string | null;
  onSelectTarget: (iso2: string) => void;
  onClose: () => void;
  onClearBilateral: () => void;
}

type Tab = 'outbound' | 'inbound' | 'trends';

export default function CountryPanel({ country, bilateral, onSelectTarget, onClose, onClearBilateral }: Props) {
  const [tab, setTab] = useState<Tab>('outbound');
  const { data: profile, loading } = useJson<CountryProfile>(`/data/countries/${country}.json`);
  const bilateralUrl = bilateral ? `/data/bilateral/${country}-${bilateral}.json` : null;
  const { data: bilat } = useJson<BilateralData>(bilateralUrl);
  const { data: bilatReverse } = useJson<BilateralData>(
    bilateral ? `/data/bilateral/${bilateral}-${country}.json` : null
  );

  const categoryGroupBreakdown = useMemo(() => {
    const obj: Record<string, { count: number; colour: string }> = {};
    if (!profile) return obj;
    const src = tab === 'inbound' ? profile.categoryCountsIn : profile.categoryCountsOut;
    for (const [catId, count] of Object.entries(src || {})) {
      const group = CATEGORY_TO_GROUP[Number(catId)] || 'scan';
      if (!obj[group]) obj[group] = { count: 0, colour: GROUP_COLOURS[group] };
      obj[group].count += count as number;
    }
    return obj;
  }, [profile, tab]);

  const totalForBreakdown = Object.values(categoryGroupBreakdown).reduce((a, b) => a + b.count, 0);

  return (
    <aside className="absolute top-0 right-0 h-full w-full sm:w-[420px] z-20 bg-surface/95 backdrop-blur-md border-l border-border shadow-2xl overflow-y-auto scrollbar-thin">
      <header className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-start justify-between">
        <div>
          <div className="text-3xl leading-none">{flag(country)}</div>
          <h2 className="text-xl font-semibold mt-1">{countryName(country)}</h2>
          <p className="text-xs text-secondary font-mono">{country}</p>
          {bilateral && (
            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-md bg-accent/20 text-xs">
              <span>vs</span>
              <span>
                {flag(bilateral)} {countryName(bilateral)}
              </span>
              <button onClick={onClearBilateral} className="ml-1 text-secondary hover:text-primary" aria-label="Clear bilateral view">
                ✕
              </button>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-secondary hover:text-primary text-2xl leading-none -mt-1" aria-label="Close panel">
          ×
        </button>
      </header>

      {!bilateral && (
        <nav className="flex border-b border-border">
          {(['outbound', 'inbound', 'trends'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t ? 'text-primary border-b-2 border-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      )}

      {loading && <div className="p-6 text-secondary text-sm">Loading…</div>}

      {profile && !bilateral && (
        <div className="p-5 space-y-6">
          <StatRow
            label={tab === 'inbound' ? 'Total inbound attacks' : tab === 'outbound' ? 'Total outbound attacks' : 'Net activity'}
            value={tab === 'inbound' ? profile.inboundTotal : profile.outboundTotal}
          />

          <section>
            <h3 className="text-xs uppercase tracking-wider text-secondary font-semibold mb-3">
              {tab === 'inbound' ? 'Top source countries' : tab === 'outbound' ? 'Top target countries' : 'Daily trend'}
            </h3>
            {tab !== 'trends' ? (
              <div className="space-y-1.5">
                {(tab === 'inbound' ? profile.topInboundSources : profile.topOutboundTargets).slice(0, 6).map((row, i) => {
                  const total = tab === 'inbound' ? profile.inboundTotal : profile.outboundTotal;
                  const pct = total > 0 ? (row.count / total) * 100 : 0;
                  return (
                    <button
                      key={row.country + i}
                      onClick={() => onSelectTarget(row.country)}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center gap-2 text-xs mb-0.5">
                        <span className="w-5">{flag(row.country)}</span>
                        <span className="font-medium group-hover:text-accent">{countryName(row.country)}</span>
                        <span className="ml-auto font-mono text-secondary">{row.count.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-card rounded">
                        <div className="h-full bg-accent/60 rounded group-hover:bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <HourlyTrend data={profile.hourly} />
            )}
          </section>

          {tab !== 'trends' && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-secondary font-semibold mb-3">
                Attack type mix
              </h3>
              <div className="space-y-2">
                {Object.entries(categoryGroupBreakdown)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([g, { count, colour }]) => {
                    const pct = totalForBreakdown > 0 ? (count / totalForBreakdown) * 100 : 0;
                    return (
                      <div key={g}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: colour }} />
                            {GROUP_LABELS[g as keyof typeof GROUP_LABELS]}
                          </span>
                          <span className="font-mono text-secondary">
                            {count.toLocaleString()} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1 rounded" style={{ background: '#1F2937' }}>
                          <div className="h-full rounded" style={{ background: colour, width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {tab === 'outbound' && profile.topSourceIps.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-secondary font-semibold mb-3">Top source IPs</h3>
              <div className="space-y-1">
                {profile.topSourceIps.slice(0, 10).map((ip) => (
                  <div key={ip.ip} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <div className="font-mono text-primary truncate">{ip.ip}</div>
                      <div className="text-secondary truncate text-[10px]">{ip.asnOrg || '—'}</div>
                    </div>
                    <div className="text-right flex items-center gap-2 ml-2 shrink-0">
                      {ip.greynoise && (
                        <span
                          className={`text-[10px] px-1 py-0.5 rounded ${
                            ip.greynoise.classification === 'benign' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                          }`}
                          title={`GreyNoise: ${ip.greynoise.name || 'unknown'}`}
                        >
                          {ip.greynoise.classification}
                        </span>
                      )}
                      <span className="font-mono text-cat-brute">{ip.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {profile.topAsn.length > 0 && tab === 'outbound' && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-secondary font-semibold mb-3">
                Top networks (ASN)
                <InfoIcon text="Autonomous System Number — a unique identifier for a network operator (ISP or cloud provider). Shows which networks host the most attackers." />
              </h3>
              <div className="space-y-1">
                {profile.topAsn.slice(0, 6).map((a, i) => (
                  <div key={i} className="flex justify-between text-xs py-1">
                    <span className="truncate mr-2">{a.name}</span>
                    <span className="font-mono text-secondary shrink-0">{a.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {profile && bilateral && (
        <BilateralDetail
          country={country}
          bilateral={bilateral}
          forward={bilat}
          reverse={bilatReverse}
        />
      )}
    </aside>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-secondary font-semibold">{label}</div>
      <div className="font-mono text-3xl font-semibold text-primary mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

function InfoIcon({ text }: { text: string }) {
  return <i className="info-icon not-italic" title={text}>i</i>;
}

function HourlyTrend({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort();
  if (entries.length === 0) return <p className="text-xs text-secondary">No trend data yet</p>;
  const max = Math.max(...entries.map((e) => e[1]));
  return (
    <div>
      <div className="flex items-end gap-0.5 h-24 mt-2">
        {entries.map(([hour, n]) => (
          <div
            key={hour}
            className="flex-1 bg-accent/60 rounded-t"
            style={{ height: `${(n / max) * 100}%` }}
            title={`${hour}: ${n.toLocaleString()}`}
          />
        ))}
      </div>
      <div className="text-[10px] text-secondary text-center mt-1 font-mono">
        Hourly volume (most recent → oldest)
      </div>
    </div>
  );
}

function BilateralDetail({
  country,
  bilateral,
  forward,
  reverse,
}: {
  country: string;
  bilateral: string;
  forward: BilateralData | null;
  reverse: BilateralData | null;
}) {
  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-lg p-4">
          <div className="text-xs text-secondary">{flag(country)} {countryName(country)} → {countryName(bilateral)}</div>
          <div className="font-mono text-2xl mt-1">{forward?.total?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-xs text-secondary">{flag(bilateral)} {countryName(bilateral)} → {countryName(country)}</div>
          <div className="font-mono text-2xl mt-1">{reverse?.total?.toLocaleString() || 0}</div>
        </div>
      </div>

      {forward?.categoryCounts && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-secondary font-semibold mb-2">
            {countryName(country)} → {countryName(bilateral)} by category
          </h3>
          <CategoryBars counts={forward.categoryCounts} />
        </section>
      )}

      {forward?.topIps && forward.topIps.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-secondary font-semibold mb-2">Top source IPs</h3>
          <div className="space-y-1 text-xs">
            {forward.topIps.slice(0, 8).map((ip) => (
              <div key={ip.ip} className="flex justify-between border-b border-border/50 py-1">
                <span className="font-mono">{ip.ip}</span>
                <span className="text-secondary">{ip.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryBars({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts)
    .map(([id, n]) => ({ id: Number(id), n, label: CATEGORY_LABELS[Number(id)] || id, group: CATEGORY_TO_GROUP[Number(id)] || 'scan' }))
    .sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...entries.map((e) => e.n));
  return (
    <div className="space-y-1.5">
      {entries.map((e) => (
        <div key={e.id}>
          <div className="flex justify-between text-xs">
            <span>{e.label}</span>
            <span className="font-mono text-secondary">{e.n.toLocaleString()}</span>
          </div>
          <div className="h-1 bg-card rounded">
            <div className="h-full rounded" style={{ background: GROUP_COLOURS[e.group], width: `${(e.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export { portServices };
