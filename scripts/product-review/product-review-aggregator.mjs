import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const round = Number.parseInt(getArg('--round') || '1', 10);
const checkpointPath = getArg('--checkpoint') || '.codex/state/product-review-checkpoint.json';
const outputDir = getArg('--output-dir') || `reports/product-review/round-${round}`;
const generatedAt = new Date().toISOString();

const checkpoint = await readJson(checkpointPath);
const discoveredSessions = await discoverRoundSessions(round);
const candidateCompletedSessions = uniquePaths([
  ...(checkpoint.completedSessions || []),
  ...discoveredSessions
])
  .map((filePath) => String(filePath || '').trim())
  .filter(Boolean)
  .filter((filePath) => isCurrentRoundRawReviewSession(filePath))
  .filter((filePath) => path.basename(filePath) !== 'summary.json')
  .filter((filePath) => existsSync(filePath));

const completedSessions = [];
const discoveredFailedSessions = [];
for (const filePath of candidateCompletedSessions) {
  const raw = await readJson(filePath);
  if (isIncompleteOrStoppedReviewSession(raw)) {
    discoveredFailedSessions.push(filePath);
    continue;
  }
  completedSessions.push(filePath);
}

const failedSessions = uniquePaths([
  ...(checkpoint.failedSessions || []),
  ...discoveredFailedSessions
])
  .map((filePath) => String(filePath || '').trim())
  .filter(Boolean)
  .filter((filePath) => isCurrentRoundRawReviewSession(filePath));

if (!completedSessions.length) {
  throw new Error(`No completed sessions found in ${checkpointPath}`);
}

const sessions = [];
for (const filePath of completedSessions) {
  const raw = await readJson(filePath);
  sessions.push(normalizeSession(filePath, raw));
}

const allIssues = sessions.flatMap((session) => session.issues);
const issueClusters = clusterIssues(allIssues);
const topFixQueue = buildTopFixQueue(issueClusters);
const taskFunnel = buildTaskFunnel(sessions);
const summary = {
  schemaVersion: 'product-review-aggregation-v1',
  round,
  generatedAt,
  input: {
    checkpointPath,
    completedSessions: completedSessions.length,
    failedSessions: failedSessions.length,
    rawOnly: true
  },
  metrics: {
    sessions: sessions.length,
    providers: countBy(sessions, (session) => session.provider),
    verdicts: countBy(sessions, (session) => session.verdict),
    severity: countBy(allIssues, (issue) => issue.severity),
    rejectedOrNoGoSessions: sessions.filter((session) => ['reject', 'no_go'].includes(session.verdict)).length,
    schemaDeviations: sessions.filter((session) => session.schemaDeviations.length).length
  },
  providerMetrics: buildProviderMetrics(sessions),
  sessions,
  issueClusters,
  providerCommonIssues: {
    codex: providerCommonIssues(issueClusters, 'codex'),
    deepseek: providerCommonIssues(issueClusters, 'deepseek')
  },
  crossProviderConfirmedIssues: issueClusters.filter((cluster) => cluster.providers.codex && cluster.providers.deepseek),
  providerDisagreements: issueClusters.filter((cluster) => Boolean(cluster.providers.codex) !== Boolean(cluster.providers.deepseek)),
  severityIssueList: buildSeverityIssueList(allIssues),
  schemaDeviationSessions: buildSchemaDeviationSessions(sessions),
  taskFunnel,
  mostCommonAbandonPoints: buildAbandonPoints(sessions, issueClusters),
  lowestScorePages: buildLowestScorePages(allIssues),
  lowestValueFeatures: buildLowestValueFeatures(allIssues),
  missingCoreUserValue: buildMissingCoreUserValue(issueClusters),
  genericAiValueGaps: buildGenericAiValueGaps(allIssues),
  featureRecommendations: buildFeatureRecommendations(issueClusters),
  uiRefactorPriorities: buildUiRefactorPriorities(allIssues, issueClusters),
  topFixQueue,
  coverageGaps: [
    ...new Set([
      ...(checkpoint.coverageGaps || []),
      checkpoint.environment?.wechatDevtoolsCoverageGap,
      failedSessions.length ? 'Some failed or invalid review attempts are preserved outside the completed session set.' : ''
    ].filter(Boolean))
  ],
  failedSessions
};

