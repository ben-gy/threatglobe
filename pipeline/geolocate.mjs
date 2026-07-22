// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// MaxMind GeoLite2 lookup wrapper.
// Downloads the GeoLite2-City + GeoLite2-ASN mmdb if missing and loads via mmdb-lib.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar';
import { Reader } from 'mmdb-lib';
import { fetchBuffer, log, __dirname } from './utils.mjs';

const DB_DIR = path.join(__dirname, 'geolite2');
fs.mkdirSync(DB_DIR, { recursive: true });

const CITY_DB = path.join(DB_DIR, 'GeoLite2-City.mmdb');
const ASN_DB = path.join(DB_DIR, 'GeoLite2-ASN.mmdb');

async function downloadAndExtract(edition, license) {
  const url = `https://download.maxmind.com/app/geoip_download?edition_id=${edition}&license_key=${license}&suffix=tar.gz`;
  log(`Downloading ${edition}...`);
  const buf = await fetchBuffer(url, { timeoutMs: 240000 });
  const tgz = path.join(DB_DIR, `${edition}.tar.gz`);
  fs.writeFileSync(tgz, buf);
  // Extract; find the mmdb file inside.
  await tar.x({ file: tgz, cwd: DB_DIR });
  const dirs = fs.readdirSync(DB_DIR).filter((f) => f.startsWith(edition) && fs.statSync(path.join(DB_DIR, f)).isDirectory());
  for (const d of dirs) {
    const full = path.join(DB_DIR, d);
    const mmdb = fs.readdirSync(full).find((f) => f.endsWith('.mmdb'));
    if (mmdb) {
      fs.copyFileSync(path.join(full, mmdb), path.join(DB_DIR, `${edition}.mmdb`));
    }
  }
  fs.unlinkSync(tgz);
  log(`${edition} ready`);
}

export async function ensureDatabases() {
  const license = process.env.MAXMIND_LICENSE_KEY;
  if (!fs.existsSync(CITY_DB) || !fs.existsSync(ASN_DB)) {
    if (!license) {
      log('WARNING: MAXMIND_LICENSE_KEY missing and no local DB. Geo lookups will fail.');
      return { city: null, asn: null };
    }
    if (!fs.existsSync(CITY_DB)) await downloadAndExtract('GeoLite2-City', license);
    if (!fs.existsSync(ASN_DB)) await downloadAndExtract('GeoLite2-ASN', license);
  }
  const cityBuf = fs.readFileSync(CITY_DB);
  const asnBuf = fs.readFileSync(ASN_DB);
  return {
    city: new Reader(cityBuf),
    asn: new Reader(asnBuf),
  };
}

export function lookup(readers, ip) {
  try {
    const city = readers.city ? readers.city.get(ip) : null;
    const asn = readers.asn ? readers.asn.get(ip) : null;
    if (!city) return null;
    return {
      country: city.country?.iso_code || city.registered_country?.iso_code || null,
      countryName: city.country?.names?.en || null,
      city: city.city?.names?.en || null,
      lat: city.location?.latitude ?? null,
      lon: city.location?.longitude ?? null,
      asn: asn?.autonomous_system_number ?? null,
      asnOrg: asn?.autonomous_system_organization ?? null,
    };
  } catch {
    return null;
  }
}
