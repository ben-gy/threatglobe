import { useJson } from '../hooks/useDataLoader';
import type { PipelineStatus } from '../types';

export default function About() {
  const { data: status } = useJson<PipelineStatus>('/data/meta/last-updated.json');

  return (
    <div className="space-y-7 text-[12px] leading-relaxed">
      <section>
        <p className="text-secondary">
          ThreatGlobe is a real-time interactive visualisation of global cyber attack activity, aggregated entirely from
          <b className="text-primary"> public</b> threat intelligence feeds. It's designed to make the scale and shape of internet
          background radiation legible to both security professionals and curious non-specialists.
        </p>
        <p className="text-secondary mt-2">
          This is not proprietary sensor data like NETSCOUT or Cisco Talos. It's a best-effort aggregation of what
          volunteer-run honeypots, crowdsourced abuse reports, and community threat intel feeds are seeing. That distinction
          matters for how you read the numbers — see the caveats below.
        </p>
      </section>

      <section>
        <div className="label-uppercase mb-2">Data sources</div>
        <div className="grid md:grid-cols-2 gap-2.5">
          <SourceCard
            name="AbuseIPDB"
            role="Primary — crowdsourced IP abuse reports"
            powers="Map arcs, country profiles, IP lookup"
            freq="Hourly blacklist pull (up to 10,000 IPs)"
            coverage="Strongest on SSH brute-force and web exploits. Biased toward regions where contributors run infrastructure (US / Europe / East Asia). Does not include UDP-based DDoS."
            link="https://abuseipdb.com"
            status={status?.abuseipdb}
          />
          <SourceCard
            name="DShield / SANS ISC"
            role="Supplementary — volunteer firewall and honeypot logs"
            powers="Port heatmap"
            freq="6-hourly top-ports API"
            coverage="Operational since 2000. Strong on port scanning trends. Volunteer density varies by region."
            link="https://isc.sans.edu"
            status={status?.dshield_topports}
          />
          <SourceCard
            name="AlienVault OTX"
            role="Supplementary — community threat intel pulses"
            powers="CVE context, malware names"
            freq="Every 4 hours"
            coverage="Broadest category coverage (malware C2, phishing, APT). Quality varies — community curated."
            link="https://otx.alienvault.com"
            status={status?.otx}
          />
          <SourceCard
            name="GreyNoise"
            role="Enrichment — internet scanner classification"
            powers="Distinguishing benign scanners from likely malicious"
            freq="Sampled per run (community tier is 25 lookups/week)"
            coverage="Only captures indiscriminate scanners. Cannot see targeted attacks."
            link="https://greynoise.io"
            status={status?.greynoise}
          />
          <SourceCard
            name="MaxMind GeoLite2"
            role="Enrichment — IP geolocation"
            powers="IP → country, city, ASN mapping"
            freq="DB refreshed at pipeline runtime"
            coverage="Country-level ~99% accurate. City-level varies. ASN data highly reliable."
            link="https://www.maxmind.com"
          />
          <SourceCard
            name="Natural Earth"
            role="Static — country polygon boundaries"
            powers="Map rendering and click detection"
            freq="Public domain dataset bundled in repo"
            coverage="110m resolution — simplified for performance."
            link="https://www.naturalearthdata.com"
          />
        </div>
      </section>

      {status && (
        <section>
          <div className="label-uppercase mb-2">Pipeline status</div>
          <div className="bg-bg/40 border border-border rounded p-3 font-mono text-[11px] space-y-1">
            <StatusRow label="LAST RUN" value={status.lastRun || '—'} />
            <StatusRow label="HOUR" value={status.hour || '—'} />
            <StatusRow label="ABUSEIPDB" ok={status.abuseipdb?.ok} detail={status.abuseipdb?.count ? `${status.abuseipdb.count.toLocaleString()} IPs` : status.abuseipdb?.error} />
            <StatusRow label="DSHIELD" ok={status.dshield_topports?.ok} detail={status.dshield_topports?.count ? `${status.dshield_topports.count} ports` : status.dshield_topports?.error} />
            <StatusRow label="OTX" ok={status.otx?.ok} detail={status.otx?.count != null ? `${status.otx.count} pulses` : status.otx?.error} />
            <StatusRow label="GREYNOISE" ok={status.greynoise?.ok} detail={status.greynoise?.enriched != null ? `${status.greynoise.enriched} enriched${(status.greynoise as any).rateLimited ? ' (rate-limited)' : ''}` : undefined} />
          </div>
        </section>
      )}

      <section>
        <div className="label-uppercase mb-2">Methodology</div>
        <div className="space-y-2 text-secondary text-[11px] leading-relaxed">
          <p>
            <b className="text-primary">IP geolocation.</b> Every reported source IP is looked up in MaxMind's GeoLite2-City database.
            Country-level accuracy is about 99%; city/lat-lon less reliable. VPN and proxy traffic is explicitly noted as "origin ≠ attribution".
          </p>
          <p>
            <b className="text-primary">Country-pair flows.</b> AbuseIPDB's blacklist endpoint tells us which IPs are being reported as
            abusive but does not include the actual reporter or target address per report. We approximate the target country by deterministically
            sampling from the historic distribution of top reporting countries (US, DE, NL, FR, GB dominate), so each unique IP maps consistently
            to the same target. <b>This is the single biggest methodological compromise in ThreatGlobe and is made transparent here.</b> For
            authoritative per-victim data, paid feeds (full AbuseIPDB reports, NETSCOUT, Cisco Talos) are required.
          </p>
          <p>
            <b className="text-primary">Multi-hop / relay attribution.</b> Public threat feeds do <i>not</i> expose multi-hop traceroute data. We
            cannot tell when an attacker in country A is relaying through country B to hit country C — that requires inline ISP visibility or
            honeypot jump-host logs. ThreatGlobe is honest about this: every arc represents the IP's <i>geolocation</i>, not its true origin
            or path. Where the source IP belongs to a known cloud / hosting ASN (AWS, GCP, OVH, DigitalOcean, etc.), it's a strong hint that
            the IP is itself a relay rather than the originating attacker — we surface the ASN in the country panel so you can judge.
          </p>
          <p>
            <b className="text-primary">Real-time vs historical.</b> The map distinguishes between <span className="text-live">new</span> arcs
            (appearing within the last polling cycle, ~1 minute) and historical arcs (already part of the dataset). New arcs are drawn brighter
            and animate briefly before settling into static, solid lines. Historical arcs are static. This means a perfectly steady map = stable
            background activity; flickers and bright lines = something just changed.
          </p>
          <p>
            <b className="text-primary">Attack categories.</b> AbuseIPDB ships with 23 official categories. We map each IP to a primary category
            using a deterministic hash seeded to a realistic distribution (SSH brute-force dominates, then port scanning, web app attacks, etc),
            then colour-group them into five visual buckets for the map.
          </p>
          <p>
            <b className="text-primary">Noise filtering.</b> Where GreyNoise classifies a source IP as a benign scanner (Shodan, Censys, academic
            research), we surface that label so you can distinguish background radiation from genuinely malicious activity.
          </p>
        </div>
      </section>

      <section>
        <div className="label-uppercase mb-2">Limitations and caveats</div>
        <ul className="list-disc pl-5 space-y-1.5 text-secondary text-[11px] leading-relaxed">
          <li><b className="text-primary">Not comprehensive.</b> A sample of global activity, not the full picture.</li>
          <li><b className="text-primary">No volumetric DDoS data.</b> Public sources primarily capture scanning, brute-force and application-layer attacks.</li>
          <li><b className="text-primary">Target country is approximated.</b> See Methodology — arcs show "regional traffic", not "victim X was hit by attacker Y".</li>
          <li><b className="text-primary">Reporter bias.</b> AbuseIPDB data skews toward regions where contributors are most active.</li>
          <li><b className="text-primary">Attribution ≠ origin.</b> Botnets use compromised infrastructure worldwide.</li>
          <li><b className="text-primary">Latency.</b> Data is at minimum 1 hour old due to the pipeline schedule.</li>
        </ul>
      </section>

      <section>
        <div className="label-uppercase mb-2">Attribution</div>
        <div className="text-[11px] text-secondary space-y-0.5">
          <div>This product includes <a className="text-accent hover:underline" href="https://www.maxmind.com" target="_blank" rel="noreferrer">GeoLite2 data created by MaxMind</a>.</div>
          <div>SANS Technology Institute · Internet Storm Center.</div>
          <div>AbuseIPDB · AlienVault OTX · GreyNoise · Natural Earth (public domain) · Globe.gl (MIT).</div>
        </div>
      </section>
    </div>
  );
}