await mkdir(outputDir, { recursive: true });
const jsonPath = path.join(outputDir, 'aggregation.json');
const mdPath = path.join(outputDir, 'aggregation.md');
const queuePath = path.join(outputDir, 'top-fix-queue.json');
await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
await writeFile(queuePath, `${JSON.stringify(topFixQueue, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(summary), 'utf8');
console.log(`Product review aggregation written: ${jsonPath}`);
console.log(`Top fix queue written: ${queuePath}`);

function getArg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function discoverRoundSessions(roundNumber) {
  const discovered = [];
  for (const provider of ['codex', 'deepseek']) {
    const dir = `reports/product-review/raw/${provider}/round-${roundNumber}`;
    if (!existsSync(dir)) continue;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.json') || entry.name === 'summary.json') continue;
      if (entry.name.endsWith('.tmp.json')) continue;
      discovered.push(path.join(dir, entry.name));
    }
  }
  return discovered;
}

function uniquePaths(paths) {
  return [...new Set(paths.map((item) => String(item || '').trim()).filter(Boolean))];
}

function normalizeSession(filePath, raw) {
  const provider = String(raw.provider || (filePath.includes('/deepseek/') ? 'deepseek' : 'codex')).trim() || 'unknown';
  const personaSlug = inferPersonaSlug(filePath);
  const persona = normalizePersona(raw.persona, personaSlug);
  const rawIssues = extractRawIssues(raw);
  const scores = normalizeScores(raw);
  const tasks = normalizeTasks(raw);
  return {
    provider,
    personaSlug,
    persona,
    filePath,
    reviewMode: raw.reviewMode || raw.method?.type || raw.review_context?.method || raw.setup?.method || '',
    verdict: normalizeVerdict(extractVerdictValue(raw)),
    score: normalizeOverallScore(raw),
    scores,
    tasks,
    taskStats: normalizeTaskStats(tasks),
    trustSignals: normalizeTrustSignals(raw, scores, tasks),
    schemaDeviations: schemaDeviations(raw),
    issues: rawIssues.map((issue, index) => normalizeIssue({
      issue,
      index,
      provider,
      personaSlug,
      filePath
    }))
  };
}

function normalizePersona(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'object') {
    return cleanText(value.name || value.description || value.id || value.label || value.title || value);
  }
  return String(value).trim() || fallback;
}

function normalizeScores(raw) {
  const source = raw.scores && typeof raw.scores === 'object' && !Array.isArray(raw.scores) ? raw.scores : {};
  const scores = { ...source };
  const taskScores = extractTaskScores(raw);
  const namedScores = {
    ...source,
    ...(raw.summary?.scoresByTask && typeof raw.summary.scoresByTask === 'object' ? raw.summary.scoresByTask : {})
  };
  const assign = (target, keys) => {
    if (Number.isFinite(Number(scores[target]))) return;
    for (const key of keys) {
      const value = Number(namedScores[key]);
      if (Number.isFinite(value)) {
        scores[target] = value;
        return;
      }
    }
  };
  assign('easeOfUse', [
    'easeOfUse',
    'firstOpenClarity',
    'firstUseClarity',
    'firstOpenAndStart',
    'firstOpen',
    'speedForPersona'
  ]);
  assign('decisionClarity', [
    'decisionClarity',
    'singleProductDecision',
    'evidenceUsefulness',
    'trustAndEvidence',
    '单商品决策',
    'single_product_decision'
  ]);
  assign('trust', [
    'trust',
    'trustAndEvidence',
    'insufficientInformationHandling',
    'informationInsufficientHandling',
    'insufficientInformation',
    '信息不足',
    'information_insufficient',
    'insufficient_information'
  ]);
  assign('comparisonValue', ['comparisonValue', 'comparison', '商品对比', 'product_comparison']);
  assign('retentionValue', ['retentionValue', 'retention', '留存']);
  assign('overallValue', ['overallValue', 'overall', 'productDifferentiation', 'genericAiDifferentiation', '产品替代性', 'product_alternative', 'product_substitutability']);
  const taskFallbacks = {
    easeOfUse: ['task-1'],
    decisionClarity: ['task-2'],
    trust: ['task-2', 'task-3', 'task-4'],
    comparisonValue: ['task-5'],
    retentionValue: ['task-7'],
    overallValue: ['task-8']
  };
  for (const [target, taskIds] of Object.entries(taskFallbacks)) {
    if (Number.isFinite(Number(scores[target]))) continue;
    const values = taskIds.map((taskId) => taskScores.get(taskId)).filter(Number.isFinite);
    if (values.length) {
      scores[target] = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
    }
  }
  const verdictScore = Number(raw.verdict?.score ?? raw.verdict?.overallScore ?? raw.score ?? raw.overallScore ?? raw.summary?.overallScore ?? raw.summary?.averageScore ?? raw.overall?.score);
  if (!Number.isFinite(Number(scores.overallValue)) && Number.isFinite(verdictScore)) {
    scores.overallValue = verdictScore;
  }
  return scores;
}

function extractTaskScores(raw) {
  const scores = new Map();
  const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  tasks.forEach((task, index) => {
    const taskId = normalizeTaskId(
      task.taskId || task.id || task.task_id || task.task || task.taskArea || task.name || task.title || task['覆盖任务'] || `task-${index + 1}`,
      index
    );
    const score = Number(task.score ?? task.scores?.overall ?? task.score_1_to_5);
    if (Number.isFinite(score)) scores.set(taskId, score);
  });
  return scores;
}

function inferPersonaSlug(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/raw/codex/round-')) return path.basename(normalized, '.json');
  if (normalized.includes('/raw/codex/')) return normalized.split('/raw/codex/')[1]?.split('/')[0] || 'unknown';
  if (normalized.includes('/raw/deepseek/round-')) return path.basename(normalized, '.json');
  return path.basename(path.dirname(normalized));
}

function isCurrentRoundRawReviewSession(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return new RegExp(`reports/product-review/raw/(codex|deepseek)/round-${round}/[^/]+\\.json$`, 'u').test(normalized)
    && path.basename(normalized) !== 'summary.json'
    && !path.basename(normalized).endsWith('.tmp.json');
}

function isIncompleteOrStoppedReviewSession(raw) {
  const statusText = cleanText([
    raw.status,
    raw.verdict,
    raw.reviewMode,
    raw.blockedReason,
    raw.reason,
    raw.coverageGap
  ].filter(Boolean).join(' ')).toLowerCase();
  const taskCount = Array.isArray(raw.tasks) ? raw.tasks.length
    : Array.isArray(raw.taskResults) ? raw.taskResults.length
    : Array.isArray(raw.task_results) ? raw.task_results.length
    : Number.isFinite(Number(raw.taskStats?.total)) ? Number(raw.taskStats.total)
    : 0;
  const hasTaskEvidence = taskCount > 0;
  const explicitlyStopped = /blocked|not executed|stopped|interrupted|aborted|cancelled|disabled|not_reviewed|停止|中断|取消/u.test(statusText);
  return raw.completed === false && explicitlyStopped && !hasTaskEvidence;
}

function normalizeVerdict(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return 'unknown';
  if (/reject|no-go|no_go|not[_ -]?ready|major[_ -]?revision|不建议|不能视为|不适合|fail|失败/.test(text)) {
    return text.includes('no-go') || text.includes('no_go') ? 'no_go' : 'reject';
  }
  if (/minor[_ -]?revision|usable|可用/.test(text)) return 'pass';
  if (/pass|通过|recommend|建议进入/.test(text)) return 'pass';
  return 'reviewed';
}

function normalizeOverallScore(raw) {
  const direct = Number(raw.score ?? raw.overallScore);
  if (Number.isFinite(direct)) return direct;
  const containers = [raw.verdict, raw.overallVerdict, raw.overallResult, raw.overallAssessment, raw.overall, raw.summary]
    .filter((item) => item && typeof item === 'object');
  for (const item of containers) {
    const score = Number(item.score ?? item.overall);
    if (Number.isFinite(score)) return score;
    const outOf100 = Number(item.scoreOutOf100 ?? item.overallScore ?? item.score_0_to_100);
    if (Number.isFinite(outOf100)) return Math.round(outOf100) / 10;
    const outOf10 = Number(item.scoreOutOf10 ?? item.score_0_to_10);
    if (Number.isFinite(outOf10)) return outOf10;
  }
  const scores = Object.values(raw.scores || {}).map(Number).filter(Number.isFinite);
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10;
}

function normalizeTasks(raw) {
  const tasks = Array.isArray(raw.tasks) ? raw.tasks
    : Array.isArray(raw.taskResults) ? raw.taskResults
    : Array.isArray(raw.task_results) ? raw.task_results
    : raw.taskResults && typeof raw.taskResults === 'object' ? Object.values(raw.taskResults)
    : raw.task_results && typeof raw.task_results === 'object' ? Object.values(raw.task_results)
    : Array.isArray(raw.steps) ? raw.steps
    : [];
  return tasks.map((task, index) => ({
    taskId: normalizeTaskId(
      task.taskId || task.id || task.task_id || task.task || task.taskArea || task.name || task.title || task['覆盖任务'] || `task-${index + 1}`,
      index
    ),
    completed: normalizeTaskCompleted(task),
    assistanceUsed: task.assistanceUsed === true || task.assistance_used === true,
    status: cleanText(task.status || task.completionStatus || task['完成状态']),
    score: Number.isFinite(Number(task.score ?? task.scores?.overall ?? task.score_1_to_5))
      ? Number(task.score ?? task.scores?.overall ?? task.score_1_to_5)
      : null,
    stepCount: Number(task.stepCount ?? task.step_count ?? (Array.isArray(task.steps) ? task.steps.length : 0) ?? (Array.isArray(task.actions) ? task.actions.length : 0)) || 0,
    durationMs: Number(task.durationMs ?? task.duration_ms ?? task.durationMsApprox ?? task.elapsedMs ?? task.elapsed_ms ?? task.elapsedMsApprox ?? 0) || 0,
    failureStep: cleanText(task.failureStep || task.failure_step || task.failure || task.error || task.status || task.completionStatus || '')
  }));
}

function normalizeTaskStats(rawOrTasks) {
  const tasks = Array.isArray(rawOrTasks) ? rawOrTasks : normalizeTasks(rawOrTasks);
  const completed = tasks.filter((task) => task.completed === true).length;
  const failed = tasks.filter((task) => task.completed === false && !/partial/.test(task.status)).length;
  const partial = tasks.filter((task) => /partial/.test(task.status)).length;
  return {
    total: tasks.length,
    completed,
    partial,
    failed
  };
}

function normalizeTrustSignals(raw, scores = {}, tasks = []) {
  const verdict = raw.verdict && typeof raw.verdict === 'object' ? raw.verdict : {};
  const trustSignals = raw.trustSignals && typeof raw.trustSignals === 'object' && !Array.isArray(raw.trustSignals)
    ? raw.trustSignals
    : {};
  const productValue = raw.productValueComparedWithGeneralAI && typeof raw.productValueComparedWithGeneralAI === 'object'
    ? raw.productValueComparedWithGeneralAI
    : {};
  const productValueFailure = normalizeBoolean(verdict.productValueFailure);
  const taskScore = (taskId) => Number(tasks.find((task) => task.taskId === taskId)?.score);
  return {
    trustedDecision: firstBoolean(normalizeBoolean(raw.trustedDecision), scoreAtLeast(scores.trust, 4)),
    understoodEvidenceSource: firstBoolean(normalizeBoolean(raw.understoodEvidenceSource), scoreAtLeast(scores.trust, 4)),
    comparisonWasUseful: firstBoolean(normalizeBoolean(raw.comparisonWasUseful), scoreAtLeast(scores.comparisonValue, 4)),
    valueBeyondGenericAi: firstBoolean(
      normalizeBoolean(trustSignals.valueBeyondGenericAi),
      normalizeBoolean(raw.valueBeyondGenericAi),
      normalizeBoolean(productValue.clearDifferentiation),
      productValueFailure === false ? true : null,
      scoreAtLeast(taskScore('task-8'), 4),
      scoreAtLeast(scores.overallValue, 4) && /通用\s*ai|generic ai|普通\s*ai/i.test(cleanText(raw.verdict || raw.productValueComparedWithGeneralAI || raw.summary || raw.overall))
    ),
    wouldUseAgain: firstBoolean(
      normalizeBoolean(trustSignals.wouldUseAgain),
      normalizeBoolean(raw.wouldUseAgain),
      normalizeBoolean(verdict.wouldUseAgain),
      normalizeBoolean(verdict.wouldUseAgainAsPersona),
      scoreAtLeast(taskScore('task-7'), 4)
    ),
    wouldRecommend: normalizeBoolean(raw.wouldRecommend)
  };
}

function firstBoolean(...values) {
  return values.find((value) => typeof value === 'boolean') ?? null;
}

function scoreAtLeast(value, threshold) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric >= threshold : null;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (/^true|yes|是|会|可信|理解/.test(value.trim())) return true;
    if (/^false|no|否|不会|不可信|不理解/.test(value.trim())) return false;
  }
  return null;
}

function schemaDeviations(raw) {
  const deviations = [];
  const issueLike = [raw.issues, raw.problems, raw.bugs, raw.uiProblems, raw.interactionProblems, raw.missingFeatures, raw.trustRisks]
    .some((bucket) => Array.isArray(bucket));
  if (!issueLike) deviations.push('issues_not_array_or_missing');
  if (!raw.verdict) deviations.push('verdict_missing');
  if (!raw.scores || typeof raw.scores !== 'object' || Array.isArray(raw.scores)) deviations.push('scores_missing_or_non_object');
  const taskLike = Array.isArray(raw.tasks) || Array.isArray(raw.taskResults) || Array.isArray(raw.task_results)
    || (raw.taskResults && typeof raw.taskResults === 'object')
    || (raw.task_results && typeof raw.task_results === 'object');
  if (!taskLike) deviations.push('tasks_missing_or_nonstandard');
  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks
    : Array.isArray(raw.taskResults) ? raw.taskResults
    : Array.isArray(raw.task_results) ? raw.task_results
    : raw.taskResults && typeof raw.taskResults === 'object' ? Object.values(raw.taskResults)
    : raw.task_results && typeof raw.task_results === 'object' ? Object.values(raw.task_results)
    : Array.isArray(raw.steps) ? raw.steps
    : [];
  if (rawTasks.some((task) => task && typeof task.completed !== 'boolean')) {
    deviations.push('tasks_missing_completed_flags');
  }
  return deviations;
}

function extractRawIssues(raw) {
  const buckets = [
    raw.issues,
    raw.problems,
    raw.bugs,
    raw.uiProblems,
    raw.trustRisks,
    raw.interactionProblems,
    raw.missingFeatures,
    raw.lowValueFeatures,
    raw.topReasonsToAbandon,
    raw.topImprovements
  ];
  return buckets
    .flatMap((bucket) => Array.isArray(bucket) ? bucket : [])
    .filter((item) => {
      if (!item) return false;
      if (typeof item === 'string') return Boolean(item.trim());
      return typeof item === 'object';
    });
}

function normalizeIssue(input) {
  const text = issueText(input.issue);
  const severity = normalizeSeverity(input.issue, text);
  const clusterKey = classifyIssueCluster(text);
  return {
    id: `${input.provider}-${input.personaSlug}-${input.index + 1}`,
    provider: input.provider,
    personaSlug: input.personaSlug,
    source: input.filePath,
    severity,
    clusterKey,
    page: typeof input.issue === 'object' ? cleanText(input.issue.page || input.issue['所在页面'] || input.issue.route) : '',
    title: titleForIssue(input.issue, text),
    userImpact: typeof input.issue === 'object' ? cleanText(input.issue.user_impact || input.issue.userImpact || input.issue['用户影响'] || input.issue.impact) : '',
    evidence: normalizeEvidence(input.issue),
    suggestedDirection: typeof input.issue === 'object'
      ? cleanText(input.issue.suggested_direction || input.issue.suggestedDirection || input.issue['建议方向'] || input.issue.suggestionDirection || input.issue.recommendation)
      : '',
    text
  };
}

function issueText(issue) {
  if (typeof issue === 'string') return cleanText(issue);
  return [
    issue.id,
    issue.severity,
    issue.priority,
    issue.page,
    issue['所在页面'],
    issue.title,
    issue.name,
    issue.problem,
    issue.repro,
    issue.reproductionSteps,
    issue['重现步骤'],
    issue.user_impact || issue.userImpact || issue.impact,
    issue['用户影响'],
    issue.evidence,
    issue['证据'],
    issue.screenshots,
    issue.suggested_direction || issue.suggestedDirection,
    issue['建议方向'],
    issue.suggestionDirection,
    issue.description,
    issue.reason,
    issue.finding
  ].flatMap((item) => Array.isArray(item) ? item : [item])
    .map(cleanText)
    .filter(Boolean)
    .join(' ');
}

function titleForIssue(issue, fallback) {
  if (typeof issue === 'object') {
    const title = cleanText(issue.title || issue.name || issue.problem || issue['问题']);
    if (title) return title;
    const repro = cleanText(issue.repro || issue.reproductionSteps || issue['重现步骤'] || issue.description || issue.finding);
    if (repro) return repro.slice(0, 80);
  }
  return fallback.slice(0, 80);
}

function cleanText(value) {
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeEvidence(issue) {
  if (typeof issue !== 'object' || !issue) return [];
  const evidence = issue.evidence || issue['证据'] || issue.screenshots;
  if (Array.isArray(evidence)) return evidence.flatMap(normalizeEvidenceValue).filter(Boolean).slice(0, 6);
  if (evidence && typeof evidence === 'object') return normalizeEvidenceValue(evidence).filter(Boolean).slice(0, 6);
  return cleanText(evidence) ? [cleanText(evidence)] : [];
}

function normalizeEvidenceValue(value) {
  if (typeof value === 'string') {
    const imageMatches = [...value.matchAll(/reports\/product-review\/screenshots\/[^"',;\s]+\.(?:png|jpg|jpeg|webp)/giu)]
      .map((match) => match[0]);
    return imageMatches.length ? imageMatches : [cleanText(value)];
  }
  if (value && typeof value === 'object') {
    const items = [
      value.pathOrValue,
      value.path,
      value.value,
      value.screenshot,
      value.screenshots,
      value.evidence
    ].flatMap((item) => Array.isArray(item) ? item : [item]);
    const normalized = items.flatMap(normalizeEvidenceValue).filter(Boolean);
    return normalized.length ? normalized : [cleanText(value)];
  }
  return cleanText(value) ? [cleanText(value)] : [];
}

function extractVerdictValue(raw) {
  const candidates = [
    raw.verdict,
    raw.overallVerdict,
    raw.overallResult,
    raw.overallAssessment,
    raw.overall,
    raw.summary,
    raw.finalRecommendation,
    raw.finalUserAnswer
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string') return candidate;
    if (typeof candidate === 'object') {
      const value = candidate.status || candidate.verdict || candidate.overallVerdict
        || candidate.decision || candidate.label || candidate.summary || candidate.reason;
      if (value) return value;
    }
  }
  return '';
}

function normalizeTaskCompleted(task) {
  if (typeof task.completed === 'boolean') return task.completed;
  if (typeof task.success === 'boolean') return task.success;
  const status = cleanText(task.status || task.completionStatus || task['完成状态']).toLowerCase();
  if (/fail|failed|reject|blocked|stuck|无法|失败/.test(status)) return false;
  if (/partial|caveat|friction/.test(status) && !/^pass/.test(status)) return false;
  if (/pass|completed|complete|成功|通过/.test(status)) return true;
  if (Number.isFinite(Number(task.score))) return Number(task.score) >= 3;
  const result = cleanText(task.result || task.outcome || task.finding || task.summary || task.conclusion).toLowerCase();
  if (!result) return false;
  if (/未找到|无法完成|不能完成|卡住|失败|点击无效|无路由变化/.test(result)) return false;
  if (/能|可以|完成|通过|找到|进入|明确|可靠|有价值|成立|恢复|继续/.test(result)) return true;
  return false;
}

function normalizeTaskId(value, index) {
  const text = cleanText(value);
  const normalized = text.toLowerCase().replace(/\s+/g, '_');
  const semanticMap = [
    [/^(first_open|首次打开|t0?1)/u, 'task-1'],
    [/(single_product|单商品|t0?2)/u, 'task-2'],
    [/(information_insufficient|insufficient_information|信息不足|t0?3)/u, 'task-3'],
    [/(abnormal_recovery|exception_recovery|异常恢复|模糊|失败恢复|t0?4)/u, 'task-4'],
    [/(product_comparison|商品对比|两款|对比|t0?5)/u, 'task-5'],
    [/(personalization|个性化|画像|t0?6)/u, 'task-6'],
    [/(retention|留存|收藏|避雷|历史|t0?7)/u, 'task-7'],
    [/(product_alternative|product_substitutability|product_replaceability|替代|通用_ai|通用ai|t0?8)/u, 'task-8']
  ];
  for (const [pattern, taskId] of semanticMap) {
    if (pattern.test(normalized)) return taskId;
  }
  const taskMatch = text.match(/(?:task|任务)[\s-]*(\d+)/iu) || text.match(/^(\d+)$/u);
  if (taskMatch) return `task-${Number.parseInt(taskMatch[1], 10)}`;
  return `task-${index + 1}`;
}

function normalizeSeverity(issue, text) {
  const raw = typeof issue === 'object' ? cleanText(issue.severity || issue.priority) : '';
  const rawLower = raw.toLowerCase();
  const explicit = rawLower.match(/\bp([0-3])\b/u);
  if (explicit) return `P${explicit[1]}`;
  if (/critical|致命/.test(rawLower)) return 'P0';
  if (/high|严重/.test(rawLower)) return 'P1';
  if (/medium|中/.test(rawLower)) return 'P2';
  if (/low|低/.test(rawLower)) return 'P3';
  const source = text.toLowerCase();
  if (/critical|致命|虚假安全感|错误购买|过敏.*误导|过敏.*推荐|安全.*错误/.test(source)) return 'P0';
  if (/500|503|422|降级|对比|个性化|过敏原|无法.*识别|无法.*上传/.test(source)) return 'P1';
  if (/低|入口|留存|首屏|schema|字号|层级|视觉/.test(source)) return 'P2';
  return 'P3';
}

function classifyIssueCluster(text) {
  const value = text.toLowerCase();
  if (/not_confirmed_by_structured_review|deepseek api|json body timeout|blackbox-runner|structured final-review|final structured review|runnerfinalreview|评审 schema|schema|normalization|归一/.test(value)) return 'review_infrastructure';
  if (/connection refused|err_connection_refused|不可访问|服务不可用|unavailable|target h5|5180|3100/.test(value)) return 'runtime_stability';
  if (/上传|file chooser|选择图片|预览|没有进入报告|无法完成识别|无法得到购买结论|422|reports\/label/.test(value)) return 'upload_recognition_flow';
  if (/不同图片|相同|高度相似|无标签|模糊|front-only|blurry|no-label|信息不足|补拍|配料表|营养表/.test(value)) return 'information_sufficiency_gate';
  if (/500|batch-search|接口|降级|network|backend/.test(value)) return 'backend_degraded_state';
  if (/过敏|allergen|忌口|牛奶|花生/.test(value)) return 'allergen_priority';
  if (/对比|compare|a\/b|高糖|低糖/.test(value)) return 'comparison_value';
  if (/首页|首次|首屏|通用ai|价值/.test(value)) return 'first_open_value';
  if (/收藏|避雷|历史|留存/.test(value)) return 'retention';
  if (/json|字段/.test(value)) return 'review_infrastructure';
  return 'other';
}

function clusterIssues(issues) {
  const grouped = new Map();
  for (const issue of issues) {
    const current = grouped.get(issue.clusterKey) || {
      key: issue.clusterKey,
      title: clusterTitle(issue.clusterKey),
      severity: issue.severity,
      occurrences: 0,
      providers: {},
      personas: [],
      examples: [],
      suggestedDirections: []
    };
    current.occurrences += 1;
    current.severity = higherSeverity(current.severity, issue.severity);
    current.providers[issue.provider] = (current.providers[issue.provider] || 0) + 1;
    if (!current.personas.includes(issue.personaSlug)) current.personas.push(issue.personaSlug);
    if (current.examples.length < 6) current.examples.push({
      source: issue.source,
      title: issue.title,
      evidence: issue.evidence
    });
    if (issue.suggestedDirection && !current.suggestedDirections.includes(issue.suggestedDirection)) {
      current.suggestedDirections.push(issue.suggestedDirection);
    }
    grouped.set(issue.clusterKey, current);
  }
  return [...grouped.values()].sort((left, right) => {
    const severityDiff = severityRank(right.severity) - severityRank(left.severity);
    if (severityDiff) return severityDiff;
    return right.occurrences - left.occurrences;
  });
}

function clusterTitle(key) {
  return {
    information_sufficiency_gate: '信息充分性门槛和补拍路径',
    backend_degraded_state: '后端接口失败和降级状态',
    runtime_stability: '本地测试环境和服务稳定性',
    upload_recognition_flow: '上传识别状态机和购买结论生成',
    comparison_value: 'A/B 对比差异价值',
    allergen_priority: '过敏原首屏优先级',
    first_open_value: '首次打开价值说明',
    retention: '收藏、避雷和历史留存',
    review_infrastructure: '评审 schema 归一化',
    other: '其他问题'
  }[key] || key;
}

function buildTopFixQueue(clusters) {
  return clusters.slice(0, 10).map((cluster, index) => ({
    rank: index + 1,
    clusterKey: cluster.key,
    severity: cluster.severity,
    title: cluster.title,
    occurrences: cluster.occurrences,
    providers: cluster.providers,
    personas: cluster.personas,
    suggestedDirection: clusterSuggestedDirection(cluster.key) || cluster.suggestedDirections[0] || ''
  }));
}

function providerCommonIssues(clusters, provider) {
  return clusters
    .filter((cluster) => (cluster.providers[provider] || 0) >= 2)
    .map(compactCluster);
}

function compactCluster(cluster) {
  return {
    key: cluster.key,
    title: cluster.title,
    severity: cluster.severity,
    occurrences: cluster.occurrences,
    providers: cluster.providers,
    personas: cluster.personas
  };
}

function buildSeverityIssueList(issues) {
  return ['P0', 'P1', 'P2', 'P3'].reduce((groups, severity) => {
    groups[severity] = issues
      .filter((issue) => issue.severity === severity)
      .slice(0, 30)
      .map((issue) => ({
        id: issue.id,
        provider: issue.provider,
        persona: issue.personaSlug,
        page: issue.page,
        title: issue.title,
        source: issue.source
      }));
    return groups;
  }, {});
}

function buildSchemaDeviationSessions(sessions) {
  return sessions
    .filter((session) => session.schemaDeviations.length)
    .map((session) => ({
      provider: session.provider,
      persona: session.personaSlug,
      source: session.filePath,
      deviations: session.schemaDeviations
    }));
}

function buildTaskFunnel(sessions) {
  const taskMap = new Map();
  for (const session of sessions) {
    for (const task of session.tasks) {
      const current = taskMap.get(task.taskId) || {
        taskId: task.taskId,
        sessions: 0,
        completed: 0,
        failed: 0,
        assisted: 0,
        unassistedCompleted: 0,
        failureSteps: {}
      };
      current.sessions += 1;
      if (task.completed) current.completed += 1;
      else current.failed += 1;
      if (task.assistanceUsed) current.assisted += 1;
      if (task.completed && !task.assistanceUsed) current.unassistedCompleted += 1;
      if (!task.completed && task.failureStep) {
        current.failureSteps[task.failureStep] = (current.failureSteps[task.failureStep] || 0) + 1;
      }
      taskMap.set(task.taskId, current);
    }
  }
  return [...taskMap.values()].map((task) => ({
    ...task,
    completionRate: task.sessions ? roundMetric(task.completed / task.sessions) : 0,
    unassistedRate: task.sessions ? roundMetric(task.unassistedCompleted / task.sessions) : 0
  }));
}

function buildAbandonPoints(sessions, clusters) {
  const failureSteps = sessions
    .flatMap((session) => session.tasks.map((task) => task.failureStep).filter(Boolean));
  const stepCounts = countBy(failureSteps, (step) => step);
  const clusterPoints = clusters
    .filter((cluster) => ['P0', 'P1'].includes(cluster.severity))
    .map((cluster) => ({
      point: cluster.title,
      occurrences: cluster.occurrences,
      severity: cluster.severity,
      personas: cluster.personas
    }));
  const taskPoints = Object.entries(stepCounts).map(([point, occurrences]) => ({
    point,
    occurrences,
    severity: 'task_failure',
    personas: []
  }));
  return [...clusterPoints, ...taskPoints]
    .sort((left, right) => right.occurrences - left.occurrences)
    .slice(0, 10);
}

function buildLowestScorePages(issues) {
  const byPage = new Map();
  for (const issue of issues) {
    const page = issue.page || clusterTitle(issue.clusterKey);
    const current = byPage.get(page) || { page, p0: 0, p1: 0, p2: 0, p3: 0, issues: 0 };
    current.issues += 1;
    current[issue.severity.toLowerCase()] += 1;
    byPage.set(page, current);
  }
  return [...byPage.values()]
    .map((item) => ({
      ...item,
      riskScore: item.p0 * 100 + item.p1 * 40 + item.p2 * 10 + item.p3
    }))
    .sort((left, right) => right.riskScore - left.riskScore)
    .slice(0, 10);
}

function buildLowestValueFeatures(issues) {
  const lowValueKeys = new Set(['comparison_value', 'retention', 'first_open_value']);
  return clusterIssues(issues.filter((issue) => lowValueKeys.has(issue.clusterKey)))
    .map(compactCluster);
}

function buildMissingCoreUserValue(clusters) {
  return clusters
    .filter((cluster) => ['upload_recognition_flow', 'information_sufficiency_gate', 'comparison_value', 'first_open_value', 'allergen_priority'].includes(cluster.key))
    .map((cluster) => ({
      value: cluster.title,
      severity: cluster.severity,
      evidenceCount: cluster.occurrences,
      affectedPersonas: cluster.personas
    }));
}

function buildGenericAiValueGaps(issues) {
  return issues
    .filter((issue) => /通用\s*ai|generic ai|普通ai|直接.*ai|替代/.test(issue.text.toLowerCase()))
    .slice(0, 20)
    .map((issue) => ({
      provider: issue.provider,
      persona: issue.personaSlug,
      severity: issue.severity,
      title: issue.title,
      source: issue.source
    }));
}

function buildFeatureRecommendations(clusters) {
  const has = (key) => clusters.some((cluster) => cluster.key === key);
  return {
    keep: [
      '保留成分镜名称、包装标签识别入口、国标/添加剂来源区分、AI来源与包装实拍来源区分'
    ],
    redo: [
      has('information_sufficiency_gate') ? '重做信息不足和异常恢复为一等流程' : '',
      has('upload_recognition_flow') ? '重做上传识别状态机，选择图片后直接完成识别或给出明确失败原因' : '',
      has('comparison_value') ? '重做 A/B 对比的差异解释和当前画像推荐' : '',
      has('allergen_priority') ? '重做过敏风险首屏优先级' : ''
    ].filter(Boolean),
    delete: [
      has('retention') ? '删除或降级没有复用价值的收藏/避雷入口展示方式' : ''
    ].filter(Boolean),
    add: [
      has('first_open_value') ? '新增首屏包装专用价值和可信来源提示' : '',
      has('backend_degraded_state') ? '新增后端降级状态和报告信心上限' : ''
    ].filter(Boolean)
  };
}

function buildUiRefactorPriorities(issues, clusters) {
  const uiIssues = issues.filter((issue) => /ui|视觉|排版|拥挤|层级|字号|对比度|触控|首页|首屏|报告|对比/.test(issue.text.toLowerCase()));
  const pages = buildLowestScorePages(uiIssues);
  return {
    priorityPages: pages,
    priorityClusters: clusters
      .filter((cluster) => ['first_open_value', 'comparison_value', 'retention', 'information_sufficiency_gate', 'upload_recognition_flow'].includes(cluster.key))
      .map(compactCluster)
  };
}

function buildProviderMetrics(sessions) {
  const providers = [...new Set(sessions.map((session) => session.provider))].sort();
  return providers.reduce((metrics, provider) => {
    const providerSessions = sessions.filter((session) => session.provider === provider);
    const tasks = providerSessions.flatMap((session) => session.tasks);
    const completed = tasks.filter((task) => task.completed).length;
    const unassistedCompleted = tasks.filter((task) => task.completed && !task.assistanceUsed).length;
    metrics[provider] = {
      sessions: providerSessions.length,
      tasks: tasks.length,
      coreTaskCompletionRate: tasks.length ? roundMetric(completed / tasks.length) : 0,
      unassistedCompletionRate: tasks.length ? roundMetric(unassistedCompleted / tasks.length) : 0,
      scoreAverages: {
        visualQuality: averageScore(providerSessions, 'visualQuality'),
        easeOfUse: averageScore(providerSessions, 'easeOfUse'),
        decisionClarity: averageScore(providerSessions, 'decisionClarity'),
        trust: averageScore(providerSessions, 'trust'),
        comparisonValue: averageScore(providerSessions, 'comparisonValue'),
        retentionValue: averageScore(providerSessions, 'retentionValue'),
        overallValue: averageScore(providerSessions, 'overallValue')
      },
      valueBeyondGenericAiCount: providerSessions.filter((session) => session.trustSignals.valueBeyondGenericAi === true).length,
      wouldUseAgainCount: providerSessions.filter((session) => session.trustSignals.wouldUseAgain === true).length,
      schemaDeviationSessions: providerSessions.filter((session) => session.schemaDeviations.length).length
    };
    return metrics;
  }, {});
}

function averageScore(sessions, key) {
  const values = sessions
    .map((session) => normalizeScoreValue(session.scores?.[key]))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function normalizeScoreValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return NaN;
  if (numeric > 5 && numeric <= 100) return numeric / 20;
  if (numeric > 0 && numeric <= 1) return numeric * 5;
  return numeric;
}

function roundMetric(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function clusterSuggestedDirection(key) {
  return {
    information_sufficiency_gate: '报告生成前校验配料表/营养成分表、OCR 置信度和图片类型；信息不足时只输出补拍/手动补充路径。',
    backend_degraded_state: '关键接口失败时保留本地结果但标记降级，不输出确定性风险结论，并把失败状态带到报告首屏和来源区。',
    runtime_stability: '使用独立持久的 H5/API 测试环境，服务中断必须进入失败证据并在下一轮前修复。',
    upload_recognition_flow: '选择图片后必须自动进入识别和报告生成；上传失败、预览停滞和 422 需显示明确原因和恢复路径。',
    comparison_value: '对比页必须展示糖、碳水、钠、过敏原和添加剂差异，并给出当前画像下的明确胜出理由。',
    allergen_priority: '命中过敏/忌口词时，报告首屏第一风险必须显示命中词、来源字段和避免建议。',
    first_open_value: '首屏保持单一主操作，同时说明应拍配料表/营养表/条码以及结果为何比通用拍照更可核对。',
    retention: '首页提供最近报告、收藏和避雷入口，让用户能复用上次购买判断。',
    review_infrastructure: '评审运行器归一化不同代理 schema，并把 schema 偏差作为基础设施问题记录。'
  }[key] || '';
}

function higherSeverity(left, right) {
  return severityRank(right) > severityRank(left) ? right : left;
}

function severityRank(value) {
  return { P0: 4, P1: 3, P2: 2, P3: 1 }[value] || 0;
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function renderMarkdown(summary) {
  const productFixQueue = summary.topFixQueue
    .filter((item) => !['other', 'review_infrastructure'].includes(item.clusterKey))
    .slice(0, 8);
  const infrastructureItems = summary.topFixQueue
    .filter((item) => ['review_infrastructure'].includes(item.clusterKey))
    .slice(0, 3);
  const totalTasks = summary.taskFunnel.reduce((sum, task) => sum + task.sessions, 0);
  const completedTasks = summary.taskFunnel.reduce((sum, task) => sum + task.completed, 0);
  const p0 = summary.metrics.severity?.P0 || 0;
  const p1 = summary.metrics.severity?.P1 || 0;
  const status = p0 || p1 ? '未通过，必须进入修复' : '无 P0/P1，可进入下一轮验证';
  const evidenceCards = buildEvidenceCards(summary, productFixQueue).slice(0, 6);
  const genericAiGaps = renderGenericAiGaps(summary);
  const coverageGaps = renderCoverageGaps(summary, infrastructureItems);
  const lines = [
    `# Round ${summary.round} 产品评审摘要`,
    '',
    `状态：${status}。完整原始评审、失败会话和机器可读数据仍保留，本页只展示产品决策需要的信息。`,
    '',
    `生成时间：${summary.generatedAt}`,
    '',
    '## 关键数据',
    '',
    '| 项目 | 结果 |',
    '| --- | --- |',
    `| 黑盒会话 | ${summary.metrics.providers.codex || 0} 个 Codex + ${summary.metrics.providers.deepseek || 0} 个 DeepSeek |`,
    `| 任务完成 | ${completedTasks}/${totalTasks} (${formatRate(totalTasks ? completedTasks / totalTasks : 0)}) |`,
    `| 高风险问题 | P0 ${p0} / P1 ${p1} |`,
    `| 未通过或拒绝会话 | ${summary.metrics.rejectedOrNoGoSessions}/${summary.metrics.sessions} |`,
    `| 通用 AI 差异认可 | Codex ${providerCount(summary, 'codex', 'valueBeyondGenericAiCount')}；DeepSeek ${providerCount(summary, 'deepseek', 'valueBeyondGenericAiCount')} |`,
    `| 再次使用意愿 | Codex ${providerCount(summary, 'codex', 'wouldUseAgainCount')}；DeepSeek ${providerCount(summary, 'deepseek', 'wouldUseAgainCount')} |`,
    '',
    '## 用户任务漏斗',
    '',
    '| 任务 | 完成率 | 失败数 | 主要失败点 |',
    '| --- | ---: | ---: | --- |',
    ...summary.taskFunnel.map((task) => `| ${taskLabel(task.taskId)} | ${task.completed}/${task.sessions} (${formatRate(task.completionRate)}) | ${task.failed} | ${topFailureStep(task)} |`),
    '',
    '## 优先修复清单',
    '',
    productFixQueue.length
      ? '| 优先级 | 问题 | 影响用户 | 截图证据 | 修复方向 |'
      : '暂无产品问题进入优先队列。',
    productFixQueue.length ? '| --- | --- | --- | --- | --- |' : '',
    ...productFixQueue.map((item) => `| ${item.severity} | ${item.title} | ${formatPersonas(item.personas)} | ${evidenceLinkForQueueItem(summary, item)} | ${item.suggestedDirection || '按原始会话复现并修复'} |`),
    '',
    '## 图文证据',
    '',
    ...renderEvidenceCards(evidenceCards),
    '',
    '## 本轮最低价值点',
    '',
    '| 功能 | 结论 |',
    '| --- | --- |',
    ...summary.lowestValueFeatures.slice(0, 5).map((item) => `| ${item.title || item.feature || item.key} | ${item.severity}，${item.occurrences || item.evidenceCount || 0} 条证据，影响 ${formatPersonas(item.personas || item.affectedPersonas || [])} |`),
    '',
    '## 仍然不像专用产品的部分',
    '',
    ...genericAiGaps,
    '',
    '## 保留 / 重做 / 新增',
    '',
    `- 保留：${summary.featureRecommendations.keep.join('；') || '无'}`,
    `- 重做：${summary.featureRecommendations.redo.join('；') || '无'}`,
    `- 新增：${summary.featureRecommendations.add.join('；') || '无'}`,
    `- 删除或降级：${summary.featureRecommendations.delete.join('；') || '无'}`,
    '',
    '## 评审覆盖缺口',
    '',
    ...coverageGaps,
    '',
    '## 原始数据',
    '',
    `- 聚合 JSON：${linkPath(path.join(outputDir, 'aggregation.json'))}`,
    `- 修复队列 JSON：${linkPath(path.join(outputDir, 'top-fix-queue.json'))}`,
    '- 原始会话：`reports/product-review/raw/codex/`、`reports/product-review/raw/deepseek/`',
    '- 截图证据：`reports/product-review/screenshots/`'
  ];
  return `${lines.filter((line) => line !== null && line !== undefined).join('\n')}\n`;
}

