import type { AiCompletionRequest, AiCompletionResponse, AiProvider, AiProviderName } from '../types.js';

export class UnimplementedProvider implements AiProvider {
  readonly name: AiProviderName;

  constructor(name: AiProviderName) {
    this.name = name;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    return {
      provider: this.name,
      model: request.model || '',
      content: '',
      rawText: '',
      latencyMs: 0,
      success: false,
      errorCode: 'provider_not_implemented',
      errorMessage: `${this.name} provider is reserved but not implemented yet`
    };
  }
}
