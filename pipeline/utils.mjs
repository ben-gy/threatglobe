import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, '..');
export const PUBLIC_DATA = path.join(ROOT, 'public', 'data');
export const RAW_DIR = path.join(PUBLIC_DATA, 'raw');
export const DAILY_DIR = path.join(PUBLIC_DATA, 'daily');
export const COUNTRIES_DIR = path.join(PUBLIC_DATA, 'countries');
export const BILATERAL_DIR = path.join(PUBLIC_DATA, 'bilateral');
export const PORTS_DIR = path.join(PUBLIC_DATA, 'ports');
export const META_DIR = path.join(PUBLIC_DATA, 'meta');
export const OTX_DIR = path.join(PUBLIC_DATA, 'otx');
export const SSH_DIR = path.join(PUBLIC_DATA, 'ssh');
export const ENRICH_DIR = path.join(PUBLIC_DATA, 'enrichment');
export const PIPELINE_STATE = path.join(PUBLIC_DATA, 'meta', 'last-updated.json');

for (const dir of [PUBLIC_DATA, RAW_DIR, DAILY_DIR, COUNTRIES_DIR, BILATERAL_DIR, PORTS_DIR, META_DIR, OTX_DIR, SSH_DIR, ENRICH_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

export function fetchJson(url, { headers = {}, timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location, { headers, timeoutMs }).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        try {
          resolve(JSON.parse(buf.toString('utf-8')));
        } catch (e) {
          reject(new Error(`Bad JSON from ${url}: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms: ${url}`));
    });
  });
}

export function fetchText(url, { headers = {}, timeoutMs = 30000, gzip = false } = {}) {
  return new Promise((resolve, reject) => {
    const reqHeaders = gzip ? { ...headers, 'Accept-Encoding': 'gzip' } : headers;
    const req = https.get(url, { headers: reqHeaders }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, { headers, timeoutMs, gzip }).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      const stream = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms: ${url}`));
    });
  });
}

export function fetchBuffer(url, { headers = {}, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location, { headers, timeoutMs }).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Timeout: ${url}`)));
  });
}

export function log(...args) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}]`, ...args);
}

export function hourStamp(d = new Date()) {
  return d.toISOString().slice(0, 13).replace('T', '-');
}

export function dayStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
