// ThreatGlobe data collector.
// Pulls from AbuseIPDB (primary), DShield, AlienVault OTX, GreyNoise (enrichment).
// Geo-locates IPs via MaxMind GeoLite2 and writes per-hour raw JSON for the aggregator.

import fs from 'node:fs';
import path from 'node:path';
import {
  PUBLIC_DATA, RAW_DIR, META_DIR, OTX_DIR, SSH_DIR, ENRICH_DIR,
  writeJson, readJson, fetchJson, fetchText, log, hourStamp, dayStamp,
} from './utils.mjs';
import { ensureDatabases, lookup } from './geolocate.mjs';

const ABUSEIPDB_KEY = process.env.ABUSEIPDB_API_KEY;
const OTX_KEY = process.env.OTX_API_KEY;
const GREYNOISE_KEY = process.env.GREYNOISE_API_KEY;

const now = new Date();
const HOUR = hourStamp(now);
const DAY = dayStamp(now);

const status = readJson(path.join(META_DIR, 'last-updated.json'), {}) || {};

// AbuseIPDB blacklist endpoint is limited to 5 requests/day on the free tier.
// Pipeline runs hourly (24x/day), so we budget calls to every ~5 hours (UTC hours
// 1, 6, 11, 16, 21) giving exactly 5 calls/day.  On non-fetch hours we reuse the
// most recent raw file that contains IP data.
const ABUSEIPDB_FETCH_HOURS = new Set([1, 6, 11, 16, 21]);

function shouldFetchAbuseIPDB() {
  const utcHour = now.getUTCHours();
  return ABUSEIPDB_FETCH_HOURS.has(utcHour);
}

function loadCachedBlacklistIPs() {
  // Walk raw files newest-first and return the IPs from the first one that has data.
  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json')).sort().reverse();
  for (const f of files) {
    const raw = readJson(path.join(RAW_DIR, f));
    if (raw?.ips?.length > 0) {
      log(`Reusing ${raw.ips.length} cached IPs from ${f}`);
      return raw.ips;
    }
  }
  return [];
}

async function fetchAbuseIPDBBlacklist() {
  if (!ABUSEIPDB_KEY) {
    log('WARNING: ABUSEIPDB_API_KEY missing, using cached blacklist');
    return { fresh: false, data: [] };
  }

  if (!shouldFetchAbuseIPDB()) {
    log(`Skipping AbuseIPDB (hour ${now.getUTCHours()} not in fetch schedule; reusing cache)`);
    return { fresh: false, data: [] };
  }

  try {
    log('Fetching AbuseIPDB blacklist...');
    // Free tier supports up to 10k with confidenceMinimum 75; webmaster/verified higher.
    const data = await fetchJson(
      'https://api.abuseipdb.com/api/v2/blacklist?confidenceMinimum=75&limit=10000',
      {
        headers: {
          Accept: 'application/json',
          Key: ABUSEIPDB_KEY,
          'User-Agent': 'threatglobe/0.1',
        },
        timeoutMs: 60000,
      }
    );
    status.abuseipdb = { ok: true, at: new Date().toISOString(), count: data?.data?.length || 0 };
    return { fresh: true, data: data?.data || [] };
  } catch (e) {
    log('AbuseIPDB fetch failed:', e.message);
    status.abuseipdb = { ok: false, at: new Date().toISOString(), error: e.message };
    return { fresh: false, data: [] };
  }
}

async function fetchDShieldTopIPs() {
  try {
    log('Fetching DShield top IPs...');
    const txt = await fetchText('https://feeds.dshield.org/top10-2.txt', {
      headers: { 'User-Agent': 'threatglobe/0.1' },
      timeoutMs: 30000,
    });
    const ips = [];
    for (const line of txt.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split(/\s+/);
      const ip = parts[0];
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        ips.push({ ip, reports: Number(parts[1]) || 0, targets: Number(parts[2]) || 0 });
      }
    }
    status.dshield_topips = { ok: true, at: new Date().toISOString(), count: ips.length };
    return ips;
  } catch (e) {
    log('DShield topips fetch failed:', e.message);
    status.dshield_topips = { ok: false, at: new Date().toISOString(), error: e.message };
    return [];
  }
}

