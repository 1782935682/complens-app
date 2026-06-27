import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';

const screenshotDir = process.env.CHATGPT_UI_REVIEW_SCREENSHOT_DIR || join(os.tmpdir(), 'complens-user-visual-smoke');
const outputPath = process.env.CHATGPT_UI_REVIEW_OUTPUT || join(os.tmpdir(), 'complens-chatgpt-ui-review.json');
const apiKey = process.env.OPENAI_API_KEY || '';
const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/u, '');
const model = process.env.CHATGPT_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';

const screenshotFiles = [
  ['home', '首页'],
  ['capture', '补充信息页空白态'],
  ['capture-filled', '补充信息页已填写态'],
  ['capture-optional', '补充信息页可选字段'],
  ['report', '报告页首屏'],
  ['report-insufficient', '信息不足报告'],
  ['attention', '我的页']
];

const reviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'topIssues', 'pageReviews', 'shipBlockers', 'summary'],
  properties: {
    verdict: { type: 'string', enum: ['pass', 'needs_changes'] },
    topIssues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'page', 'issue', 'suggestedChange'],
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          page: { type: 'string' },
          issue: { type: 'string' },
          suggestedChange: { type: 'string' }
        }
      }
    },
    pageReviews: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['page', 'score', 'notes'],
        properties: {
          page: { type: 'string' },
          score: { type: 'number' },
          notes: { type: 'string' }
        }
      }
    },
    shipBlockers: {
      type: 'array',
      items: { type: 'string' }
    },
    summary: { type: 'string' }
  }
};

if (!apiKey) {
  await writeJson({
    verdict: 'not_run',
    error: 'missing_openai_api_key',
    message: 'Set OPENAI_API_KEY in the local/backend environment before running ChatGPT UI review.',
    screenshotDir,
    outputPath
  });
  console.error(`ChatGPT UI review not run: missing OPENAI_API_KEY. Wrote ${outputPath}`);
  process.exit(2);
}

const images = await Promise.all(screenshotFiles.map(async ([name, label]) => {
  const path = join(screenshotDir, `${name}.png`);
  if (!existsSync(path)) {
    throw new Error(`Missing screenshot: ${path}. Run "npm run build:h5" and "npm run visual:smoke" first.`);
  }
  const base64 = await readFile(path, 'base64');
  return { name, label, dataUrl: `data:image/png;base64,${base64}` };
}));

const reviewPrompt = `
你是成分镜小程序的产品体验评审。请从普通消费者角度审查截图，不要写泛泛建议。

产品目标：
- 用户拍食品包装后，直接得到购买/食用决策，减少自己判断、对比、查资料。
- 主路径是：拍食品包装 -> 商品身份/标签识别 -> 购买建议；本期不支持历史、收藏和单成分搜索入口。

重点检查：
1. 是否一眼看得懂。
2. 是否有购买/食用决策价值。
3. 文字是否太多或重复。
4. 按钮/布局是否怪异、重叠或溢出。
5. 普通人是否还需要自己判断。
6. 报告是否只保留“该不该买、风险原因、替代推荐”三卡，且没有原文、技术字段或长篇解释。
7. 首页是否只有拍照识别入口，不像落地页。
8. 手动补充页是否不像错误页，且不用让用户觉得所有字段都必须填。
9. 信息不足报告是否明确告诉用户下一步补拍什么。

红线：
- 不建议恢复设置说明页。
- 不建议恢复“查单个成分”入口。
- 不建议输出医疗诊断、法规权威结论、绝对安全/有害等表述。

请只返回 JSON，格式：
{
  "verdict": "pass" | "needs_changes",
  "topIssues": [
    {"severity":"high|medium|low","page":"页面名","issue":"问题","suggestedChange":"具体改法"}
  ],
  "pageReviews": [
    {"page":"页面名","score":1-10,"notes":"一句话评价"}
  ],
  "shipBlockers": ["阻断发布的问题，没有则空数组"],
  "summary": "总体结论"
}
`;

const response = await fetch(`${baseUrl}/responses`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: reviewPrompt },
          ...images.flatMap((image) => [
            { type: 'input_text', text: `截图：${image.label} (${image.name}.png)` },
            { type: 'input_image', image_url: image.dataUrl }
          ])
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'complens_ui_review',
        strict: true,
        schema: reviewSchema
      }
    },
    max_output_tokens: 1800
  })
});

const payload = await response.json().catch(() => null);
if (!response.ok) {
  await writeJson({
    verdict: 'not_run',
    error: 'openai_request_failed',
    status: response.status,
    message: payload?.error?.message || response.statusText,
    screenshotDir,
    model
  });
  throw new Error(`ChatGPT UI review failed: ${response.status} ${payload?.error?.message || response.statusText}`);
}

const content = extractText(payload);
const review = parseJson(content);
await writeJson({
  ...review,
  provider: 'openai',
  model,
  screenshotDir
});
console.log(JSON.stringify(review, null, 2));
console.log(`ChatGPT UI review written to ${outputPath}`);

function extractText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const chunks = Array.isArray(payload?.output)
    ? payload.output.flatMap((item) => Array.isArray(item.content) ? item.content : [])
    : [];
  return chunks
    .map((item) => item.text || item.content || '')
    .filter(Boolean)
    .join('\n');
}

function parseJson(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('ChatGPT UI review returned empty text.');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) throw new Error(`ChatGPT UI review returned non-JSON text: ${text.slice(0, 200)}`);
    return JSON.parse(match[0]);
  }
}

async function writeJson(value) {
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
