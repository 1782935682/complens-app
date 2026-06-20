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
  'report-nutrition',
  'report-detail',
  'report-insufficient',
  'history',
  'attention',
  'search'
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
- 主路径是：拍食品包装 -> OCR -> 结构化识别 -> 报告 -> 历史。
- 用户目标是拍包装后直接得到购买/食用决策，减少自己判断、查资料、对比。
- AI 只做通俗解释和总结，不编造成分、法规、医疗或权威结论。
- 成分搜索只是小辅助入口。

当前截图场景：
${screenshotInventory}

人工截图观察：
- 首页：第一屏只有居中的拍包装圆形按钮，下面是包装正面/配料表/营养表短标签，查单个成分是小入口。
- 补充页空白态：强调“补一项生成”，优先补配料表文字/营养表数字，可选补充默认折叠。
- 补充页已填态：填入配料后主按钮变为可用，并显示识别到的糖类、脂肪、过敏等短标签。
- 报告首屏：先给一句话结论，再用短标签展示用户关注项，并用“为什么/谁少吃/怎么吃”三行完成决策闭环。
- 营养图：热量、脂肪、碳水、钠用条形图和低/中/高参考展示，不只堆文字。
- 信息不足报告：不硬给消费结论，首屏给补拍配料/营养表和手动粘贴文字两个动作。
- 历史页：卡片优先展示商品名、结论标签、关键原因，识别数量降级为次要信息。
- 我的页：关注目标、儿童模式、过敏/忌口都有设置影响提示。
- 成分搜索：结果卡顶部说明单个成分只作名称参考，不能替代整包包装报告。

本轮需要你检查：
1. 功能主路径是否完整、是否仍像 OCR 工具或成分百科。
2. UI 是否移动端优先，按钮是否怪异、重叠、比例失衡。
3. 产品是否减少普通用户判断成本，是否直接给购买/食用决策。
4. 报告是否文字过多，图表/标签是否真正降低阅读负担。
5. 信息不足、OCR 失败、手动补充、历史回看、成分搜索辅助这些场景是否合理。
6. 文档和脚本是否支撑当前方向，是否存在 key 泄漏、伪造 AI/OCR、过度权威化风险。
7. 设计是否一致，是否有明显上线阻断。

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
    {"scenario": "首页|补充页|正常报告|信息不足报告|历史|我的|搜索|AI/OCR|文档", "score": 1-10, "notes": "具体评价"}
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
    readSnippet('../docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md', 2200),
    readSnippet('../docs/product-blueprint/CONSUMER_DECISION_SPEC.md', 2200),
    readSnippet('../docs/product-blueprint/DESIGN_SYSTEM.md', 1800),
    readSnippet('../AI_REVIEW.md', 1800),
    readSnippet('../CODEX_TASKS.md', 1800)
  ]);
  return entries.join('\n\n');
}

async function readSourceContext() {
  const entries = await Promise.all([
    readSnippet('src/pages/index/index.vue', 1400),
    readSnippet('src/pages/capture/index.vue', 2200),
    readSnippet('src/pages/report/index.vue', 2600),
    readSnippet('src/pages/history/index.vue', 1800),
    readSnippet('scripts/visual-smoke.mjs', 2200),
    readSnippet('scripts/chatgpt-ui-review.mjs', 1600)
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
