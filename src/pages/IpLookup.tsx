import { useMemo, useState, useEffect } from 'react';
import { useJson } from '../hooks/useDataLoader';
import type { LatestData, CountryProfile } from '../types';
import { flag, countryName } from '../utils/countries';
import { CATEGORY_LABELS, CATEGORY_TO_GROUP, GROUP_COLOURS, GROUP_LABELS } from '../utils/colours';

interface HitRecord {
  ip: string;
  count: number;
  confidence: number;
  asnOrg?: string | null;
  greynoise?: { classification: string; name: string | null } | null;
}

export default function IpLookup() {
  const { data: latest } = useJson<LatestData>('/data/latest.json');
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [hit, setHit] = useState<{ profile: CountryProfile; record: HitRecord } | null>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'miss' | 'hit'>('idle');

  // Load all country profiles on mount for lookup (lazy: only when user searches)
  const countriesToSearch = useMemo(() => {
    if (!latest) return [];
    return Array.from(new Set([
      ...Object.keys(latest.inboundByCountry),
      ...Object.keys(latest.outboundByCountry),
    ]));
  }, [latest]);

  // When user submits, progressively fetch country profiles and search for the IP.
  useEffect(() => {
    if (!searched) return;
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(searched)) {
      setStatus('miss');
      setHit(null);
      return;
    }
    let cancelled = false;
    setStatus('searching');
    setHit(null);
    (async () => {
      for (const cc of countriesToSearch) {
        if (cancelled) return;
        try {
          const res = await fetch(`/data/countries/${cc}.json`);
          if (!res.ok) continue;
          const profile: CountryProfile = await res.json();
          const rec = profile.topSourceIps.find((r) => r.ip === searched);
          if (rec) {
            setHit({ profile, record: rec });
            setStatus('hit');
            return;
          }
        } catch {
          // continue
        }
      }
      if (!cancelled) {
        setStatus('miss');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searched, countriesToSearch]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(query.trim());
  };

  const sampleIps = useMemo(() => {
    if (!latest) return [];
    const set = new Set<string>();
    return []; // Filled in via effect below
  }, [latest]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">IP Lookup</h1>
        <p className="text-secondary text-sm mt-1">
          Paste any IPv4 address and we'll check our cached dataset for recent abuse reports.
          Only IPs present in the latest aggregation are searchable here — for a live lookup, use the external links.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. 185.220.101.1"
          className="flex-1 bg-card border border-border rounded-lg px-4 py-3 font-mono text-primary focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="bg-accent text-primary px-5 py-3 rounded-lg font-medium hover:brightness-110 transition-all"
        >
          Search
        </button>
      </form>

      {status === 'searching' && (
        <div className="mt-6 text-secondary text-sm">Scanning cached dataset…</div>
      )}

      {status === 'hit' && hit && (
        <div className="mt-6 bg-card border border-border rounded-lg p-6">
          <div className="text-xs uppercase tracking-wider text-success font-semibold">Match found</div>
          <div className="font-mono text-2xl mt-1">{hit.record.ip}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Country" value={`${flag(hit.profile.country)} ${countryName(hit.profile.country)}`} />
            <InfoRow label="Network / ASN" value={hit.record.asnOrg || '—'} />
            <InfoRow label="Abuse confidence" value={`${hit.record.confidence}/100`} />
            <InfoRow label="Reports in window" value={hit.record.count.toLocaleString()} />
            {hit.record.greynoise && (
              <InfoRow label="GreyNoise classification" value={`${hit.record.greynoise.classification} ${hit.record.greynoise.name ? `(${hit.record.greynoise.name})` : ''}`} />
            )}
          </div>

          <div className="mt-5 flex gap-2 flex-wrap">
            <a
              href={`https://www.abuseipdb.com/check/${hit.record.ip}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded border border-border hover:border-accent transition-colors"
            >
              AbuseIPDB →
            </a>
            <a
              href={`https://viz.greynoise.io/ip/${hit.record.ip}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded border border-border hover:border-accent transition-colors"
            >
              GreyNoise →
            </a>
            <a
              href={`https://isc.sans.edu/ipinfo/${hit.record.ip}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded border border-border hover:border-accent transition-colors"
            >
              SANS ISC →
            </a>
          </div>
        </div>
      )}

      {status === 'miss' && (
        <div className="mt-6 bg-card border border-border rounded-lg p-6">
          <div className="text-xs uppercase tracking-wider text-secondary font-semibold">Not in cache</div>
          <div className="font-mono text-lg mt-1">{searched}</div>
          <p className="text-secondary text-sm mt-3">
            {!/^(\d{1,3}\.){3}\d{1,3}$/.test(searched)
              ? "That doesn't look like an IPv4 address. Try again."
              : 'This IP is not in the current ThreatGlobe dataset. Check live feeds directly:'}
          </p>
          {/^(\d{1,3}\.){3}\d{1,3}$/.test(searched) && (
            <div className="mt-4 flex gap-2 flex-wrap">
              <a
                href={`https://www.abuseipdb.com/check/${searched}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded border border-border hover:border-accent transition-colors"
              >
                Look up on AbuseIPDB →
              </a>
              <a
                href={`https://viz.greynoise.io/ip/${searched}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded border border-border hover:border-accent transition-colors"
              >
                Check GreyNoise →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-secondary">{label}</div>
      <div className="font-mono text-primary">{value}</div>
    </div>
  );
}
