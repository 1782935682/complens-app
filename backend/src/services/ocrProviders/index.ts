export const supportedOcrProviders = ['manual', 'mock', 'aliyun', 'paddleocr', 'rapidocr'] as const;

export type OcrProviderName = typeof supportedOcrProviders[number];

export type OcrProviderInput = {
  imageBase64: string;
  mimeType: string;
  category: string;
};

export type OcrProviderResult = {
  text: string;
  confidence: number;
  provider: OcrProviderName;
  blocks: Array<{
    text: string;
    confidence: number;
  }>;
};

export function normalizeOcrProvider(value: string | undefined): OcrProviderName {
  const normalized = String(value || '').trim().toLowerCase();
  return supportedOcrProviders.includes(normalized as OcrProviderName)
    ? normalized as OcrProviderName
    : 'aliyun';
}

export function isRealOcrProvider(provider: OcrProviderName) {
  return provider === 'aliyun' || provider === 'paddleocr' || provider === 'rapidocr';
}

export async function recognizeWithOcrProvider(provider: OcrProviderName, input: OcrProviderInput): Promise<OcrProviderResult | null> {
  if (provider === 'mock') return buildMockOcrResult(input);
  return null;
}

function buildMockOcrResult(input: OcrProviderInput): OcrProviderResult {
  const text = input.category === 'food'
    ? '水，柠檬酸，山梨酸钾'
    : '水，甘油，烟酰胺';
  return {
    text,
    confidence: 0.92,
    provider: 'mock',
    blocks: [
      {
        text,
        confidence: 0.92
      }
    ]
  };
}
