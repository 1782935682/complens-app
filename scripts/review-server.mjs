import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const docsRoot = join(projectRoot, 'docs');
const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || '0.0.0.0';
const maxBodyBytes = 256 * 1024;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

const decisionLabels = {
  approved: '审核通过',
  rejected: '退回修改',
  manual_required: '需要人工复核',
  unreviewed: '未审核'
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);

    if (url.pathname === '/api/review-results') {
      await handleReviewResults(request, response);
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { error: 'method_not_allowed' });
      return;
    }

    await serveStatic(url.pathname, request.method, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'internal_error' });
  }
});

server.listen(port, host, () => {
  console.log(`CompCheck review server running at http://${host}:${port}/docs/review-index.html`);
});

async function handleReviewResults(request, response) {
  if (request.method === 'GET') {
    await readReviewResults(response);
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'method_not_allowed' });
    return;
  }

  const body = await readJsonBody(request).catch((error) => {
    return { __parseError: error.message };
  });
  if (body.__parseError) {
    sendJson(response, 400, {
      error: 'invalid_json_body',
      message: body.__parseError
    });
    return;
  }

  const parsed = normalizeReviewPayload(body, request.headers.host || '');
  if (!parsed.ok) {
    sendJson(response, 400, parsed.error);
    return;
  }

  await mkdir(docsRoot, { recursive: true });
  const jsonPath = join(docsRoot, 'review-results.json');
  const markdownPath = join(docsRoot, 'review-results.md');
  const completionPath = join(docsRoot, 'review-completion.md');
  const reviewComplete = isReviewComplete(parsed.value);
  await writeFile(jsonPath, `${JSON.stringify(parsed.value, null, 2)}\n`, 'utf8');
  await writeFile(markdownPath, renderReviewMarkdown(parsed.value), 'utf8');
  if (reviewComplete) {
    await writeFile(completionPath, renderReviewCompletionMarkdown(parsed.value), 'utf8');
  } else {
    await unlink(completionPath).catch((error) => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }

  sendJson(response, 200, {
    ok: true,
    reviewComplete,
    path: 'docs/review-results.json',
    markdownPath: 'docs/review-results.md',
    completionPath: reviewComplete ? 'docs/review-completion.md' : null,
    summary: parsed.value.summary
  });
}

async function readReviewResults(response) {
  try {
    const content = await readFile(join(docsRoot, 'review-results.json'), 'utf8');
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: 'not_found' });
  }
}

async function serveStatic(pathname, method, response) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat || !fileStat.isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'Content-Length': fileStat.size,
    'Cache-Control': 'no-store'
  });

  if (method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}

function resolveStaticPath(pathname) {
  const requested = pathname === '/' ? '/docs/review-index.html' : pathname;
  const decoded = decodeURIComponent(requested);
  if (!decoded.startsWith('/docs/')) {
    return null;
  }
  const docsRelativePath = decoded.slice('/docs/'.length);
  if (!docsRelativePath || docsRelativePath.includes('\0')) {
    return null;
  }
  const filePath = normalize(join(docsRoot, docsRelativePath));
  const relativePath = relative(docsRoot, filePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return null;
  }
  return filePath;
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      throw new Error('request body too large');
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw || '{}');
}

function normalizeReviewPayload(body, hostHeader) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return invalidPayload('body must be an object');
  }

  const decisions = body.decisions;
  if (!Array.isArray(decisions) || decisions.length === 0 || decisions.length > 100) {
    return invalidPayload('decisions must include 1-100 items');
  }

  const normalizedDecisions = decisions.map((item) => normalizeDecision(item));
  const invalidDecision = normalizedDecisions.find((item) => !item.ok);
  if (invalidDecision && !invalidDecision.ok) {
    return invalidPayload(invalidDecision.error);
  }

  const items = normalizedDecisions.map((item) => item.value);
  const summary = summarizeDecisions(items);
  const submittedAt = new Date().toISOString();
  const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 300) : '';
  const action = typeof body.action === 'string' ? body.action.slice(0, 80) : 'submit';

  return {
    ok: true,
    value: {
      submittedAt,
      action,
      source: 'local-review-page',
      host: hostHeader,
      pageUrl,
      summary,
      decisions: items
    }
  };
}

