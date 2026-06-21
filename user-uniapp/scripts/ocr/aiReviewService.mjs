export const aiReviewProviders = [
  {
    id: 'chatgpt',
    envKey: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_REVIEW_MODEL',
    defaultModel: 'gpt-4.1-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  {
    id: 'deepseek',
    envKey: 'DEEPSEEK_API_KEY',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/chat/completions'
  }
];

export async function reviewOcrSampleWithProviders(sample, options = {}) {
  const results = [];
  for (const provider of aiReviewProviders) {
    results.push(await reviewOcrSample(provider, sample, options));
  }
  return results;
}

export async function reviewOcrSample(provider, sample, options = {}) {
  const apiKey = process.env[provider.envKey] || '';
  if (!apiKey) {
    if (provider.id === 'chatgpt') {
      return {
        provider: 'chatgpt-subagent',
        pass: false,
        score: 0,
        issues: ['pending_subagent_review: OPENAI_API_KEY 未配置，按用户要求等待当前 Codex 会话子 agent 执行 ChatGPT Review。'],
        suggestions: ['评测完成后由当前会话 spawn 子 agent 审核 reports/ocr/ocr-evaluation-report.json，并写入 reports/ocr_reviews/chatgpt-subagent-review.json。'],
        riskLevel: 'medium',
        skipped: false,
        pendingSubagentReview: true
      };
    }
    return {
      provider: provider.id,
      pass: false,
      score: 0,
      issues: [`skipped_missing_${provider.envKey.toLowerCase()}`],
      suggestions: [],
      riskLevel: 'medium',
      skipped: true
    };
  }

  const model = process.env[provider.modelEnv] || provider.defaultModel;
  const prompt = buildReviewPrompt(sample);
  const response = await fetch(provider.endpoint, {
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
          content: '你是严谨的食品包装 OCR 分区、报告生成和来源标注评审。只输出 JSON。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: options.maxTokens || 1400
    })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      provider: provider.id,
      pass: false,
      score: 0,
      issues: [`request_failed:${response.status}:${payload?.error?.message || response.statusText}`],
      suggestions: [],
      riskLevel: 'high',
      skipped: false
    };
  }
  return normalizeReview(provider.id, payload?.choices?.[0]?.message?.content || '');
}

export function summarizeAiReviews(reviewResults) {
  const byProvider = new Map();
  for (const result of reviewResults) {
    const list = byProvider.get(result.provider) || [];
    list.push(result);
    byProvider.set(result.provider, list);
  }
  return [...byProvider.entries()].map(([provider, items]) => {
    const scored = items.filter((item) => !item.skipped && !item.pendingSubagentReview && Number.isFinite(item.score));
    return {
      provider,
      total: items.length,
      skipped: items.filter((item) => item.skipped).length,
      passed: items.filter((item) => item.pass).length,
      averageScore: scored.length
        ? Math.round((scored.reduce((sum, item) => sum + item.score, 0) / scored.length) * 10) / 10
        : null,
      highRisk: items.filter((item) => item.riskLevel === 'high').length,
      mediumRisk: items.filter((item) => item.riskLevel === 'medium').length
    };
  });
}

function buildReviewPrompt(sample) {
  return `
请按普通用户真实使用场景，对这个食品包装 OCR 分区和商品分析报告做深度 Review。重点判断：
1. 配料表是否提取正确。
2. 营养成分表是否提取正确。
3. 是否误把广告语、卖点、生产信息当配料。
4. 是否误把营养成分当配料。
5. 报告是否过度推断。
6. AI 搜索信息是否明确标注来源。
7. 是否提示以包装实物为准。

评分边界：
- 只根据 OCR 原文可见信息评审，不要要求识别 OCR 原文中没有出现的商品名、品牌、规格、条码或二维码。
- expected 里的 productName、brand、codeInfo 可能来自样本元数据；如果 OCR 原文没有对应文字，actual 为空不应作为高风险问题。
- 如果 OCR 原文没有明确配料表/营养成分表锚点，且 expected 对应字段为空，系统输出 uncertain 或 otherText 是正确行为，不要要求硬猜配料或营养表。
- 只有当 actual.ingredientsText 明显包含营养表、广告语、生产日期、贮存条件、厂商地址、执行标准等内容时，才判为严重分区错误。
- 成分里出现 protein、sodium、calcium 等词不等于营养成分表；只有出现 Nutrition Facts、NRV、Calories/Total Fat 等表格字段或数值单位结构时，才算营养表误入配料。
- 若本地 errors 为空，且配料/营养/otherText 来源边界合理、报告没有过度推断，分数通常应不低于 85。

样本：
${JSON.stringify({
  sampleId: sample.sampleId,
  sourceUrl: sample.sourceUrl,
  category: sample.category,
  sampleQuality: sample.sampleQuality,
  ocrText: sample.ocrText,
  expected: sample.expected,
  actual: sample.actual,
  errors: sample.errors,
  reportSummary: sample.reportSummary || '',
  dataSource: sample.dataSource || ''
}, null, 2)}

请只输出严格 JSON：
{
  "provider": "${sample.provider || 'chatgpt/deepseek'}",
  "pass": true,
  "score": 0,
  "issues": [],
  "suggestions": [],
  "riskLevel": "low"
}
`;
}

function normalizeReview(provider, content) {
  const parsed = parseJson(content);
  return {
    provider,
    pass: Boolean(parsed.pass),
    score: clampScore(Number(parsed.score)),
    issues: Array.isArray(parsed.issues) ? parsed.issues.map(formatReviewItem) : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(formatReviewItem) : [],
    riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'medium',
    skipped: false
  };
}

function formatReviewItem(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${key}:${typeof item === 'object' ? JSON.stringify(item) : String(item)}`)
      .join(', ');
  }
  return String(value);
}

function parseJson(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('AI review returned empty text.');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) throw new Error(`AI review returned non-JSON text: ${text.slice(0, 200)}`);
    return JSON.parse(match[0]);
  }
}

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
