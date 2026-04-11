import { useJson } from '../hooks/useDataLoader';
import type { PipelineStatus } from '../types';

export default function About() {
  const { data: status } = useJson<PipelineStatus>('/data/meta/last-updated.json');

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-4xl font-semibold">About ThreatGlobe</h1>
        <p className="mt-3 text-secondary leading-relaxed max-w-3xl">
          ThreatGlobe is a real-time interactive 3D visualisation of global cyber attack activity, aggregated entirely
          from <b>public</b> threat intelligence feeds. It's designed to make the scale and shape of internet
          background radiation legible to both security professionals and curious non-specialists.
        </p>
        <p className="mt-3 text-secondary leading-relaxed max-w-3xl">
          This is not proprietary sensor data like NETSCOUT or Cisco Talos. It's a best-effort aggregation of what
          <i> volunteer-run honeypots, crowdsourced abuse reports, and community threat intel feeds are seeing</i>.
          That distinction matters for how you read the numbers — see the caveats below.
        </p>
      </header>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Data sources</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <SourceCard
            name="AbuseIPDB"
            role="Primary — crowdsourced IP abuse reports"
            powers="Globe arcs, country profiles, IP lookup"
            freq="Hourly blacklist pull (up to 10,000 IPs)"
            coverage="Strongest on SSH brute-force and web exploits. Biased toward regions where contributors run infrastructure (US / Europe / East Asia). Does not include UDP-based DDoS."
            link="https://abuseipdb.com"
            status={status?.abuseipdb}
          />
          <SourceCard
            name="DShield / SANS ISC"
            role="Supplementary — volunteer firewall and honeypot logs"
            powers="Port heatmap, port trends"
            freq="Daily feed + 6-hourly top-ports API"
            coverage="Operational since 2000. Strong on port scanning trends. Volunteer-density varies by region."
            link="https://isc.sans.edu"
            status={status?.dshield_topports}
          />
          <SourceCard
            name="AlienVault OTX"
            role="Supplementary — community threat intel pulses"
            powers="CVE context, malware family names, adversary attribution"
            freq="Every 4 hours"
            coverage="Broadest category coverage (malware C2, phishing, APT infrastructure). Quality varies — community curated."
            link="https://otx.alienvault.com"
            status={status?.otx}
          />
          <SourceCard
            name="GreyNoise"
            role="Enrichment — internet scanner classification"
            powers="Labelling known benign scanners vs likely malicious"
            freq="Sampled per run (community tier is 25 lookups/week)"
            coverage="Only captures indiscriminate scanners. Cannot see targeted attacks. Primary value is filtering out background noise."
            link="https://greynoise.io"
            status={status?.greynoise}
          />
          <SourceCard
            name="MaxMind GeoLite2"
            role="Enrichment — IP geolocation"
            powers="IP → country, city, ASN mapping (country-level accuracy ~99%)"
            freq="Database refreshed on pipeline runs; MaxMind updates the DB every 2 weeks"
            coverage="Country-level is reliable. City-level varies. ASN data is highly reliable."
            link="https://www.maxmind.com"
          />
          <SourceCard
            name="Natural Earth"
            role="Static — country polygon boundaries"
            powers="Globe country rendering and click detection"
            freq="Public domain dataset bundled in repo"
            coverage="110m resolution — simplified for 3D performance."
            link="https://www.naturalearthdata.com"
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Pipeline status</h2>
        {status ? (
          <div className="bg-card border border-border rounded-lg p-5 text-sm font-mono space-y-2">
            <StatusRow label="Last run" value={status.lastRun || '—'} />
            <StatusRow label="Current hour" value={status.hour || '—'} />
            <StatusRow label="AbuseIPDB" ok={status.abuseipdb?.ok} detail={status.abuseipdb?.count ? `${status.abuseipdb.count.toLocaleString()} IPs` : status.abuseipdb?.error} />
            <StatusRow label="DShield top ports" ok={status.dshield_topports?.ok} detail={status.dshield_topports?.count ? `${status.dshield_topports.count} ports` : status.dshield_topports?.error} />
            <StatusRow label="AlienVault OTX" ok={status.otx?.ok} detail={status.otx?.count != null ? `${status.otx.count} pulses` : status.otx?.error} />
            <StatusRow
              label="GreyNoise"
              ok={status.greynoise?.ok}
              detail={status.greynoise?.enriched != null ? `${status.greynoise.enriched} enriched${(status.greynoise as any).rateLimited ? ' (rate-limited)' : ''}` : undefined}
            />
          </div>
        ) : (
          <div className="text-secondary">Loading status…</div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Methodology</h2>
        <div className="space-y-3 text-secondary leading-relaxed">
          <p>
            <b className="text-primary">IP geolocation.</b> We look up every reported source IP in MaxMind's GeoLite2-City
            database. Country-level accuracy is about 99%; city and lat/lon are less reliable, especially in
            developing regions. VPN and proxy traffic is explicitly noted as "origin ≠ attribution".
          </p>
          <p>
            <b className="text-primary">Country-pair flows.</b> AbuseIPDB's blacklist endpoint tells us which IPs are being
            reported as abusive, but it does not include the actual reporter country or target address for each
            report. We approximate the target country by sampling deterministically from the historic distribution of
            top reporting countries (US, Germany, Netherlands, France, UK dominate) — weighted so that each unique IP
            maps consistently to the same target. <b>This is the biggest methodological compromise in ThreatGlobe
            and is made transparent here.</b> For authoritative per-victim data, paid feeds (e.g. full AbuseIPDB
            reports, NETSCOUT, Cisco Talos) are required.
          </p>
          <p>
            <b className="text-primary">Attack categories.</b> AbuseIPDB reports ship with 23 official categories. We map each
            IP to a primary category using a deterministic hash seeded to a realistic distribution (SSH brute-force
            dominates, followed by port scanning, web app attacks, and so on), then colour-group them into five
            visual buckets (brute-force, DDoS, malware/C2, scanning, web attacks) for the globe.
          </p>
          <p>
            <b className="text-primary">Noise filtering.</b> Where GreyNoise classifies a source IP as a benign scanner
            (Shodan, Censys, academic research), we surface that label in the country panel so you can distinguish
            "background radiation" from genuinely malicious activity.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Limitations and caveats</h2>
        <ul className="list-disc pl-5 space-y-3 text-secondary leading-relaxed">
          <li>
            <b className="text-primary">Not comprehensive.</b> This is a sample of global attack activity, not the full
            picture. Only attacks reported to these platforms are included.
          </li>
          <li>
            <b className="text-primary">No volumetric DDoS data.</b> Unlike NETSCOUT (which sees inline ISP traffic), public
            sources primarily capture scanning, brute-force, and application-layer attacks. True volumetric DDoS is
            underrepresented.
          </li>
          <li>
            <b className="text-primary">Target country is approximated.</b> See Methodology. The direction of arcs should be
            read as "traffic flowing between regions", not "victim X was hit by attacker Y".
          </li>
          <li>
            <b className="text-primary">Reporter bias.</b> AbuseIPDB data is biased toward regions and infrastructure types
            where contributors are most active.
          </li>
          <li>
            <b className="text-primary">Attribution ≠ origin.</b> A source country for an IP does not mean that country's
            government or citizens are responsible. Botnets use compromised infrastructure worldwide.
          </li>
          <li>
            <b className="text-primary">Latency.</b> Data is at minimum 1 hour old due to the pipeline schedule.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Attribution & licensing</h2>
        <div className="text-sm text-secondary space-y-1">
          <div>
            AbuseIPDB —{' '}
            <a className="text-accent hover:underline" href="https://www.abuseipdb.com/terms-of-service" target="_blank" rel="noreferrer">
              Terms of service
            </a>
          </div>
          <div>DShield / SANS Technology Institute — Internet Storm Center</div>
          <div>
            MaxMind — This product includes GeoLite2 data created by MaxMind, available from{' '}
            <a className="text-accent hover:underline" href="https://www.maxmind.com" target="_blank" rel="noreferrer">
              maxmind.com
            </a>
            .
          </div>
          <div>
            AlienVault OTX —{' '}
            <a className="text-accent hover:underline" href="https://otx.alienvault.com/api" target="_blank" rel="noreferrer">
              API terms
            </a>
          </div>
          <div>
            GreyNoise —{' '}
            <a className="text-accent hover:underline" href="https://greynoise.io/terms" target="_blank" rel="noreferrer">
              Terms
            </a>
          </div>
          <div>Natural Earth — public domain</div>
          <div>Globe.gl — MIT License</div>
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
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{name}</h3>
        {status !== undefined && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${status?.ok ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
            {status?.ok ? 'live' : 'stale'}
          </span>
        )}
      </div>
      <p className="text-xs text-accent mt-1">{role}</p>
      <dl className="mt-3 text-xs space-y-1.5">
        <Field label="Powers" value={powers} />
        <Field label="Frequency" value={freq} />
        <Field label="Coverage" value={coverage} />
      </dl>
      <a href={link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-accent hover:underline">
        {link.replace('https://', '')} →
      </a>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-secondary uppercase tracking-wider text-[10px] font-semibold">{label}</dt>
      <dd className="text-primary/90">{value}</dd>
    </div>
  );
}

function StatusRow({ label, value, ok, detail }: { label: string; value?: string; ok?: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-secondary">{label}</span>
      <span className="text-primary">
        {ok !== undefined && (
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${ok ? 'bg-success' : 'bg-danger'}`} />
        )}
        {value || detail || (ok === undefined ? '' : ok ? 'ok' : 'failed')}
      </span>
    </div>
  );
}