function renderClusterBullets(clusters) {
  return clusters.length
    ? clusters.map((item) => `- ${item.title}: ${item.severity}, occurrences=${item.occurrences}, personas=${item.personas.join(', ')}`)
    : ['- none'];
}

function renderSchemaDeviationBullets(sessions) {
  return sessions.length
    ? sessions.map((session) => `- ${session.provider}/${session.persona}: ${session.deviations.join(', ')} (${session.source})`)
    : ['- none'];
}

function formatCounts(counts) {
  const entries = Object.entries(counts || {});
  return entries.length ? entries.map(([key, value]) => `${key}=${value}`).join(', ') : 'none';
}

function formatRate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(1)}%` : 'n/a';
}

function taskLabel(taskId) {
  return {
    'task-1': '首次打开并开始识别',
    'task-2': '单商品购买判断',
    'task-3': '信息不足处理',
    'task-4': '模糊/失败恢复',
    'task-5': '两款商品对比',
    'task-6': '画像切换',
    'task-7': '收藏/避雷/历史',
    'task-8': '与通用 AI 的差异'
  }[taskId] || taskId;
}

function topFailureStep(task) {
  const entries = Object.entries(task.failureSteps || {}).sort((left, right) => Number(right[1]) - Number(left[1]));
  return entries.length ? `${friendlyFailureStep(entries[0][0])} (${entries[0][1]})` : '无';
}

function friendlyFailureStep(value) {
  const text = cleanText(value);
  if (!text) return '未记录';
  if (/not_confirmed_by_structured_review/i.test(text)) return '黑盒用户未确认完成';
  if (/timeout before retention/i.test(text)) return '留存任务未完成即超时';
  if (/timeout before product replacement/i.test(text)) return '未回答通用 AI 差异即超时';
  if (/runnerFinalReview|schema|json/i.test(text)) return '结构化评审输出异常';
  return text.slice(0, 80);
}

function providerCount(summary, provider, key) {
  const metrics = summary.providerMetrics?.[provider];
  if (!metrics) return '0/0';
  return `${metrics[key] || 0}/${metrics.sessions || 0}`;
}

function formatPersonas(personas) {
  const labels = {
    'first-time-consumer': '首次用户',
    'time-pressed-consumer': '赶时间用户',
    'parent-child-snack': '家长',
    'sugar-control': '控糖用户',
    'allergy-sensitive': '过敏用户',
    'generic-ai-skeptic': 'AI 怀疑用户'
  };
  const list = [...new Set((personas || []).map((item) => labels[item] || cleanText(item)).filter(Boolean))];
  return list.length ? list.join('、') : '未标记';
}

function evidenceLinkForQueueItem(summary, item) {
  const image = firstEvidenceImage(findCluster(summary, item)?.examples || []);
  return image ? `[截图](${toMarkdownPath(image)})` : '见原始会话';
}

function buildEvidenceCards(summary, queue) {
  const cards = [];
  for (const item of queue) {
    const cluster = findCluster(summary, item);
    const image = firstEvidenceImage(cluster?.examples || []);
    if (!image) continue;
    cards.push({
      title: item.title,
      severity: item.severity,
      personas: item.personas,
      image,
      direction: item.suggestedDirection || ''
    });
  }
  return cards;
}

function renderEvidenceCards(cards) {
  if (!cards.length) return ['暂无可嵌入截图；请查看原始会话截图目录。'];
  return cards.flatMap((card, index) => [
    `### ${index + 1}. ${card.title}`,
    `![${card.title}](${toMarkdownPath(card.image)})`,
    `- 影响：${formatPersonas(card.personas)}；级别：${card.severity}`,
    card.direction ? `- 修复方向：${card.direction}` : ''
  ].filter(Boolean));
}

