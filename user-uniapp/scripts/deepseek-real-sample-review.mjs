import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiKey = process.env.DEEPSEEK_API_KEY || '';
const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const sampleReportPath = process.env.DEEPSEEK_REAL_SAMPLE_REPORT || join(os.tmpdir(), 'complens-real-packaging-samples', 'report.json');
const sampleSummaryPath = process.env.DEEPSEEK_REAL_SAMPLE_SUMMARY || join(os.tmpdir(), 'complens-real-packaging-samples', 'summary.md');
const screenshotDir = process.env.DEEPSEEK_UI_REVIEW_SCREENSHOT_DIR || join(os.tmpdir(), 'complens-user-visual-smoke');
const outputPath = process.env.DEEPSEEK_REAL_SAMPLE_REVIEW_OUTPUT || join(os.tmpdir(), 'complens-deepseek-real-sample-review.json');

if (!apiKey) {
  await writeJson({
    verdict: 'not_run',
    error: 'missing_deepseek_api_key',
    message: 'Set DEEPSEEK_API_KEY in the backend/local environment before running DeepSeek real sample review.',
    sampleReportPath,
    outputPath
  });
  console.error(`DeepSeek real sample review not run: missing DEEPSEEK_API_KEY. Wrote ${outputPath}`);
  process.exit(2);
}

const sampleContext = await readSampleContext();
const screenshotInventory = await buildScreenshotInventory();
const productDocs = await readDocContext();
const sourceContext = await readSourceContext();

const prompt = `
你是成分镜上线前深度评审。请不要只看单点，要从普通用户真实使用、OCR 准确性、结构化识别、报告决策价值、移动端 UI、文档和设计一致性一起审查。

产品定位：
- 成分镜不是 OCR 工具，也不是成分百科。
- 主路径是：拍食品包装 -> OCR -> 结构化识别 -> 报告 -> 历史。
- 用户拍包装后应该尽量少自己判断，报告要直接服务购买/食用决策。
- AI 只能做通俗解释和总结，不能编造法规、医疗结论或权威数据。
- 无 OCR key 或 OCR 失败不能返回假识别结果。

真实网络包装样本 OCR 回归：
${sampleContext}

截图库存：
${screenshotInventory}

产品/文档摘要：
${productDocs}

相关源码摘要：
${sourceContext}

请重点评估：
1. 网络样本覆盖是否足够，是否还缺酸奶/油炸零食/饮料正面声明/营养表/生产日期/过敏提示等关键场景。
2. OCR 结果是否能转成可用决策，是否把不确定字段放进未确认线索。
3. 报告是否一眼能给购买/食用判断，是否文字过多、重复、让用户继续自己判断。
4. 营养表是否适合用图表/分级，不要纯文字堆砌。
5. 信息不足、只有喷码日期、只有正面包装时是否正确降级。
6. UI/设计/文档是否支撑“成分镜”这个消费决策定位。
7. 上线前还应修哪些明确问题。

请只输出严格 JSON：
{
  "verdict": "pass" | "needs_changes",
  "topIssues": [
    {
      "severity": "high|medium|low",
      "area": "ocr|report|ui|product|docs|design|test",
      "sampleId": "相关样本 id，没有则空字符串",
      "file": "相关文件，没有则空字符串",
      "issue": "具体问题",
      "suggestedChange": "具体改法"
    }
  ],
  "scenarioReviews": [
    {"scenario": "真实样本集|配料表|营养表|生产日期|信息不足|报告决策|UI设计|文档测试", "score": 1-10, "notes": "具体评价"}
  ],
  "shipBlockers": ["上线阻断问题，没有则空数组"],
  "summary": "总体上线判断"
}
`;

const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: '你是严谨的中文移动端产品、OCR、UI、设计、功能和文档上线评审。只输出 JSON，不输出 Markdown。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.2,
    max_tokens: 2600
  })
});

