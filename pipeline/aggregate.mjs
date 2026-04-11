// ThreatGlobe aggregator. Reads raw hourly JSONs and produces site-ready summary files.
import fs from 'node:fs';
import path from 'node:path';
import {
  PUBLIC_DATA, RAW_DIR, DAILY_DIR, COUNTRIES_DIR, BILATERAL_DIR, PORTS_DIR, META_DIR,
  writeJson, readJson, log, dayStamp,
} from './utils.mjs';

const CATEGORY_LABELS = {
  1: 'DNS Compromise', 2: 'DNS Poisoning', 3: 'Fraud Orders', 4: 'DDoS Attack',
  5: 'FTP Brute-Force', 6: 'Ping of Death', 7: 'Phishing', 8: 'Fraud VoIP',
  9: 'Open Proxy', 10: 'Web Spam', 11: 'Email Spam', 12: 'Blog Spam',
  14: 'Port Scan', 15: 'Hacking', 16: 'SQL Injection', 17: 'Spoofing',
  18: 'Brute-Force', 19: 'Bad Web Bot', 20: 'Exploited Host', 21: 'Web App Attack',
  22: 'SSH', 23: 'IoT Targeted',
};

// Map AbuseIPDB categories to one of our 5 visual groups.
const CATEGORY_GROUP = {
  5: 'brute', 18: 'brute', 22: 'brute',
  4: 'ddos', 6: 'ddos',
  1: 'malware', 2: 'malware', 7: 'malware', 9: 'malware', 11: 'malware', 12: 'malware', 20: 'malware', 23: 'malware', 3: 'malware', 8: 'malware', 17: 'malware',
  14: 'scan', 15: 'scan', 19: 'scan',
  10: 'web', 16: 'web', 21: 'web',
};

function readRawHours() {
  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json')).sort();
  return files.map((f) => ({
    file: f,
    data: readJson(path.join(RAW_DIR, f)),
  })).filter((x) => x.data);
}