function normalizeDecision(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { ok: false, error: 'decision item must be an object' };
  }

  const report = String(item.report || '').trim();
  if (!/^[a-z0-9._-]+\.(md|json)$/i.test(report)) {
    return { ok: false, error: `invalid report path: ${report}` };
  }

  const decision = String(item.decision || 'unreviewed').trim();
  if (!Object.hasOwn(decisionLabels, decision)) {
    return { ok: false, error: `invalid decision for ${report}` };
  }

  return {
    ok: true,
    value: {
      report,
      title: String(item.title || report).trim().slice(0, 120),
      decision,
      decisionLabel: decisionLabels[decision]
    }
  };
}

function summarizeDecisions(items) {
  const summary = {
    total: items.length,
    approved: 0,
    rejected: 0,
    manualRequired: 0,
    unreviewed: 0
  };

  for (const item of items) {
    if (item.decision === 'approved') summary.approved += 1;
    if (item.decision === 'rejected') summary.rejected += 1;
    if (item.decision === 'manual_required') summary.manualRequired += 1;
    if (item.decision === 'unreviewed') summary.unreviewed += 1;
  }

  return summary;
}

function renderReviewMarkdown(result) {
  const lines = [
    '# 食品成分知识库数据审核结果',
    '',
    `- 提交时间：${result.submittedAt}`,
    `- 来源页面：${result.pageUrl || '未提供'}`,
    `- 总数：${result.summary.total}`,
    `- 审核通过：${result.summary.approved}`,
    `- 退回修改：${result.summary.rejected}`,
    `- 需要人工复核：${result.summary.manualRequired}`,
    `- 未审核：${result.summary.unreviewed}`,
    '',
    '| 结论 | 报告 | 文件 |',
    '|---|---|---|'
  ];

  for (const item of result.decisions) {
    lines.push(`| ${item.decisionLabel} | ${escapeMarkdownTable(item.title)} | docs/${item.report} |`);
  }

  return `${lines.join('\n')}\n`;
}

function isReviewComplete(result) {
  return result.summary.total > 0
    && result.summary.approved === result.summary.total
    && result.summary.rejected === 0
    && result.summary.manualRequired === 0
    && result.summary.unreviewed === 0;
}

function renderReviewCompletionMarkdown(result) {
  const lines = [
    '# 本轮数据报告 Review 完成',
    '',
    `- 完成时间：${result.submittedAt}`,
    `- 来源页面：${result.pageUrl || '未提供'}`,
    `- 审核报告总数：${result.summary.total}`,
    `- 审核通过：${result.summary.approved}`,
    '- 退回修改：0',
    '- 需要人工复核：0',
    '- 未审核：0',
    '',
    '## 完成边界',
    '',
    '- 本文件只证明本轮报告级人工 review 已完成。',
    '- 不代表所有 `pending_review` 数据已自动提升为正式 verified 数据。',
    '- 数据级提升仍必须按来源等级、字段完整性、冲突检查和专用 promote 脚本逐类执行。',
    '',
    '## 已通过报告',
    '',
    '| 报告 | 文件 |',
    '|---|---|'
  ];

  for (const item of result.decisions) {
    lines.push(`| ${escapeMarkdownTable(item.title)} | docs/${item.report} |`);
  }

  return `${lines.join('\n')}\n`;
}

function escapeMarkdownTable(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function invalidPayload(message) {
  return {
    ok: false,
    error: {
      error: 'invalid_review_payload',
      message
    }
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(`${JSON.stringify(body)}\n`);
}
