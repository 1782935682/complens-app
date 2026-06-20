# AI Provider Design

## 目标

成分镜新增可扩展 AI Provider 网关层，用于把本地规则结果解释成普通消费者能理解的报告文案。AI 不做最终购买/食用等级判断，不生成法规或医疗结论。

链路：

```text
OCR 文本
→ 后端清洗与结构化
→ 本地规则引擎输出 decision / riskLevel / nutritionJudgement
→ AI Provider 仅做解释改写
→ 结果页展示消费决策卡片
```

## Provider 架构

后端新增：

- `backend/src/ai/types.ts`：统一 `AiProvider`、请求、响应和配置类型。
- `backend/src/ai/providerFactory.ts`：注册 `mock`、`deepseek`、`openai-compatible`，并预留 `claude`、`gemini`。
- `backend/src/ai/providers/openAiCompatibleProvider.ts`：兼容 OpenAI Chat Completions 格式的 Provider。
- `backend/src/ai/providers/mockProvider.ts`：本地开发和无 Key 降级。
- `backend/src/services/aiFoodExplanationService.ts`：业务层只调用解释服务，不直接调用具体模型。
- `backend/src/services/foodAnalyzeService.ts`：食品标签结构化、规则判断、AI 解释合并。
- `backend/src/routes/food.ts`：`POST /api/food/analyze`。

## 环境变量

默认无 Key 不会启动失败，开发环境可用 `mock` 或 rule-only。

```text
AI_ENABLED=false
AI_DEFAULT_PROVIDER=mock
AI_FALLBACK_PROVIDER=mock
AI_TIMEOUT_MS=20000
AI_MAX_RETRY=1

DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

OPENAI_COMPATIBLE_API_KEY=
OPENAI_COMPATIBLE_BASE_URL=
OPENAI_COMPATIBLE_MODEL=
OPENAI_COMPATIBLE_REQUEST_PATH=/v1/chat/completions

CLAUDE_API_KEY=
CLAUDE_MODEL=

GEMINI_API_KEY=
GEMINI_MODEL=
```

## DeepSeek 配置

DeepSeek 走 OpenAI-compatible 请求形态，但保留独立 `DeepSeekProvider`，便于后续加入供应商特有参数。

```text
AI_ENABLED=true
AI_DEFAULT_PROVIDER=deepseek
AI_FALLBACK_PROVIDER=mock
DEEPSEEK_API_KEY=服务端环境变量
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

## OpenAI-Compatible 配置

任何兼容 Chat Completions 的模型服务可用：

```text
AI_ENABLED=true
AI_DEFAULT_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_API_KEY=服务端环境变量
OPENAI_COMPATIBLE_BASE_URL=https://example.com
OPENAI_COMPATIBLE_MODEL=your-model
OPENAI_COMPATIBLE_REQUEST_PATH=/v1/chat/completions
```

## Claude / Gemini 扩展

当前只预留 Provider 名称和未实现占位类。后续接入时新增对应 provider 文件，并在 `createAiProviderRegistry` 注册即可。业务服务不需要改成直接依赖 Claude 或 Gemini。

## 规则与 AI 的关系

本地规则负责：

- `decision`
- `decisionText`
- `riskLevel`
- `nutritionJudgement`
- 关键原因、适合 / 不适合人群、吃法建议的基础结果

AI 负责：

- 把规则结果写成普通人能看懂的一句话结论。
- 解释糖、钠、脂肪、热量和添加剂为什么值得留意。
- 保持“别吓人，也别洗白”的口径。

AI 不允许覆盖本地规则里的最终等级，也不允许编造未识别到的配料、营养数字、法规来源或医疗结论。

## 错误降级

- API Key 缺失：降级到 `mock` 或 rule-only。
- Provider 超时：返回 rule-only。
- 非 JSON 输出：尝试提取 JSON；失败则 rule-only。
- OCR 文本不足：返回信息不足，不硬凑完整报告。
- 日志不记录 API Key，不打印完整 OCR 原文。

## 缓存

`AiFoodExplanationService` 第一版使用进程内缓存，key 基于结构化输入、规则结果、Provider 和 prompt version。后续接数据库缓存时沿用同一语义：

```text
sha256(ocrText + userProfile + ruleVersion + promptVersion + provider + model)
```

## 2026-06-20 补充：fallback 与缓存验收

- `AiFoodExplanationService` 现在先调用 `AI_DEFAULT_PROVIDER`，Provider 不存在或调用失败时再尝试 `AI_FALLBACK_PROVIDER`；例如 DeepSeek 未配置 Key 时会降级到 `mock`，仍返回规则优先的消费建议。
- 同一次结构化输入、规则结果、Provider 选择和 Prompt 版本命中进程内缓存时，不再重复请求第三方 Provider。
- 缓存 key 使用稳定序列化，避免对象字段顺序不同导致重复调用。
- 非 JSON 输出会尝试从文本中提取 JSON；仍失败时降级为 rule-only，不让 AI 错误影响 `decision`、`riskLevel` 和营养判断。
- 已新增 `backend/tests/aiFoodExplanation.test.ts`，覆盖缓存命中、缺 Key fallback、非 JSON 降级；`backend/tests/foodAnalyze.test.ts` 覆盖 `/api/food/analyze` 的 DeepSeek 缺 Key 到 Mock 降级路径。

## 不自动部署

本次只提交代码、测试和文档，不修改生产配置，不提交真实 API Key，不执行线上部署。
