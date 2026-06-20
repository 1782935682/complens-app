import type { AiProvider, AiProviderConfig, AiProviderName } from './types.js';
import { MockProvider } from './providers/mockProvider.js';
import { DeepSeekProvider, OpenAICompatibleProvider } from './providers/openAiCompatibleProvider.js';
import { UnimplementedProvider } from './providers/placeholders.js';

export type AiGatewayConfig = {
  enabled: boolean;
  defaultProvider: AiProviderName;
  fallbackProvider: AiProviderName;
  timeoutMs: number;
  maxRetry: number;
  providers: Partial<Record<AiProviderName, AiProviderConfig>>;
};

export class AiProviderRegistry {
  private readonly providers = new Map<AiProviderName, AiProvider>();

  register(provider: AiProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: AiProviderName): AiProvider | undefined {
    return this.providers.get(name);
  }
}

export function createAiProviderRegistry(config: AiGatewayConfig): AiProviderRegistry {
  const registry = new AiProviderRegistry();
  registry.register(new MockProvider(config.providers.mock?.model));
  registry.register(new DeepSeekProvider(config.providers.deepseek || {
    provider: 'deepseek',
    timeoutMs: config.timeoutMs
  }));
  registry.register(new OpenAICompatibleProvider(config.providers['openai-compatible'] || {
    provider: 'openai-compatible',
    timeoutMs: config.timeoutMs
  }));
  registry.register(new UnimplementedProvider('claude'));
  registry.register(new UnimplementedProvider('gemini'));
  return registry;
}