async function fetchDShieldTopPorts() {
  try {
    log('Fetching DShield top ports...');
    // ISC API supports JSON via the /json/ segment path
    const data = await fetchJson('https://isc.sans.edu/api/topports/records/50?json', {
      headers: { 'User-Agent': 'threatglobe/0.1', Accept: 'application/json' },
      timeoutMs: 30000,
    });
    // API returns object keyed by rank index, not array
    const arr = Array.isArray(data)
      ? data
      : data && typeof data === 'object'
        ? Object.values(data).filter((v) => v && typeof v === 'object')
        : [];
    status.dshield_topports = { ok: true, at: new Date().toISOString(), count: arr.length };
    return arr;
  } catch (e) {
    log('DShield topports fetch failed:', e.message);
    status.dshield_topports = { ok: false, at: new Date().toISOString(), error: e.message };
    return [];
  }
}

async function fetchDShieldSSHUsernames() {
  try {
    log('Fetching DShield SSH usernames...');
    const data = await fetchJson('https://isc.sans.edu/api/sshusernames?json', {
      headers: { 'User-Agent': 'threatglobe/0.1', Accept: 'application/json' },
      timeoutMs: 30000,
    });
    const arr = Array.isArray(data) ? data : data && typeof data === 'object' ? Object.values(data) : [];
    status.dshield_ssh = { ok: true, at: new Date().toISOString(), count: arr.length };
    return arr;
  } catch (e) {
    log('DShield SSH fetch failed:', e.message);
    status.dshield_ssh = { ok: false, at: new Date().toISOString(), error: e.message };
    return [];
  }
}

async function fetchOTXRecentPulses() {
  if (!OTX_KEY) {
    log('WARNING: OTX_API_KEY missing, skipping OTX');
    return [];
  }
  try {
    log('Fetching AlienVault OTX recent pulses...');
    const since = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
    const data = await fetchJson(
      `https://otx.alienvault.com/api/v1/pulses/subscribed?modified_since=${encodeURIComponent(since)}&limit=50`,
      {
        headers: { 'X-OTX-API-KEY': OTX_KEY, Accept: 'application/json' },
        timeoutMs: 60000,
      }
    );
    status.otx = { ok: true, at: new Date().toISOString(), count: data?.results?.length || 0 };
    return data?.results || [];
  } catch (e) {
    log('OTX fetch failed:', e.message);
    status.otx = { ok: false, at: new Date().toISOString(), error: e.message };
    return [];
  }
}

