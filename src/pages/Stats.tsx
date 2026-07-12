import { useJson } from '../hooks/useDataLoader';
import type { GlobalSummary, LatestData } from '../types';
import { flag, countryName } from '../utils/countries';
import { CATEGORY_TO_GROUP, GROUP_COLOURS, GROUP_LABELS, CATEGORY_LABELS } from '../utils/colours';

export default function Stats() {
  const { data: summary } = useJson<GlobalSummary>('/data/global-summary.json');
  const { data: latest } = useJson<LatestData>('/data/latest.json');

  if (!summary || !latest) {
    return <div className="text-secondary text-xs">Loading…</div>;
  }

  const topSources = summary.topSources.slice(0, 12);
  const topTargets = summary.topTargets.slice(0, 12);

  const groupBreakdown: Record<string, number> = {};
  for (const [cat, n] of Object.entries(summary.categoryCounts)) {
    const g = CATEGORY_TO_GROUP[Number(cat)] || 'scan';
    groupBreakdown[g] = (groupBreakdown[g] || 0) + n;
  }
  const totalByCategory = Object.values(groupBreakdown).reduce((a, b) => a + b, 0);

  const topCat = Object.entries(latest.categoryCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const topCatLabel = topCat ? CATEGORY_LABELS[Number(topCat[0])] : 'unknown';

  return (
    <div className="space-y-5">
      <p className="text-secondary text-xs leading-relaxed">
        Rolling aggregate across {summary.hoursIncluded} hour{summary.hoursIncluded === 1 ? '' : 's'} of data.
        Counts reflect attacks reported to public threat-intel feeds and aggregated by ThreatGlobe.
      </p>

      <div className="bg-bg/40 border border-accent/40 rounded p-4">
        <div className="label-uppercase text-accent">Attack of the day</div>
        <h3 className="text-sm font-semibold mt-1.5">
          {countryName(latest.topSource || '—')} → {countryName(latest.topTarget || '—')} dominates with{' '}
          {latest.totalAttacks.toLocaleString()} reports
        </h3>
        <p className="text-secondary text-[11px] mt-1">
          Top attack type: <span className="text-primary">{topCatLabel}</span>
          {topCat ? ` (${Number(topCat[1]).toLocaleString()})` : ''}.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Leaderboard title="Most aggressive sources" rows={topSources} colour="#f59e0b" />
        <Leaderboard title="Most attacked targets" rows={topTargets} colour="#a78bfa" />
      </div>

      <section>
        <div className="label-uppercase mb-2">Attack type distribution</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(GROUP_LABELS).map(([g, label]) => {
            const n = groupBreakdown[g] || 0;
            const pct = totalByCategory > 0 ? (n / totalByCategory) * 100 : 0;
            return (
              <div key={g} className="bg-bg/40 border border-border rounded p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: GROUP_COLOURS[g as keyof typeof GROUP_COLOURS] }} />
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary">{label}</div>
                </div>
                <div className="font-mono text-lg">{n.toLocaleString()}</div>
                <div className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{pct.toFixed(1)}%</div>
                <div className="bar-track mt-1.5">
                  <div
                    className="bar-fill"
                    style={{
                      background: GROUP_COLOURS[g as keyof typeof GROUP_COLOURS],
                      width: `${pct}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="label-uppercase mb-2">Raw category counts</div>
        <div className="grid md:grid-cols-3 gap-x-5 gap-y-0.5 text-[11px] font-mono">
          {Object.entries(summary.categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, n]) => (
              <div key={cat} className="flex justify-between py-1 border-b border-border/40">
                <span className="text-secondary uppercase tracking-wider text-[10px]">{CATEGORY_LABELS[Number(cat)] || `Cat ${cat}`}</span>
                <span className="text-primary">{n.toLocaleString()}</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

function Leaderboard({ title, rows, colour }: { title: string; rows: { country: string; count: number }[]; colour: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="bg-bg/40 border border-border rounded p-4">
      <div className="label-uppercase mb-2">{title}</div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.country}>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-4 text-right text-muted font-mono">{i + 1}</span>
              <span className="text-base">{flag(r.country)}</span>
              <span className="flex-1 truncate text-primary">{countryName(r.country)}</span>
              <span className="font-mono text-secondary">{r.count.toLocaleString()}</span>
            </div>
            <div className="bar-track ml-7 mt-0.5">
              <div className="bar-fill" style={{ width: `${(r.count / max) * 100}%`, background: colour }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
