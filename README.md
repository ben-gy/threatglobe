# ThreatGlobe

An interactive 3D globe visualising global cyber attack activity, aggregated entirely from public threat intelligence feeds. The dataset is a periodic snapshot, not a live stream. Live at **[threatglobe.benrichardson.dev](https://threatglobe.benrichardson.dev)**.

## Architecture

- **Frontend** — React 18 + TypeScript + Vite + Tailwind, rendered with [react-globe.gl](https://github.com/vasturiano/react-globe.gl). Static SPA, no runtime API calls — all data is pre-computed.
- **Data pipeline** — Node.js scripts in `pipeline/` that pull keyless feeds (Blocklist.de, Feodo Tracker, IPsum, DShield/SANS ISC), geolocate via MaxMind GeoLite2, and aggregate everything into static JSON files under `public/data/`. Keyed sources (AbuseIPDB, AlienVault OTX, GreyNoise) are **disabled** via `KEYED_SOURCES_DISABLED` in `pipeline/collect.mjs` — their secret API keys can't ship with a client-side site, so those feeds are switched off pending a snapshot-vs-rethink decision.
- **CI/CD** — GitHub Actions runs the pipeline as a quarterly snapshot (plus on pipeline changes) and a separate workflow deploys the site to GitHub Pages on every push to `main`.

## Local development

```bash
# Frontend
npm install
npm run dev

# Pipeline (one-shot; keyless feeds only)
cd pipeline
npm install
MAXMIND_LICENSE_KEY=... \
node collect.mjs && node aggregate.mjs
```

## Repo secrets

Configure these under **Settings → Secrets → Actions** for the data pipeline workflow:

| Secret | Source | Status |
| ------ | ------ | ------ |
| `MAXMIND_LICENSE_KEY` | maxmind.com → License Keys | active (pipeline-side geolocation) |
| `ABUSEIPDB_API_KEY` | abuseipdb.com → Account → API | unused — source disabled |
| `OTX_API_KEY` | otx.alienvault.com → Settings | unused — source disabled |
| `GREYNOISE_API_KEY` | greynoise.io → Account | unused — source disabled |

## Data sources

See the **About** page on the live site for the full data source rundown, methodology and limitations.

## Attribution

- IP geolocation: [MaxMind GeoLite2](https://www.maxmind.com)
- Country boundaries: [Natural Earth](https://www.naturalearthdata.com) (public domain)
- Threat data: AbuseIPDB, SANS Internet Storm Center, AlienVault OTX, GreyNoise
- Globe rendering: [react-globe.gl](https://github.com/vasturiano/react-globe.gl) (MIT)

## license

[GNU Affero General Public License v3.0 or later](./LICENSE), with an attribution
requirement added under section 7(b) — see
[ADDITIONAL-TERMS.md](./ADDITIONAL-TERMS.md).

In short: you may run, modify, redistribute and even sell this, but if you
distribute it — or run a modified version where other people can reach it — you
have to publish your source under the same licence and keep the attribution. A
separate commercial licence without those obligations is available on request:
<hi@ben.gy>.

Third-party components keep their own licences — see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