const payload = await response.json().catch(() => null);
if (!response.ok) {
  await writeJson({
    verdict: 'not_run',
    error: 'deepseek_request_failed',
    status: response.status,
    message: payload?.error?.message || response.statusText,
    sampleReportPath,
    model
  });
  throw new Error(`DeepSeek real sample review failed: ${response.status} ${payload?.error?.message || response.statusText}`);
}

const content = payload?.choices?.[0]?.message?.content || '';
const review = parseJson(content);
await writeJson({
  ...review,
  provider: 'deepseek',
  model,
  sampleReportPath,
  screenshotDir
});
console.log(JSON.stringify(review, null, 2));
console.log(`DeepSeek real sample review written to ${outputPath}`);

async function readSampleContext() {
  const summary = await readSnippetAbsolute(sampleSummaryPath, 9000);
  const report = await readSnippetAbsolute(sampleReportPath, 11000);
  return [summary, report].join('\n\n');
}

async function buildScreenshotInventory() {
  if (!existsSync(screenshotDir)) return `截图目录不存在：${screenshotDir}`;
  const files = await readdir(screenshotDir);
  const inventory = files
    .filter((file) => file.endsWith('.png'))
    .sort()
    .map((file) => `- ${file}`)
    .join('\n') || `截图目录为空：${screenshotDir}`;
  return `${inventory}

截图观察（来自 visual smoke 人工核对）：
- report.png：首屏只显示三卡结构：该不该买、风险原因、替代推荐；结论卡内展示适合和不适合人群。
- report-insufficient.png：信息不足页保留同样三卡结构，并提示补拍配料表或营养表。`;
}

async function readDocContext() {
  const entries = await Promise.all([
    readSnippet('../docs/decision-system.md', 2600),
    readSnippet('../README.md', 1800),
    readSnippet('../COMMANDS.md', 1800),
    readSnippet('../PROJECT_PLAN.md', 1400)
  ]);
  return entries.join('\n\n');
}

async function readSourceContext() {
  const entries = await Promise.all([
    readSnippet('scripts/real-packaging-sample-smoke.mjs', 2600),
    readSnippet('src/utils/labelTextExtractor.ts', 2600),
    readSnippet('src/utils/localLabelAnalysis.ts', 2200),
    readSnippetAround('src/pages/report/index.vue', 'const purchaseDecision', 1200, 2600),
    readSnippetAround('src/pages/report/index.vue', '风险原因', 1600, 2600),
    readSnippetAround('src/pages/report/index.vue', '替代推荐', 1600, 2600),
    readSnippet('src/pages/capture/index.vue', 2400)
  ]);
  return entries.join('\n\n');
}

async function readSnippet(relativePath, maxLength) {
  return readSnippetAbsolute(join(projectRoot, relativePath), maxLength, relativePath);
}

async function readSnippetAround(relativePath, pattern, beforeLength, afterLength) {
  const path = join(projectRoot, relativePath);
  try {
    const text = await readFile(path, 'utf8');
    const index = text.indexOf(pattern);
    if (index < 0) return `### ${relativePath} around ${pattern}\n未找到片段`;
    const start = Math.max(0, index - beforeLength);
    const end = Math.min(text.length, index + afterLength);
    return `### ${relativePath} around ${pattern}\n${text.slice(start, end)}`;
  } catch (error) {
    return `### ${relativePath} around ${pattern}\n读取失败：${error.message}`;
  }
}

async function readSnippetAbsolute(path, maxLength, label = path) {
  try {
    const text = await readFile(path, 'utf8');
    return `### ${label}\n${text.slice(0, maxLength)}`;
  } catch (error) {
    return `### ${label}\n读取失败：${error.message}`;
  }
}

function parseJson(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('DeepSeek real sample review returned empty text.');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) throw new Error(`DeepSeek real sample review returned non-JSON text: ${text.slice(0, 200)}`);
    return JSON.parse(match[0]);
  }
}

async function writeJson(value) {
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