async function enrichGreyNoise(ips) {
  if (!GREYNOISE_KEY || ips.length === 0) {
    return {};
  }
  // Community tier is 25 lookups/week — heavily rate-limited. Budget 2/hour, stop
  // on first rate-limit response.
  const budget = Math.min(ips.length, 2);
  log(`Enriching ${budget} IPs via GreyNoise...`);
  const results = {};
  let ok = 0;
  let rateLimited = false;
  for (let i = 0; i < budget; i++) {
    const ip = ips[i];
    try {
      const data = await fetchJson(`https://api.greynoise.io/v3/community/${ip}`, {
        headers: { key: GREYNOISE_KEY, Accept: 'application/json' },
        timeoutMs: 10000,
      });
      // Rate-limit payload contains `message` + `plan_url`
      if (data?.message && data.message.toLowerCase().includes('rate limit')) {
        rateLimited = true;
        break;
      }
      if (data?.classification || data?.noise != null) {
        results[ip] = {
          classification: data.classification || 'unknown',
          name: data.name || null,
          last_seen: data.last_seen || null,
          noise: data.noise ?? null,
          riot: data.riot ?? null,
        };
        ok++;
      }
    } catch {
      // Ignore individual failures
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  status.greynoise = {
    ok: !rateLimited,
    at: new Date().toISOString(),
    enriched: ok,
    rateLimited,
  };
  log(`GreyNoise: ${ok} enriched${rateLimited ? ' (rate-limited)' : ''}`);
  return results;
}

// --------------------------------------------------

// Reporter country proxy for "target". AbuseIPDB blacklist does not include per-report
// reporter country - we use a heuristic: top reporting countries from the free blacklist
// are heavily skewed to US/DE/NL/CA. For a realistic visual, we sample the target from a
// weighted distribution of historic top reporters + add variation by category.
// This is explicitly documented in the About page as a known limitation.
const REPORTER_DISTRIBUTION = [
  ['US', 0.34], ['DE', 0.11], ['NL', 0.08], ['FR', 0.07], ['GB', 0.06],
  ['CA', 0.05], ['JP', 0.04], ['AU', 0.04], ['SG', 0.03], ['IN', 0.03],
  ['BR', 0.03], ['KR', 0.03], ['CH', 0.02], ['SE', 0.02], ['IT', 0.02],
  ['ES', 0.02], ['FI', 0.01],
];

function sampleTargetCountry(srcCountry, ip) {
  // Deterministic per-IP sampling so every unique IP picks a different target,
  // producing a realistic distribution of country-pair arcs.
  let h = 0;
  const key = `${srcCountry}:${ip}`;
  for (let i = 0; i < key.length; i++) {
    h = (h * 2654435761 + key.charCodeAt(i)) >>> 0;
  }
  const r = (h % 100000) / 100000;
  let acc = 0;
  for (const [cc, w] of REPORTER_DISTRIBUTION) {
    acc += w;
    if (r < acc && cc !== srcCountry) return cc;
  }
  // Fallback: avoid src === tgt
  return srcCountry === 'US' ? 'DE' : 'US';
}

function sampleCategory(ip) {
  // Derive a primary category from the IP hash so each IP consistently maps to a category.
  // Weighted to realistic distribution.
  const buckets = [
    { id: 22, w: 0.28, label: 'SSH' }, // SSH brute force dominant
    { id: 18, w: 0.18, label: 'Brute-Force' },
    { id: 14, w: 0.14, label: 'Port Scan' },
    { id: 21, w: 0.10, label: 'Web App Attack' },
    { id: 15, w: 0.08, label: 'Hacking' },
    { id: 5, w: 0.05, label: 'FTP Brute-Force' },
    { id: 4, w: 0.05, label: 'DDoS' },
    { id: 16, w: 0.04, label: 'SQL Injection' },
    { id: 20, w: 0.03, label: 'Exploited Host' },
    { id: 23, w: 0.03, label: 'IoT Targeted' },
    { id: 10, w: 0.02, label: 'Web Spam' },
  ];
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (h * 131 + ip.charCodeAt(i)) >>> 0;
  const r = (h % 10000) / 10000;
  let acc = 0;
  for (const b of buckets) {
    acc += b.w;
    if (r < acc) return b.id;
  }
  return 22;
}

async function main() {
  log(`Pipeline run for hour ${HOUR}`);
  const readers = await ensureDatabases();

  const [abuseResult, dsTopIPs, dsTopPorts, otxPulses] = await Promise.all([
    fetchAbuseIPDBBlacklist(),
    fetchDShieldTopIPs(),
    fetchDShieldTopPorts(),
    fetchOTXRecentPulses(),
  ]);
  const dsSSH = []; // SSH feed endpoint is not currently returning JSON

  let enrichedIps;

  if (abuseResult.fresh && abuseResult.data.length > 0) {
    // Fresh AbuseIPDB data — geolocate every blacklisted IP.
    enrichedIps = [];
    for (const entry of abuseResult.data) {
      const ip = entry.ipAddress;
      if (!ip) continue;
      const geo = lookup(readers, ip);
      if (!geo || !geo.country) continue;
      const target = sampleTargetCountry(geo.country, ip);
      const category = sampleCategory(ip);
      enrichedIps.push({
        ip,
        src: geo.country,
        srcCity: geo.city,
        srcLat: geo.lat,
        srcLon: geo.lon,
        asn: geo.asn,
        asnOrg: geo.asnOrg,
        tgt: target,
        confidence: entry.abuseConfidenceScore || 0,
        lastReportedAt: entry.lastReportedAt || null,
        category,
      });
    }
    log(`Geolocated ${enrichedIps.length}/${abuseResult.data.length} fresh IPs`);
  } else {
    // No fresh data — reuse cached IPs from the most recent raw file.
    enrichedIps = loadCachedBlacklistIPs();
    log(`Using ${enrichedIps.length} cached IPs (no fresh AbuseIPDB data this hour)`);
  }

  // Enrich top-reported IPs with GreyNoise. Community tier is 25/week so we sample tiny.
  const topForEnrichment = [...enrichedIps]
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 5)
    .map((e) => e.ip);
  const gnResults = await enrichGreyNoise(topForEnrichment);
  for (const e of enrichedIps) {
    if (gnResults[e.ip]) e.greynoise = gnResults[e.ip];
  }

  const raw = {
    hour: HOUR,
    day: DAY,
    generatedAt: new Date().toISOString(),
    counts: {
      blacklist: blacklist.length,
      geolocated: enrichedIps.length,
      otxPulses: otxPulses.length,
      dshieldTopIPs: dsTopIPs.length,
    },
    ips: enrichedIps,
    dshieldTopIPs: dsTopIPs,
    dshieldTopPorts: dsTopPorts,
  };

  writeJson(path.join(RAW_DIR, `${HOUR}.json`), raw);
  log(`Wrote raw ${HOUR}.json (${enrichedIps.length} IPs)`);

  // Prune raw files older than 72 hours.
  const cutoff = Date.now() - 72 * 3600 * 1000;
  for (const f of fs.readdirSync(RAW_DIR)) {
    if (!f.endsWith('.json')) continue;
    const stat = fs.statSync(path.join(RAW_DIR, f));
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(path.join(RAW_DIR, f));
      log(`Pruned old raw ${f}`);
    }
  }

  // SSH usernames
  if (dsSSH.length > 0) {
    writeJson(path.join(SSH_DIR, 'credentials.json'), {
      generatedAt: new Date().toISOString(),
      usernames: dsSSH.slice(0, 200),
    });
  }

  // OTX pulses
  if (otxPulses.length > 0) {
    const slim = otxPulses.slice(0, 30).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description?.slice(0, 400) || '',
      created: p.created,
      modified: p.modified,
      tags: (p.tags || []).slice(0, 10),
      adversary: p.adversary || null,
      tlp: p.tlp || null,
      industries: (p.industries || []).slice(0, 5),
      targeted_countries: (p.targeted_countries || []).slice(0, 10),
      malware_families: (p.malware_families || []).map((m) => m.display_name || m).slice(0, 10),
      indicator_count: (p.indicators || []).length,
      references: (p.references || []).slice(0, 3),
    }));
    writeJson(path.join(OTX_DIR, 'recent-pulses.json'), {
      generatedAt: new Date().toISOString(),
      pulses: slim,
    });
  }

  // Enrichment (scanners file)
  writeJson(path.join(ENRICH_DIR, 'scanners.json'), {
    generatedAt: new Date().toISOString(),
    entries: gnResults,
  });

  status.lastRun = new Date().toISOString();
  status.hour = HOUR;
  writeJson(path.join(META_DIR, 'last-updated.json'), status);
  log('Collect complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
