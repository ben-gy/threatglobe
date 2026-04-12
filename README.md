# ThreatGlobe

A real-time interactive 3D globe visualising global cyber attack activity, aggregated entirely from public threat intelligence feeds. Live at **[threatglobe.benrichardson.dev](https://threatglobe.benrichardson.dev)**.

## Architecture

- **Frontend** — React 18 + TypeScript + Vite + Tailwind, rendered with [react-globe.gl](https://github.com/vasturiano/react-globe.gl). Static SPA, no runtime API calls — all data is pre-computed.
- **Data pipeline** — Node.js scripts in `pipeline/` that hit AbuseIPDB, DShield/SANS ISC, AlienVault OTX, GreyNoise, and MaxMind GeoLite2, then geocode and aggregate everything into static JSON files under `public/data/`.
- **CI/CD** — GitHub Actions runs the pipeline hourly and a separate workflow deploys the site to GitHub Pages on every push to `main`.

## Local development

```bash
# Frontend
npm install
npm run dev

# Pipeline (one-shot, with API keys)
cd pipeline
npm install
ABUSEIPDB_API_KEY=... \
OTX_API_KEY=... \
GREYNOISE_API_KEY=... \
MAXMIND_LICENSE_KEY=... \
node collect.mjs && node aggregate.mjs
```

## Repo secrets

Configure these under **Settings → Secrets → Actions** for the data pipeline workflow:

| Secret | Source |
| ------ | ------ |
| `ABUSEIPDB_API_KEY` | abuseipdb.com → Account → API |
| `OTX_API_KEY` | otx.alienvault.com → Settings |
| `GREYNOISE_API_KEY` | greynoise.io → Account |
| `MAXMIND_LICENSE_KEY` | maxmind.com → License Keys |

## Data sources

See the **About** page on the live site for the full data source rundown, methodology and limitations.

## Attribution

- IP geolocation: [MaxMind GeoLite2](https://www.maxmind.com)
- Country boundaries: [Natural Earth](https://www.naturalearthdata.com) (public domain)
- Threat data: AbuseIPDB, SANS Internet Storm Center, AlienVault OTX, GreyNoise
- Globe rendering: [react-globe.gl](https://github.com/vasturiano/react-globe.gl) (MIT)
