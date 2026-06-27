import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const h5Url = normalizeUrl(getArg('--h5-url') || getArg('--url') || 'http://127.0.0.1:5207/');
const apiBase = normalizeUrl(getArg('--api-base') || '');
const outputJson = getArg('--output-json') || '';
const durationMs = Number.parseInt(getArg('--duration-ms') || '0', 10);
const intervalMs = Math.max(Number.parseInt(getArg('--interval-ms') || '5000', 10), 500);
const timeoutMs = Math.max(Number.parseInt(getArg('--timeout-ms') || '5000', 10), 500);
const failOnError = process.argv.includes('--fail-on-error');

const startedAt = new Date();
const samples = [];
do {
  samples.push(await runEnvironmentSample());
  if (Date.now() - startedAt.getTime() >= durationMs) break;
  await sleep(intervalMs);
} while (true);

const failures = samples.flatMap((sample) => sample.checks.filter((check) => !check.ok).map((check) => ({
  at: sample.at,
  label: check.label,
  url: check.url,
  status: check.status,
  error: check.error
})));

const report = {
  schemaVersion: 'product-review-environment-guard-v1',
  generatedAt: new Date().toISOString(),
  h5Url,
  apiBase,
  durationMs,
  intervalMs,
  timeoutMs,
  passed: failures.length === 0,
  samples,
  failures,
  guidance: failures.length
    ? 'Treat user review sessions during these failures as real failed sessions; restart a fresh H5/API environment before rerun.'
    : 'Environment stayed reachable for all guard samples.'
};

if (outputJson) {
  await mkdir(path.dirname(outputJson), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  passed: report.passed,
  samples: samples.length,
  failures: failures.length,
  outputJson: outputJson || null
}, null, 2));

if (failOnError && !report.passed) process.exit(1);

async function runEnvironmentSample() {
  const checks = [
    await checkUrl('h5-root', h5Url),
    await checkUrl('h5-proxied-api-health', new URL('/api/health', h5Url).toString())
  ];
  if (apiBase) checks.push(await checkUrl('api-direct-health', healthUrlForApiBase(apiBase)));
  return {
    at: new Date().toISOString(),
    passed: checks.every((check) => check.ok),
    checks
  };
}

async function checkUrl(label, url) {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    });
    const body = await response.text().catch(() => '');
    return {
      label,
      url,
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - started,
      error: '',
      bodySample: body.replace(/\s+/g, ' ').trim().slice(0, 180)
    };
  } catch (error) {
    return {
      label,
      url,
      ok: false,
      status: 0,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
      bodySample: ''
    };
  } finally {
    clearTimeout(timeout);
  }
}

function healthUrlForApiBase(value) {
  const url = new URL(value);
  return `${url.origin}/api/health`;
}

function normalizeUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const url = new URL(text);
  if (!url.pathname || url.pathname === '') url.pathname = '/';
  return url.toString();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getArg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}
