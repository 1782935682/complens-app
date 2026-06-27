import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiKey = process.env.DEEPSEEK_API_KEY || '';
const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const screenshotDir = process.env.DEEPSEEK_UI_REVIEW_SCREENSHOT_DIR || join(os.tmpdir(), 'complens-user-visual-smoke');
const outputPath = process.env.DEEPSEEK_UI_REVIEW_OUTPUT || join(os.tmpdir(), 'complens-deepseek-comprehensive-review.json');

const screenshotNames = [
  'home',
  'capture',
  'capture-filled',
  'capture-optional',
  'report',
  'report-insufficient',
  'attention'
];

if (!apiKey) {
  await writeJson({
    verdict: 'not_run',
    error: 'missing_deepseek_api_key',
    message: 'Set DEEPSEEK_API_KEY in the backend/local environment before running DeepSeek comprehensive review.',
    screenshotDir,
    outputPath
  });
  console.error(`DeepSeek comprehensive review not run: missing DEEPSEEK_API_KEY. Wrote ${outputPath}`);
  process.exit(2);
}

const screenshotInventory = await buildScreenshotInventory();
const docContext = await readDocContext();
const sourceContext = await readSourceContext();

const prompt = `
你是成分镜微信小程序的上线前深度评审。请从普通用户、产品经理、移动端设计师、功能验收和文档一致性角度综合评估，不要泛泛而谈。

产品定位：
- 成分镜不是 OCR 工具，也不是成分百科。
- 主路径是：拍食品包装 -> 商品身份/标签识别 -> 购买建议；本期不支持历史、收藏和单成分搜索入口。
- 用户目标是拍包装后直接得到购买/食用决策，减少自己判断、查资料、对比。
- 硬性流程约束：点击首页“拍照识别”后直接调用相机并自动识别；拍照识别结束必须直接进入购买建议页。信息不足时提示补拍，不展示原文或技术字段。
- AI 只做通俗解释和总结，不编造成分、法规、医疗或权威结论。
- 后端 AI 商品补全只有在源码和测试证明存在 URL、域名或 Open Food Facts 等可核对来源摘要时，才允许把 ingredientsText / nutritionText 传给报告；泛泛来源摘要必须清空。
- 报告文案必须回答“该不该买”，但不能写医疗诊断、法规权威结论或绝对化安全承诺。

当前截图场景：
${screenshotInventory}

人工截图观察：
- 首页：第一屏只有居中的“拍照识别”按钮。
- 手动补充页空白态：只有用户主动手动输入或从信息不足报告点击补充时出现，强调优先补配料表文字/营养表数字，可选补充默认折叠；底部操作为生成参考报告、重新拍、清空文字。
- 补充页已填态：填入配料后主按钮变为可用，页面不再出现“需要确认”的大段提示。
- 报告首屏：只展示三卡结构：该不该买、风险原因、替代推荐；结论卡内可展示适合/不适合人群。
- 信息不足报告：不硬给消费结论，只提示补拍配料表或营养表。
- 我的页：关注目标支持多选，过敏/忌口也支持多选。

本轮需要你检查：
1. 功能主路径是否完整、是否仍像 OCR 工具或成分百科。
2. UI 是否移动端优先，按钮是否怪异、重叠、比例失衡。
3. 产品是否减少普通用户判断成本，是否直接给购买/食用决策。
4. 报告是否文字过多，图表/标签是否真正降低阅读负担。
5. 条码、二维码、数字编码、配料表、营养表、未知图片是否统一进入同一报告页，是否没有暴露多个首页入口。
6. 信息不足、识别失败、条码/二维码扫码、手动补充这些场景是否合理。
7. 文档和脚本是否支撑当前方向，是否存在 key 泄漏、伪造 AI/OCR、过度权威化风险。
8. 设计是否一致，是否有明显上线阻断。

文档摘要：
${docContext}

代码/脚本摘要：
${sourceContext}

请只输出严格 JSON：
{
  "verdict": "pass" | "needs_changes",
  "topIssues": [
    {
      "severity": "high|medium|low",
      "area": "function|ui|product|docs|design|ai|ocr",
      "issue": "具体问题",
      "suggestedChange": "具体改法"
    }
  ],
  "scenarioReviews": [
    {"scenario": "首页|自动识别|补充页|正常报告|信息不足报告|我的|AI/OCR|文档", "score": 1-10, "notes": "具体评价"}
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
        content: '你是严谨的中文移动端产品、UI、功能和文档上线评审。只输出 JSON，不输出 Markdown。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.2,
    max_tokens: 2400
  })
});

const payload = await response.json().catch(() => null);
if (!response.ok) {
  await writeJson({
    verdict: 'not_run',
    error: 'deepseek_request_failed',
    status: response.status,
    message: payload?.error?.message || response.statusText,
    screenshotDir,
    model
  });
  throw new Error(`DeepSeek comprehensive review failed: ${response.status} ${payload?.error?.message || response.statusText}`);
}

const content = payload?.choices?.[0]?.message?.content || '';
const review = parseJson(content);
await writeJson({
  ...review,
  provider: 'deepseek',
  model,
  screenshotDir
});
console.log(JSON.stringify(review, null, 2));
console.log(`DeepSeek comprehensive review written to ${outputPath}`);

async function buildScreenshotInventory() {
  if (!existsSync(screenshotDir)) return `截图目录不存在：${screenshotDir}`;
  const files = new Set(await readdir(screenshotDir));
  return screenshotNames
    .map((name) => {
      const filename = `${name}.png`;
      return `- ${filename}: ${files.has(filename) ? '已生成' : '缺失'}`;
    })
    .join('\n');
}

async function readDocContext() {
  const entries = await Promise.all([
    readSnippet('../docs/decision-system.md', 2600),
    readSnippet('../README.md', 1800),
    readSnippet('../COMMANDS.md', 1800),
    readSnippet('../AI_REVIEW.md', 1800),
    readSnippet('../CODEX_TASKS.md', 1800)
  ]);
  return entries.join('\n\n');
}

async function readSourceContext() {
  const entries = await Promise.all([
    readSnippet('src/pages/index/index.vue', 1400),
    readSnippetAround('src/pages/capture/index.vue', 'type CaptureStage', 1200, 1600),
    readSnippetAround('src/pages/capture/index.vue', 'async function startRecognize', 800, 3600),
    readSnippetAround('src/pages/capture/index.vue', 'function startManualTextEntry', 800, 1800),
    readSnippetAround('src/pages/capture/index.vue', '<template>', 1200, 2800),
    readSnippet('src/pages/report/index.vue', 5200),
    readSnippet('src/pages/attention/index.vue', 2200),
    readSnippet('src/services/api/labels.ts', 3600),
    readSnippet('src/services/recognition/autoGeneratePolicy.ts', 1600),
    readSnippet('src/services/recognition/imageRecognitionService.ts', 2200),
    readSnippet('src/services/recognition/productLookupService.ts', 1600),
    readSnippet('src/utils/reportBuilder.ts', 3600),
    readSnippet('src/utils/localLabelAnalysis.ts', 3600),
    readSnippet('scripts/ocr-report-regression.mjs', 5200),
    readSnippet('scripts/visual-smoke.mjs', 2200),
    readSnippet('scripts/chatgpt-ui-review.mjs', 1600),
    readSnippet('../backend/src/services/productLookupService.ts', 3600),
    readSnippetAround('../backend/src/services/productLookupService.ts', 'function parseLookupJson', 800, 1800),
    readSnippetAround('../backend/tests/productLookup.test.ts', 'does not accept AI ingredient or nutrition text without a public source summary', 400, 3200)
  ]);
  return entries.join('\n\n');
}

async function readSnippet(relativePath, maxLength) {
  const path = join(projectRoot, relativePath);
  try {
    const text = await readFile(path, 'utf8');
    return `### ${relativePath}\n${text.slice(0, maxLength)}`;
  } catch (error) {
    return `### ${relativePath}\n读取失败：${error.message}`;
  }
}

async function readSnippetAround(relativePath, pattern, beforeLength, afterLength) {
  const path = join(projectRoot, relativePath);
  try {
    const text = await readFile(path, 'utf8');
    const index = text.indexOf(pattern);
    if (index === -1) return `### ${relativePath} around ${pattern}\n未找到片段`;
    const start = Math.max(0, index - beforeLength);
    const end = Math.min(text.length, index + pattern.length + afterLength);
    return `### ${relativePath} around ${pattern}\n${text.slice(start, end)}`;
  } catch (error) {
    return `### ${relativePath} around ${pattern}\n读取失败：${error.message}`;
  }
}

function parseJson(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('DeepSeek review returned empty text.');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) throw new Error(`DeepSeek review returned non-JSON text: ${text.slice(0, 200)}`);
    return JSON.parse(match[0]);
  }
}

async function writeJson(value) {
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
