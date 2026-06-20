export type AiProviderName = 'mock' | 'deepseek' | 'openai-compatible' | 'claude' | 'gemini';

export type AiResponseFormat = {
  type: 'json_object' | 'json_schema' | 'text';
  jsonSchema?: unknown;
};

export type AiCompletionRequest = {
  provider?: AiProviderName | 'auto';
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: AiResponseFormat;
  timeoutMs?: number;
  traceId?: string;
};

export type AiCompletionResponse = {
  provider: AiProviderName;
  model: string;
  content: string;
  rawText: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export type AiProviderConfig = {
  provider: AiProviderName;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  requestPath?: string;
  headers?: Record<string, string>;
  timeoutMs: number;
};

export type AiProvider = {
  name: AiProviderName;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
};