function renderGenericAiGaps(summary) {
  const lines = [];
  const codexValue = providerCount(summary, 'codex', 'valueBeyondGenericAiCount');
  const deepseekValue = providerCount(summary, 'deepseek', 'valueBeyondGenericAiCount');
  lines.push(`- 差异认可不足：Codex ${codexValue}、DeepSeek ${deepseekValue} 认为明显优于通用 AI，未达到 5/6 验收线。`);
  const clusterMap = new Map((summary.issueClusters || []).map((cluster) => [cluster.key, cluster]));
  if (clusterMap.has('first_open_value')) {
    lines.push('- 首屏价值还不够直接：用户需要更快知道应拍包装标签，以及结果可核对在哪里。');
  }
  if (clusterMap.has('comparison_value')) {
    lines.push('- 对比价值还不够稳：两款商品必须一屏给出糖、碳水、钠、过敏原、添加剂差异和当前画像下的选择。');
  }
  if (clusterMap.has('allergen_priority')) {
    lines.push('- 过敏场景必须更强：命中忌口词时，专用产品价值应体现在保守、可追溯、首屏阻断。');
  }
  if (clusterMap.has('retention')) {
    lines.push('- 留存价值仍弱：收藏、避雷、历史必须让用户下次购物少重复判断，而不是只保存一条记录。');
  }
  return [...new Set(lines)];
}

