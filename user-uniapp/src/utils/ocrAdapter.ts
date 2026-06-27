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
  source: 'wechat' | 'external' | 'fixture' | 'mock' | 'manual' | 'unknown';
};

export type OcrEvidenceSourceLine = {
  lineNumber: number;
  text: string;
  matchedTerm: string;
  found: boolean;
};

type OcrLikeInput = Partial<OcrResult> & {
  text?: string;
  rawText?: string;
  blocks?: OcrLikeBlock[];
  provider?: OcrResult['provider'] | string;
  mode?: OcrResult['mode'] | string;
};

type OcrLikeBlock = Partial<OcrBlock> & {
  text?: string;
  box?: Array<[number, number]> | Array<Array<number>>;
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

export function normalizeOcrEvidenceText(value: unknown): string {
  return normalizeText(value)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function extractOcrTextSnippet(rawText: string, terms: string[], maxLength = 120): string {
  const text = normalizeOcrEvidenceText(rawText).replace(/\s+/g, ' ');
  if (!text) return '';
  const candidates = terms
    .map((term) => normalizeText(term))
    .filter((term) => term.length >= 2)
    .sort((left, right) => right.length - left.length);
  const lowerText = text.toLowerCase();
  const matchedTerm = candidates.find((term) => lowerText.includes(term.toLowerCase()));
  if (!matchedTerm) return clipText(text, maxLength);

  const index = lowerText.indexOf(matchedTerm.toLowerCase());
  const sideLength = Math.max(20, Math.floor((maxLength - matchedTerm.length) / 2));
  const start = Math.max(0, index - sideLength);
  const end = Math.min(text.length, index + matchedTerm.length + sideLength);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function extractOcrSourceLine(rawText: string, terms: string[]): OcrEvidenceSourceLine {
  const lines = splitOcrEvidenceLines(rawText);
  if (!lines.length) return { lineNumber: 0, text: '', matchedTerm: '', found: false };

  const candidates = terms
    .map((term) => normalizeText(term))
    .filter((term) => term.length >= 2)
    .sort((left, right) => right.length - left.length);
  const matched = candidates.length
    ? lines
      .map((line) => ({
        line,
        matchedTerm: candidates.find((term) => line.text.toLowerCase().includes(term.toLowerCase())) || ''
      }))
      .find((item) => item.matchedTerm)
    : undefined;

  if (matched) {
    return {
      lineNumber: matched.line.lineNumber,
      text: matched.line.text,
      matchedTerm: matched.matchedTerm,
      found: true
    };
  }

  return {
    lineNumber: lines[0].lineNumber,
    text: lines[0].text,
    matchedTerm: '',
    found: false
  };
}

export function splitOcrEvidenceLines(value: unknown): Array<{ lineNumber: number; text: string }> {
  return normalizeOcrEvidenceText(value)
    .split(/\r?\n|[\u2028\u2029]/)
    .map((line, index) => ({
      lineNumber: index + 1,
      text: normalizeText(line)
    }))
    .filter((line) => line.text);
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

function normalizeBlocks(blocks: OcrLikeBlock[], rawText: string): OcrTextBlock[] {
  const result = blocks
    .map((block) => {
      const boxBounds = getBoxBounds(block.box);
      return {
        text: normalizeText(block.text || ''),
        x: toOptionalNumber(block.x) ?? boxBounds?.x,
        y: toOptionalNumber(block.y) ?? boxBounds?.y,
        width: toOptionalNumber(block.width) ?? boxBounds?.width,
        height: toOptionalNumber(block.height) ?? boxBounds?.height,
        confidence: toOptionalNumber(block.confidence)
      };
    })
    .filter((block) => block.text);

  if (result.length) return result;
  return normalizeFromText(rawText, 'unknown').blocks;
}

function getBoxBounds(box: OcrLikeBlock['box']): Pick<OcrTextBlock, 'x' | 'y' | 'width' | 'height'> | undefined {
  if (!Array.isArray(box)) return undefined;
  const points = box
    .map((point) => Array.isArray(point) ? { x: Number(point[0]), y: Number(point[1]) } : undefined)
    .filter((point): point is { x: number; y: number } => Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y)));
  if (!points.length) return undefined;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
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
  if (input.provider === 'fixture') return 'fixture';
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

function clipText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  return `${text.slice(0, maxLength - 3)}...`;
}

function toOptionalNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}