function main() {
  const raw = readRawHours();
  if (raw.length === 0) {
    log('No raw data yet; nothing to aggregate');
    return;
  }
  const latestRaw = raw[raw.length - 1].data;
  log(`Aggregating ${raw.length} raw hours, latest = ${latestRaw.hour}`);

  // ---------- latest.json ----------
  // Country-pair arcs for most recent hour (capped to top ~200 by volume).
  const pairMap = new Map();
  const categoryCounts = {};
  const inboundByCountry = {};
  const outboundByCountry = {};
  let topPortsFromDshield = latestRaw.dshieldTopPorts || [];

  for (const e of latestRaw.ips) {
    const key = `${e.src}|${e.tgt}|${e.category}`;
    const cur = pairMap.get(key) || { src: e.src, tgt: e.tgt, category: e.category, count: 0, confidence: 0 };
    cur.count += 1;
    cur.confidence += e.confidence || 0;
    pairMap.set(key, cur);

    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    outboundByCountry[e.src] = (outboundByCountry[e.src] || 0) + 1;
    inboundByCountry[e.tgt] = (inboundByCountry[e.tgt] || 0) + 1;
  }

  const pairs = [...pairMap.values()]
    .map((p) => ({ ...p, confidence: Math.round(p.confidence / p.count), group: CATEGORY_GROUP[p.category] || 'scan' }))
    .sort((a, b) => b.count - a.count);

  const totalAttacks = latestRaw.ips.length;
  const topSource = Object.entries(outboundByCountry).sort((a, b) => b[1] - a[1])[0];
  const topTarget = Object.entries(inboundByCountry).sort((a, b) => b[1] - a[1])[0];
  const topPort = topPortsFromDshield[0]?.targetport || topPortsFromDshield[0]?.port || null;

  const latest = {
    hour: latestRaw.hour,
    generatedAt: latestRaw.generatedAt,
    totalAttacks,
    topSource: topSource?.[0] || null,
    topTarget: topTarget?.[0] || null,
    topPort,
    categoryCounts,
    pairs: pairs.slice(0, 200),
    inboundByCountry,
    outboundByCountry,
  };
  writeJson(path.join(PUBLIC_DATA, 'latest.json'), latest);
  log(`Wrote latest.json (${pairs.length} unique pairs, ${totalAttacks} attacks)`);

  // ---------- global-summary.json (rolling 30d; here we use what we have) ----------
  const globalCategoryCounts = {};
  const globalInbound = {};
  const globalOutbound = {};
  const hourSeries = [];
  for (const h of raw) {
    const sub = { hour: h.data.hour, total: h.data.ips.length, byCategory: {} };
    for (const e of h.data.ips) {
      globalCategoryCounts[e.category] = (globalCategoryCounts[e.category] || 0) + 1;
      globalInbound[e.tgt] = (globalInbound[e.tgt] || 0) + 1;
      globalOutbound[e.src] = (globalOutbound[e.src] || 0) + 1;
      sub.byCategory[e.category] = (sub.byCategory[e.category] || 0) + 1;
    }
    hourSeries.push(sub);
  }
  const globalSummary = {
    generatedAt: new Date().toISOString(),
    hoursIncluded: raw.length,
    categoryCounts: globalCategoryCounts,
    topSources: Object.entries(globalOutbound).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([country, count]) => ({ country, count })),
    topTargets: Object.entries(globalInbound).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([country, count]) => ({ country, count })),
    hourSeries,
  };
  writeJson(path.join(PUBLIC_DATA, 'global-summary.json'), globalSummary);

  // ---------- country profiles ----------
  const countryData = new Map();
  for (const h of raw) {
    for (const e of h.data.ips) {
      for (const cc of [e.src, e.tgt]) {
        if (!countryData.has(cc)) {
          countryData.set(cc, {
            country: cc,
            outboundTotal: 0,
            inboundTotal: 0,
            outboundTargets: {},
            inboundSources: {},
            categoryCountsOut: {},
            categoryCountsIn: {},
            topAsn: {},
            topIps: new Map(),
            hourly: {},
          });
        }
      }
      const srcProf = countryData.get(e.src);
      srcProf.outboundTotal += 1;
      srcProf.outboundTargets[e.tgt] = (srcProf.outboundTargets[e.tgt] || 0) + 1;
      srcProf.categoryCountsOut[e.category] = (srcProf.categoryCountsOut[e.category] || 0) + 1;
      if (e.asnOrg) srcProf.topAsn[e.asnOrg] = (srcProf.topAsn[e.asnOrg] || 0) + 1;
      const ipAcc = srcProf.topIps.get(e.ip) || { ip: e.ip, count: 0, asnOrg: e.asnOrg, confidence: 0, greynoise: e.greynoise || null };
      ipAcc.count += 1;
      ipAcc.confidence = Math.max(ipAcc.confidence, e.confidence || 0);
      srcProf.topIps.set(e.ip, ipAcc);
      srcProf.hourly[h.data.hour] = (srcProf.hourly[h.data.hour] || 0) + 1;

      const tgtProf = countryData.get(e.tgt);
      tgtProf.inboundTotal += 1;
      tgtProf.inboundSources[e.src] = (tgtProf.inboundSources[e.src] || 0) + 1;
      tgtProf.categoryCountsIn[e.category] = (tgtProf.categoryCountsIn[e.category] || 0) + 1;
    }
  }

  // Fresh dir
  for (const f of fs.readdirSync(COUNTRIES_DIR)) fs.unlinkSync(path.join(COUNTRIES_DIR, f));
  for (const [cc, prof] of countryData.entries()) {
    const topIps = [...prof.topIps.values()].sort((a, b) => b.count - a.count).slice(0, 25);
    const out = {
      country: cc,
      outboundTotal: prof.outboundTotal,
      inboundTotal: prof.inboundTotal,
      topOutboundTargets: Object.entries(prof.outboundTargets).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([country, count]) => ({ country, count })),
      topInboundSources: Object.entries(prof.inboundSources).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([country, count]) => ({ country, count })),
      categoryCountsOut: prof.categoryCountsOut,
      categoryCountsIn: prof.categoryCountsIn,
      topAsn: Object.entries(prof.topAsn).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      topSourceIps: topIps,
      hourly: prof.hourly,
    };
    writeJson(path.join(COUNTRIES_DIR, `${cc}.json`), out);
  }
  log(`Wrote ${countryData.size} country profiles`);

  // ---------- bilateral ----------
  for (const f of fs.readdirSync(BILATERAL_DIR)) fs.unlinkSync(path.join(BILATERAL_DIR, f));
  const bilateralMap = new Map();
  for (const h of raw) {
    for (const e of h.data.ips) {
      const key = `${e.src}-${e.tgt}`;
      if (!bilateralMap.has(key)) {
        bilateralMap.set(key, {
          src: e.src, tgt: e.tgt, total: 0, categoryCounts: {}, hourly: {}, topIps: new Map(),
        });
      }
      const b = bilateralMap.get(key);
      b.total += 1;
      b.categoryCounts[e.category] = (b.categoryCounts[e.category] || 0) + 1;
      b.hourly[h.data.hour] = (b.hourly[h.data.hour] || 0) + 1;
      const ipAcc = b.topIps.get(e.ip) || { ip: e.ip, count: 0, confidence: e.confidence };
      ipAcc.count += 1;
      b.topIps.set(e.ip, ipAcc);
    }
  }
  const topBilateral = [...bilateralMap.values()].sort((a, b) => b.total - a.total).slice(0, 50);
  for (const b of topBilateral) {
    writeJson(path.join(BILATERAL_DIR, `${b.src}-${b.tgt}.json`), {
      ...b,
      topIps: [...b.topIps.values()].sort((x, y) => y.count - x.count).slice(0, 20),
    });
  }
  log(`Wrote ${topBilateral.length} bilateral files`);

  // ---------- ports top50.json ----------
  const ports = (latestRaw.dshieldTopPorts || []).map((p) => ({
    port: Number(p.targetport || p.number || p.port || 0),
    rank: Number(p.rank || 0),
    service: p.service || null,
    records: Number(p.records || p.count || 0),
    targets: Number(p.targets || 0),
    sources: Number(p.sources || 0),
  })).filter((p) => p.port > 0).slice(0, 50);
  writeJson(path.join(PORTS_DIR, 'top50.json'), {
    generatedAt: new Date().toISOString(),
    ports,
  });

  // ---------- daily aggregate ----------
  const dayMap = new Map();
  for (const h of raw) {
    const day = h.data.day || h.data.hour?.slice(0, 10);
    if (!day) continue;
    if (!dayMap.has(day)) dayMap.set(day, { day, total: 0, byCategory: {}, bySource: {}, byTarget: {} });
    const d = dayMap.get(day);
    for (const e of h.data.ips) {
      d.total += 1;
      d.byCategory[e.category] = (d.byCategory[e.category] || 0) + 1;
      d.bySource[e.src] = (d.bySource[e.src] || 0) + 1;
      d.byTarget[e.tgt] = (d.byTarget[e.tgt] || 0) + 1;
    }
  }
  for (const [day, d] of dayMap.entries()) {
    writeJson(path.join(DAILY_DIR, `${day}.json`), d);
  }

  log('Aggregate complete');
}

main();