function renderCoverageGaps(summary, infrastructureItems) {
  const gaps = new Set();
  const rawGaps = summary.coverageGaps || [];
  if (rawGaps.some((item) => /wechat|微信|小程序/i.test(item))) {
    gaps.add('小程序真机交互未验证：mp-weixin 已构建，但本机缺微信开发者工具 CLI/登录态。');
  }
  if (rawGaps.some((item) => /deepseek/i.test(item))) {
    gaps.add('DeepSeek 当前为 text-black-box-interaction，不作为视觉美观评审来源。');
  }
  if (rawGaps.some((item) => /camera|ocr|真实/i.test(item))) {
    gaps.add('真实相机和真实 OCR 准确率仍需专项验证；本轮黑盒使用可复现样本。');
  }
  if (summary.failedSessions?.length || rawGaps.some((item) => /failed|invalid|失败|无效/i.test(item))) {
    gaps.add('失败和无效会话已保留在 raw 目录，未从通过率中删除。');
  }
  if (summary.schemaDeviationSessions?.length || infrastructureItems.length) {
    gaps.add(`结构化评审输出仍有 ${summary.schemaDeviationSessions?.length || infrastructureItems.length} 个偏差，会进入评测基建修复，不计作产品通过。`);
  }
  return gaps.size ? [...gaps].map((item) => `- ${item}`) : ['- 无'];
}

function findCluster(summary, item) {
  return summary.issueClusters.find((cluster) => cluster.key === item.clusterKey)
    || summary.issueClusters.find((cluster) => cluster.title === item.title);
}

function firstEvidenceImage(examples) {
  for (const example of examples || []) {
    for (const evidence of example.evidence || []) {
      const match = String(evidence).match(/reports\/product-review\/screenshots\/[^"',;\s]+\.(?:png|jpg|jpeg|webp)/iu);
      if (match) return match[0];
    }
  }
  return '';
}

function toMarkdownPath(filePath) {
  if (!filePath) return '';
  const relative = path.relative(outputDir, filePath);
  return relative.startsWith('..') ? relative.replace(/\\/g, '/') : `./${relative.replace(/\\/g, '/')}`;
}

function linkPath(filePath) {
  return `[${path.basename(filePath)}](${toMarkdownPath(filePath)})`;
}
