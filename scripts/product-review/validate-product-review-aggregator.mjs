import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const round = Number.parseInt(getArg('--round') || '91', 10);
const keepTemp = hasArg('--keep-temp');
const repoRoot = process.cwd();
const aggregatorPath = path.join(repoRoot, 'scripts/product-review/product-review-aggregator.mjs');
const reportDir = path.join(repoRoot, 'reports/product-review');
const reportPath = getArg('--report') || path.join(reportDir, 'aggregator-validation.json');
const generatedAt = new Date().toISOString();
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'compcheck-product-review-aggregator-'));
const personaSlugs = [
  'first-time-consumer',
  'time-pressed-consumer',
  'parent-child-snack',
  'sugar-control',
  'allergy-sensitive',
  'generic-ai-skeptic'
];

let result = {
  schemaVersion: 'product-review-aggregator-validation-v1',
  generatedAt,
  round,
  passed: false,
  tempRoot,
  reportPath,
  assertions: [],
  output: null,
  error: null
};

try {
  if (!existsSync(aggregatorPath)) {
    throw new Error(`Aggregator not found: ${aggregatorPath}`);
  }

  const fixture = await writeFixture(tempRoot, round);
  const run = spawnSync(process.execPath, [
    aggregatorPath,
    `--round=${round}`,
    `--checkpoint=${fixture.checkpointPath}`,
    `--output-dir=${fixture.outputDir}`
  ], {
    cwd: tempRoot,
    encoding: 'utf8'
  });

  result.output = {
    status: run.status,
    stdout: run.stdout.trim(),
    stderr: run.stderr.trim(),
    aggregationPath: path.join(fixture.outputDir, 'aggregation.json'),
    topFixQueuePath: path.join(fixture.outputDir, 'top-fix-queue.json')
  };

  assert(run.status === 0, `aggregator exited with ${run.status}`, result);

  const summary = JSON.parse(await readFile(result.output.aggregationPath, 'utf8'));
  const sessionPaths = summary.sessions.map((session) => session.filePath);
  const expectedSessionPaths = [...fixture.codexSessionPaths, ...fixture.deepseekSessionPaths];

  assert(summary.input.rawOnly === true, 'aggregation marks rawOnly=true', result);
  assert(summary.input.completedSessions === 12, 'exactly twelve completed raw user sessions are counted', result);
  assert(summary.metrics.sessions === 12, 'exactly twelve sessions are normalized', result);
  assert(JSON.stringify(sessionPaths.sort()) === JSON.stringify(expectedSessionPaths.sort()), 'sessions are exactly raw/codex and raw/deepseek round files', result);
  assert(sessionPaths.every(isCurrentRoundRawReviewPath), 'every normalized session path is current-round raw codex/deepseek', result);
  assert(!sessionPaths.some((filePath) => /env-smoke|environment|screenshots|summary\.json|raw\/codex\/[^/]+\/final-review/.test(filePath)), 'environment smoke, summaries, and legacy raw folders are excluded', result);

  assert(summary.metrics.providers.codex === 6, 'Codex provider count is 6', result);
  assert(summary.metrics.providers.deepseek === 6, 'DeepSeek provider count is 6', result);
  assert(summary.providerMetrics.deepseek.sessions === 6, 'DeepSeek provider metrics ignore single-session summary and count six raw sessions', result);
  assert(summary.metrics.schemaDeviations === 1, 'one schema-deviation session is recorded', result);
  assert(summary.providerMetrics.codex.schemaDeviationSessions === 1, 'Codex schema deviation is attributed to Codex', result);
  assert(summary.providerMetrics.deepseek.schemaDeviationSessions === 0, 'DeepSeek strict session has no schema deviation', result);
  assert(Array.isArray(summary.schemaDeviationSessions) && summary.schemaDeviationSessions.length === 1, 'top-level schemaDeviationSessions lists the Codex drift', result);
  assert(summary.schemaDeviationSessions[0]?.source === fixture.codexSessionPaths[0], 'schema deviation source remains the raw Codex session', result);
  assert(summary.schemaDeviationSessions[0]?.deviations.includes('tasks_missing_completed_flags'), 'Codex task schema drift is recorded', result);

  const issueSources = summary.issueClusters.flatMap((cluster) => cluster.examples.map((example) => example.source));
  assert(issueSources.every(isCurrentRoundRawReviewPath), 'issue cluster evidence only references raw user sessions', result);
  assert(summary.failedSessions.every(isCurrentRoundRawReviewPath), 'failed sessions preserve only current-round raw review paths', result);

  result.passed = true;
} catch (error) {
  result.error = {
    message: error.message,
    stack: error.stack
  };
} finally {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  if (!keepTemp) await rm(tempRoot, { recursive: true, force: true });
}

if (!result.passed) {
  console.error(`Product review aggregator validation failed. Report: ${reportPath}`);
  if (result.error?.message) console.error(result.error.message);
  process.exit(1);
}

console.log(`Product review aggregator validation passed. Report: ${reportPath}`);

function getArg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function hasArg(name) {
  return process.argv.includes(name);
}

function assert(condition, message, target) {
  target.assertions.push({
    message,
    passed: Boolean(condition)
  });
  if (!condition) throw new Error(message);
}