function SourceCard({
  name,
  role,
  powers,
  freq,
  coverage,
  link,
  status,
}: {
  name: string;
  role: string;
  powers: string;
  freq: string;
  coverage: string;
  link: string;
  status?: { ok: boolean; at: string } | null;
}) {
  return (
    <div className="bg-bg/40 border border-border rounded p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[1px]">{name}</h3>
        {status !== undefined && (
          <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${status?.ok ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
            {status?.ok ? 'LIVE' : 'STALE'}
          </span>
        )}
      </div>
      <p className="text-[10px] text-accent mt-0.5">{role}</p>
      <dl className="mt-2 text-[10px] space-y-1">
        <Field label="Powers" value={powers} />
        <Field label="Frequency" value={freq} />
        <Field label="Coverage" value={coverage} />
      </dl>
      <a href={link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] text-accent hover:underline font-mono uppercase tracking-wider">
        {link.replace('https://', '')} →
      </a>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted uppercase tracking-wider text-[9px] font-semibold">{label}</dt>
      <dd className="text-primary/90">{value}</dd>
    </div>
  );
}

function StatusRow({ label, value, ok, detail }: { label: string; value?: string; ok?: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted uppercase tracking-wider">{label}</span>
      <span>
        {ok !== undefined && (
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${ok ? 'bg-success' : 'bg-danger'}`} />
        )}
        <span className="text-primary">{value || detail || (ok === undefined ? '' : ok ? 'ok' : 'failed')}</span>
      </span>
    </div>
  );
}
