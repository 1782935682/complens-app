import type { AiCompletionRequest, AiCompletionResponse, AiProvider, AiProviderConfig, AiProviderName } from '../types.js';

export class OpenAICompatibleProvider implements AiProvider {
  readonly name: AiProviderName;
  private readonly config: AiProviderConfig;

  constructor(config: AiProviderConfig, name: AiProviderName = 'openai-compatible') {
    this.config = config;
    this.name = name;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const startedAt = Date.now();
    const model = request.model || this.config.model || '';
    if (!this.config.apiKey) {
      return this.errorResponse(model, startedAt, 'missing_api_key', `${this.name} api key is not configured`);
    }
    if (!this.config.baseUrl) {
      return this.errorResponse(model, startedAt, 'missing_base_url', `${this.name} base url is not configured`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs || this.config.timeoutMs);
    try {
      const response = await fetch(buildUrl(this.config.baseUrl, this.config.requestPath || '/chat/completions'), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          ...this.config.headers
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt }
          ],
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 1200,
          response_format: request.responseFormat?.type === 'json_object' ? { type: 'json_object' } : undefined
        })
      });
      const rawText = await response.text();
      if (!response.ok) {
        return this.errorResponse(model, startedAt, `http_${response.status}`, rawText.slice(0, 500));
      }
      const parsed = JSON.parse(rawText) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const content = String(parsed.choices?.[0]?.message?.content || '').trim();
      return {
        provider: this.name,
        model,
        content,
        rawText,
        usage: {
          inputTokens: parsed.usage?.prompt_tokens,
          outputTokens: parsed.usage?.completion_tokens,
          totalTokens: parsed.usage?.total_tokens
        },
        latencyMs: Date.now() - startedAt,
        success: Boolean(content)
      };
    } catch (error) {
      return this.errorResponse(model, startedAt, error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'request_failed', getErrorMessage(error));
    } finally {
      clearTimeout(timeout);
    }
  }

  private errorResponse(model: string, startedAt: number, errorCode: string, errorMessage: string): AiCompletionResponse {
    return {
      provider: this.name,
      model,
      content: '',
      rawText: '',
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode,
      errorMessage
    };
  }
}

export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(config: AiProviderConfig) {
    super(config, 'deepseek');
  }
}

function buildUrl(baseUrl: string, requestPath: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${requestPath.replace(/^\//, '')}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'request_failed');
}