async function writeFixture(rootDir, roundNumber) {
  const rawCodexDir = path.join(rootDir, `reports/product-review/raw/codex/round-${roundNumber}`);
  const rawDeepseekDir = path.join(rootDir, `reports/product-review/raw/deepseek/round-${roundNumber}`);
  const legacyCodexDir = path.join(rootDir, 'reports/product-review/raw/codex/first-time-consumer');
  const roundDir = path.join(rootDir, `reports/product-review/round-${roundNumber}`);
  const screenshotDir = path.join(rootDir, `reports/product-review/screenshots/round-${roundNumber}/env-smoke-profile-sugar`);
  const oldRoundRawDir = path.join(rootDir, `reports/product-review/raw/deepseek/round-${roundNumber - 1}`);

  await Promise.all([
    mkdir(rawCodexDir, { recursive: true }),
    mkdir(rawDeepseekDir, { recursive: true }),
    mkdir(legacyCodexDir, { recursive: true }),
    mkdir(roundDir, { recursive: true }),
    mkdir(screenshotDir, { recursive: true }),
    mkdir(oldRoundRawDir, { recursive: true })
  ]);

  const codexSessionPaths = personaSlugs.map((slug) => `reports/product-review/raw/codex/round-${roundNumber}/${slug}.json`);
  const deepseekSessionPaths = personaSlugs.map((slug) => `reports/product-review/raw/deepseek/round-${roundNumber}/${slug}.json`);
  const failedRawPath = `reports/product-review/raw/codex/round-${roundNumber}/failed-user-session.json`;
  const schemaDriftCodexSession = {
    provider: 'codex',
    persona: 'schema drift Codex user',
    verdict: {
      status: 'usable',
      score: 3
    },
    scores: {
      trustAndEvidence: 3,
      overall: 3
    },
    taskResults: {
      firstUse: {
        id: 'task-1',
        status: 'completed',
        stepCount: 2
      }
    },
    problems: [
      {
        severity: 'P2',
        page: 'review infrastructure',
        title: 'Codex returned task results without completed booleans',
        evidence: ['fixture schema drift']
      }
    ]
  };
  const strictSession = (provider, slug) => ({
    provider,
    persona: `${provider} ${slug}`,
    verdict: 'pass',
    scores: {
      easeOfUse: 5,
      decisionClarity: 4,
      trust: 4,
      comparisonValue: 4,
      retentionValue: 4,
      overallValue: 4
    },
    tasks: [
      {
        id: 'task-1',
        completed: true,
        status: 'completed',
        stepCount: 2
      }
    ],
    issues: [
      {
        severity: 'P3',
        page: 'report',
        title: 'Minor copy issue',
        evidence: ['fixture raw session']
      }
    ]
  });
  const environmentSmoke = {
    provider: 'codex',
    persona: 'env-smoke-profile-sugar',
    verdict: 'reject',
    scores: {
      overallValue: 1
    },
    tasks: [
      {
        id: 'env-smoke',
        completed: false,
        status: 'failed'
      }
    ],
    issues: [
      {
        severity: 'P0',
        page: 'environment',
        title: 'This env smoke issue must not enter aggregation',
        evidence: ['fixture environment smoke']
      }
    ]
  };

  await Promise.all([
    ...codexSessionPaths.map((sessionPath, index) => writeJson(
      path.join(rootDir, sessionPath),
      index === 0 ? schemaDriftCodexSession : strictSession('codex', personaSlugs[index])
    )),
    ...deepseekSessionPaths.map((sessionPath, index) => writeJson(
      path.join(rootDir, sessionPath),
      strictSession('deepseek', personaSlugs[index])
    )),
    writeJson(path.join(rawDeepseekDir, 'summary.json'), {
      provider: 'deepseek',
      summary: 'must be ignored',
      sessions: [
        {
          filePath: deepseekSessionPaths[0],
          note: 'simulates a DeepSeek --only summary that would otherwise under-count raw sessions'
        }
      ]
    }),
    writeJson(path.join(legacyCodexDir, 'final-review.json'), schemaDriftCodexSession),
    writeJson(path.join(oldRoundRawDir, 'strict-deepseek.json'), strictSession('deepseek', 'old-round')),
    writeJson(path.join(roundDir, 'environment.json'), environmentSmoke),
    writeJson(path.join(roundDir, 'env-smoke-profile-sugar.json'), environmentSmoke),
    writeJson(path.join(screenshotDir, 'result.json'), environmentSmoke)
  ]);

  const checkpointPath = path.join(rootDir, '.codex/state/product-review-checkpoint.json');
  await mkdir(path.dirname(checkpointPath), { recursive: true });
  await writeJson(checkpointPath, {
    round: roundNumber,
    completedSessions: [
      `reports/product-review/fixtures/round-${roundNumber}/sample-catalog-public.json`,
      `reports/product-review/round-${roundNumber}/environment.json`,
      `reports/product-review/round-${roundNumber}/env-smoke-profile-sugar.json`,
      `reports/product-review/screenshots/round-${roundNumber}/env-smoke-profile-sugar/result.json`,
      ...codexSessionPaths,
      deepseekSessionPaths[0],
      `reports/product-review/raw/deepseek/round-${roundNumber}/summary.json`,
      'reports/product-review/raw/codex/first-time-consumer/final-review.json',
      `reports/product-review/raw/deepseek/round-${roundNumber - 1}/strict-deepseek.json`
    ],
    failedSessions: [
      `reports/product-review/round-${roundNumber}/env-smoke-profile-sugar.json`,
      `reports/product-review/raw/deepseek/round-${roundNumber}/summary.json`,
      `reports/product-review/raw/deepseek/round-${roundNumber - 1}/strict-deepseek.json`,
      failedRawPath
    ],
    environment: {
      wechatDevtoolsCoverageGap: 'fixture coverage gap should remain a coverage gap, not a session'
    }
  });

  return {
    checkpointPath,
    outputDir: path.join(rootDir, `reports/product-review/round-${roundNumber}`),
    codexSessionPaths,
    deepseekSessionPaths
  };
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function isCurrentRoundRawReviewPath(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  return new RegExp(`^reports/product-review/raw/(codex|deepseek)/round-${round}/[^/]+\\.json$`, 'u').test(normalized)
    && !normalized.endsWith('/summary.json');
}
