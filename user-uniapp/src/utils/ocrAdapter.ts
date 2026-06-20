import type { OcrBlock, OcrResult } from '@/types';

export type OcrTextBlock = {
  text: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  confidence?: number;
};

export type NormalizedOcrResult = {
  blocks: OcrTextBlock[];
  rawText: string;
  source: 'wechat' | 'external' | 'mock' | 'manual' | 'unknown';
};

type OcrLikeInput = Partial<OcrResult> & {
  text?: string;
  rawText?: string;
  blocks?: Array<Partial<OcrBlock> & { text?: string }>;
  provider?: OcrResult['provider'] | string;
  mode?: OcrResult['mode'] | string;
};

export function normalizeOcrResult(input: OcrLikeInput | string | undefined, preferredSource?: NormalizedOcrResult['source']): NormalizedOcrResult {
  if (typeof input === 'string') {
    return normalizeFromText(input, preferredSource || 'unknown');
  }

  const source = preferredSource || inferSource(input);
  const rawText = normalizeText(input?.rawText || input?.text || '');
  const normalizedBlocks = normalizeBlocks(input?.blocks || [], rawText);
  const sortedBlocks = sortBlocksForReading(normalizedBlocks);
  const blockText = groupBlocksIntoTextLines(sortedBlocks);

  return {
    source,
    blocks: sortedBlocks,
    rawText: normalizeText(rawText || blockText)
  };
}

export function normalizeManualText(text: string): NormalizedOcrResult {
  return normalizeFromText(text, 'manual');
}

function normalizeFromText(text: string, source: NormalizedOcrResult['source']): NormalizedOcrResult {
  const rawText = normalizeText(text);
  return {
    source,
    rawText,
    blocks: rawText
      .split(/\r?\n|[\u2028\u2029]/)
      .map((line) => normalizeText(line))
      .filter(Boolean)
      .map((line) => ({ text: line }))
  };
}

function normalizeBlocks(blocks: Array<Partial<OcrBlock> & { text?: string }>, rawText: string): OcrTextBlock[] {
  const result = blocks
    .map((block) => ({
      text: normalizeText(block.text || ''),
      x: toOptionalNumber(block.x),
      y: toOptionalNumber(block.y),
      width: toOptionalNumber(block.width),
      height: toOptionalNumber(block.height),
      confidence: toOptionalNumber(block.confidence)
    }))
    .filter((block) => block.text);

  if (result.length) return result;
  return normalizeFromText(rawText, 'unknown').blocks;
}

function sortBlocksForReading(blocks: OcrTextBlock[]): OcrTextBlock[] {
  if (!blocks.some((block) => typeof block.y === 'number' || typeof block.x === 'number')) return blocks;
  return [...blocks].sort((left, right) => {
    const topDiff = (left.y ?? 0) - (right.y ?? 0);
    if (Math.abs(topDiff) > 8) return topDiff;
    return (left.x ?? 0) - (right.x ?? 0);
  });
}

function groupBlocksIntoTextLines(blocks: OcrTextBlock[]): string {
  if (!blocks.length) return '';
  if (!blocks.some((block) => typeof block.y === 'number' || typeof block.x === 'number')) {
    return blocks.map((block) => block.text).filter(Boolean).join('\n');
  }

  const rows: OcrTextBlock[][] = [];
  for (const block of blocks) {
    const y = block.y ?? 0;
    const height = block.height ?? 16;
    const tolerance = Math.max(10, height * 0.65);
    const row = rows.find((items) => {
      const averageY = items.reduce((sum, item) => sum + (item.y ?? 0), 0) / items.length;
      return Math.abs(averageY - y) <= tolerance;
    });
    if (row) {
      row.push(block);
    } else {
      rows.push([block]);
    }
  }

  return rows
    .map((row) => row
      .sort((left, right) => (left.x ?? 0) - (right.x ?? 0))
      .map((block) => block.text)
      .filter(Boolean)
      .join(' ')
      .replace(/\s+([，、。；：])/g, '$1')
      .trim())
    .filter(Boolean)
    .join('\n');
}

function inferSource(input: OcrLikeInput | undefined): NormalizedOcrResult['source'] {
  if (!input) return 'unknown';
  if (input.mode === 'manual' || input.provider === 'manual') return 'manual';
  if (input.mode === 'mock' || input.provider === 'mock') return 'mock';
  if (input.provider === 'aliyun' || input.provider === 'paddleocr' || input.provider === 'rapidocr') return 'external';
  return 'unknown';
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function toOptionalNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}
