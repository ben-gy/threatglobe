import { useJson } from '../hooks/useDataLoader';
import type { GlobalSummary, LatestData } from '../types';
import { flag, countryName } from '../utils/countries';
import { CATEGORY_TO_GROUP, GROUP_COLOURS, GROUP_LABELS, CATEGORY_LABELS } from '../utils/colours';

export default function Stats() {
  const { data: summary } = useJson<GlobalSummary>('/data/global-summary.json');
  const { data: latest } = useJson<LatestData>('/data/latest.json');

  if (!summary || !latest) {
    return <div className="p-8 text-secondary">Loading…</div>;
  }

  const topSources = summary.topSources.slice(0, 15);
  const topTargets = summary.topTargets.slice(0, 15);

  const groupBreakdown: Record<string, number> = {};
  for (const [cat, n] of Object.entries(summary.categoryCounts)) {
    const g = CATEGORY_TO_GROUP[Number(cat)] || 'scan';
    groupBreakdown[g] = (groupBreakdown[g] || 0) + n;
  }
  const totalByCategory = Object.values(groupBreakdown).reduce((a, b) => a + b, 0);

  const attackOfDay = deriveAttackOfDay(summary, latest);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Leaderboards & Stats</h1>
        <p className="text-secondary text-sm mt-1 max-w-2xl">
          Rolling aggregate across {summary.hoursIncluded} hour{summary.hoursIncluded === 1 ? '' : 's'} of data. Counts reflect
          attacks reported to AbuseIPDB and aggregated by ThreatGlobe.
        </p>
      </header>

      <div className="bg-gradient-to-br from-accent/20 via-card to-surface border border-accent/40 rounded-xl p-5">
        <div className="text-xs uppercase tracking-wider text-accent font-semibold">Attack of the day</div>
        <h2 className="text-xl font-semibold mt-1">{attackOfDay.title}</h2>
        <p className="text-secondary text-sm mt-1">{attackOfDay.description}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Leaderboard title="Most aggressive source countries" rows={topSources} colour="#FF6B35" />
        <Leaderboard title="Most attacked target countries" rows={topTargets} colour="#9B5DE5" />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Attack type distribution</h2>
        <div className="grid md:grid-cols-5 gap-3">
          {Object.entries(GROUP_LABELS).map(([g, label]) => {
            const n = groupBreakdown[g] || 0;
            const pct = totalByCategory > 0 ? (n / totalByCategory) * 100 : 0;
            return (
              <div key={g} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: GROUP_COLOURS[g as keyof typeof GROUP_COLOURS] }} />
                  <div className="text-xs font-medium">{label}</div>
                </div>
                <div className="font-mono text-2xl">{n.toLocaleString()}</div>
                <div className="text-xs text-secondary mt-1">{pct.toFixed(1)}% of traffic</div>
                <div className="h-1 rounded mt-2 bg-bg">
                  <div
                    className="h-full rounded"
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
        <h2 className="text-lg font-semibold mb-3">Raw category counts</h2>
        <div className="grid md:grid-cols-3 gap-x-6 gap-y-1 text-xs">
          {Object.entries(summary.categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, n]) => (
              <div key={cat} className="flex justify-between py-1 border-b border-border/40">
                <span>{CATEGORY_LABELS[Number(cat)] || `Category ${cat}`}</span>
                <span className="font-mono text-secondary">{n.toLocaleString()}</span>
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
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">{title}</h2>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.country}>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-6 text-right text-secondary font-mono">{i + 1}.</span>
              <span className="text-lg">{flag(r.country)}</span>
              <span className="flex-1 truncate">{countryName(r.country)}</span>
              <span className="font-mono text-secondary">{r.count.toLocaleString()}</span>
            </div>
            <div className="h-1 bg-bg rounded ml-8 mt-1">
              <div className="h-full rounded" style={{ width: `${(r.count / max) * 100}%`, background: colour }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function deriveAttackOfDay(summary: GlobalSummary, latest: LatestData) {
  const topTarget = latest.topTarget;
  const topSource = latest.topSource;
  const totalCategories = Object.entries(latest.categoryCounts).sort((a, b) => Number(b[1]) - Number(a[1]));
  const topCat = totalCategories[0];
  const topCatLabel = topCat ? CATEGORY_LABELS[Number(topCat[0])] : 'unknown';
  const total = latest.totalAttacks;
  return {
    title: `${countryName(topSource || '—')} generating ${total.toLocaleString()} attacks against ${countryName(topTarget || '—')}`,
    description: `Dominant attack type in the last hour: ${topCatLabel}${topCat ? ` (${topCat[1].toLocaleString()} reports)` : ''}. Across ${summary.hoursIncluded} hour${
      summary.hoursIncluded === 1 ? '' : 's'
    } of data, ${summary.topSources[0]?.country ? countryName(summary.topSources[0].country) : '—'} leads as the top source country overall.`,
  };
}
