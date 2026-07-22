// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import { useEffect, useMemo, useState } from 'react';
import { useJson } from '../hooks/useDataLoader';
import type { LatestData, CountryProfile } from '../types';
import { flag, countryName } from '../utils/countries';

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

  const countriesToSearch = useMemo(() => {
    if (!latest) return [];
    return Array.from(new Set([
      ...Object.keys(latest.inboundByCountry),
      ...Object.keys(latest.outboundByCountry),
    ]));
  }, [latest]);

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
        } catch { /* continue */ }
      }
      if (!cancelled) setStatus('miss');
    })();
    return () => {
      cancelled = true;
    };
  }, [searched, countriesToSearch]);

  return (
    <div>
      <p className="text-secondary text-[11px] leading-relaxed mb-4">
        Paste any IPv4 address and we'll check our cached dataset for recent abuse reports.
        Only IPs present in the latest aggregation are searchable here — for a live lookup, use the external links.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(query.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="185.220.101.1"
          className="flex-1 bg-bg border border-border rounded px-3 py-2.5 font-mono text-primary text-[12px] focus:outline-none focus:border-accent placeholder:text-muted"
        />
        <button
          type="submit"
          className="chip active px-4"
        >
          SEARCH
        </button>
      </form>

      {status === 'searching' && (
        <div className="mt-4 text-secondary text-[11px] uppercase tracking-wider font-mono">Scanning cached dataset…</div>
      )}

      {status === 'hit' && hit && (
        <div className="mt-4 bg-bg/40 border border-success/40 rounded p-4">
          <div className="label-uppercase text-success">Match found</div>
          <div className="font-mono text-lg mt-1">{hit.record.ip}</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Country" value={`${flag(hit.profile.country)} ${countryName(hit.profile.country)}`} />
            <Field label="Network / ASN" value={hit.record.asnOrg || '—'} />
            <Field label="Abuse confidence" value={`${hit.record.confidence}/100`} />
            <Field label="Reports in window" value={hit.record.count.toLocaleString()} />
            {hit.record.greynoise && (
              <Field label="GreyNoise" value={`${hit.record.greynoise.classification}${hit.record.greynoise.name ? ` (${hit.record.greynoise.name})` : ''}`} />
            )}
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Ext href={`https://www.abuseipdb.com/check/${hit.record.ip}`}>AbuseIPDB</Ext>
            <Ext href={`https://viz.greynoise.io/ip/${hit.record.ip}`}>GreyNoise</Ext>
            <Ext href={`https://isc.sans.edu/ipinfo/${hit.record.ip}`}>SANS ISC</Ext>
          </div>
        </div>
      )}

      {status === 'miss' && (
        <div className="mt-4 bg-bg/40 border border-border rounded p-4">
          <div className="label-uppercase">Not in cache</div>
          <div className="font-mono text-base mt-1">{searched}</div>
          <p className="text-secondary text-[11px] mt-2">
            {!/^(\d{1,3}\.){3}\d{1,3}$/.test(searched)
              ? "That doesn't look like an IPv4 address."
              : 'This IP is not in the current ThreatGlobe dataset. Check live feeds:'}
          </p>
          {/^(\d{1,3}\.){3}\d{1,3}$/.test(searched) && (
            <div className="mt-3 flex gap-2 flex-wrap">
              <Ext href={`https://www.abuseipdb.com/check/${searched}`}>AbuseIPDB</Ext>
              <Ext href={`https://viz.greynoise.io/ip/${searched}`}>GreyNoise</Ext>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-uppercase">{label}</div>
      <div className="font-mono text-primary text-[12px] mt-0.5">{value}</div>
    </div>
  );
}

function Ext({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="chip">
      {children} →
    </a>
  );
}
