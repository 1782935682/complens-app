import type { NormalizedOcrResult, OcrTextBlock } from '@/utils/ocrAdapter';
import { normalizeOcrResult } from '@/utils/ocrAdapter';

export interface OcrLayoutLine {
  id: string;
  index: number;
  text: string;
  compactText: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  confidence?: number;
  blockIndexes: number[];
}

export interface OcrLayoutSection {
  id: string;
  startLine: number;
  endLine: number;
  text: string;
  lines: OcrLayoutLine[];
}

export interface OcrLayout {
  source: NormalizedOcrResult['source'];
  rawText: string;
  blocks: OcrTextBlock[];
  lines: OcrLayoutLine[];
  sections: OcrLayoutSection[];
}

export function buildOcrLayout(input: NormalizedOcrResult | string): OcrLayout {
  const normalized = typeof input === 'string' ? normalizeOcrResult(input) : input;
  const blocks = [...(normalized.blocks || [])];
  const lines = buildLines(normalized.rawText, blocks);
  return {
    source: normalized.source,
    rawText: normalized.rawText,
    blocks,
    lines,
    sections: groupLinesIntoSections(lines)
  };
}

function buildLines(rawText: string, blocks: OcrTextBlock[]): OcrLayoutLine[] {
  const coordinateLines = buildLinesFromBlocks(blocks);
  if (coordinateLines.length) return coordinateLines;
  return splitTextLines(rawText).map((text, index) => ({
    id: `line-${index}`,
    index,
    text,
    compactText: compact(text),
    blockIndexes: []
  }));
}

function buildLinesFromBlocks(blocks: OcrTextBlock[]): OcrLayoutLine[] {
  if (!blocks.length || !blocks.some((block) => typeof block.y === 'number' || typeof block.x === 'number')) return [];

  const rows: Array<{ y: number; blocks: Array<OcrTextBlock & { blockIndex: number }> }> = [];
  blocks.forEach((block, blockIndex) => {
    const y = block.y ?? 0;
    const height = block.height ?? 16;
    const tolerance = Math.max(10, height * 0.7);
    const row = rows.find((item) => Math.abs(item.y - y) <= tolerance);
    if (row) {
      row.blocks.push({ ...block, blockIndex });
      row.y = (row.y * (row.blocks.length - 1) + y) / row.blocks.length;
    } else {
      rows.push({ y, blocks: [{ ...block, blockIndex }] });
    }
  });

  const rowLines = rows
    .sort((left, right) => left.y - right.y)
    .flatMap((row) => {
      const sorted = row.blocks.sort((left, right) => (left.x ?? 0) - (right.x ?? 0));
      return splitRowIntoSegments(sorted).map((segment) => buildLineFromBlocks(segment));
    })
    .filter((line) => line.text);

  return rowLines.map((line, index) => ({
    ...line,
    id: `line-${index}`,
    index
  }));
}

function splitRowIntoSegments(blocks: Array<OcrTextBlock & { blockIndex: number }>): Array<Array<OcrTextBlock & { blockIndex: number }>> {
  if (blocks.length <= 1) return [blocks];

  const segments: Array<Array<OcrTextBlock & { blockIndex: number }>> = [];
  let buffer: Array<OcrTextBlock & { blockIndex: number }> = [];

  for (const block of blocks) {
    const previous = buffer[buffer.length - 1];
    if (previous && shouldSplitRowSegment(buffer, block, blocks)) {
      segments.push(buffer);
      buffer = [];
    }
    buffer.push(block);
  }
  if (buffer.length) segments.push(buffer);
  return segments;
}

function shouldSplitRowSegment(
  leftBlocks: Array<OcrTextBlock & { blockIndex: number }>,
  nextBlock: OcrTextBlock & { blockIndex: number },
  rowBlocks: Array<OcrTextBlock & { blockIndex: number }>
): boolean {
  const previous = leftBlocks[leftBlocks.length - 1];
  if (previous.x === undefined || previous.width === undefined || nextBlock.x === undefined) return false;

  const gap = nextBlock.x - (previous.x + previous.width);
  const medianHeight = medianDefined(rowBlocks.map((block) => block.height)) ?? 16;
  const threshold = Math.max(96, medianHeight * 5);
  if (gap <= threshold) return false;

  const rightBlocks = rowBlocks.slice(rowBlocks.indexOf(nextBlock));
  const rightText = rightBlocks.map((block) => normalizeText(block.text)).filter(Boolean).join(' ');
  const nextText = normalizeText(nextBlock.text);
  return looksLikeIndependentLabelRegion(nextText) || looksLikeIndependentLabelRegion(rightText);
}

function buildLineFromBlocks(blocks: Array<OcrTextBlock & { blockIndex: number }>): OcrLayoutLine {
  const text = blocks
    .map((block) => normalizeText(block.text))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([，、。；：:])/g, '$1')
    .trim();
  const minX = minDefined(blocks.map((block) => block.x));
  const minY = minDefined(blocks.map((block) => block.y));
  const maxRight = maxDefined(blocks.map((block) => block.x !== undefined && block.width !== undefined ? block.x + block.width : undefined));
  const maxBottom = maxDefined(blocks.map((block) => block.y !== undefined && block.height !== undefined ? block.y + block.height : undefined));
  return {
    id: 'line-pending',
    index: -1,
    text,
    compactText: compact(text),
    x: minX,
    y: minY,
    width: minX !== undefined && maxRight !== undefined ? maxRight - minX : undefined,
    height: minY !== undefined && maxBottom !== undefined ? maxBottom - minY : undefined,
    confidence: averageDefined(blocks.map((block) => block.confidence)),
    blockIndexes: blocks.map((block) => block.blockIndex)
  };
}

function looksLikeIndependentLabelRegion(value: string): boolean {
  const text = normalizeText(value);
  if (!text) return false;
  if (sectionStartPattern.test(text)) return true;
  if (administrativePattern.test(text)) return true;
  if (nutritionRowPattern.test(text)) return true;
  if (ingredientListPattern.test(text) && commonIngredientPattern.test(text)) return true;
  return false;
}

function groupLinesIntoSections(lines: OcrLayoutLine[]): OcrLayoutSection[] {
  const sections: OcrLayoutSection[] = [];
  let buffer: OcrLayoutLine[] = [];

  const flush = () => {
    if (!buffer.length) return;
    sections.push({
      id: `section-${sections.length}`,
      startLine: buffer[0].index,
      endLine: buffer[buffer.length - 1].index,
      lines: buffer,
      text: buffer.map((line) => line.text).join('\n')
    });
    buffer = [];
  };

  for (const line of lines) {
    if (buffer.length && hasVisualGap(buffer[buffer.length - 1], line)) flush();
    buffer.push(line);
  }
  flush();
  return sections;
}

function hasVisualGap(previous: OcrLayoutLine, current: OcrLayoutLine): boolean {
  if (previous.y === undefined || current.y === undefined) return false;
  const previousBottom = previous.y + (previous.height ?? 16);
  const gap = current.y - previousBottom;
  return gap > Math.max(24, (previous.height ?? 16) * 1.4);
}

function splitTextLines(text: string): string[] {
  return normalizeText(text)
    .split(/\r?\n|[\u2028\u2029]/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function compact(value: string): string {
  return normalizeText(value).replace(/\s+/g, '');
}

function minDefined(values: Array<number | undefined>): number | undefined {
  const nums = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return nums.length ? Math.min(...nums) : undefined;
}

function maxDefined(values: Array<number | undefined>): number | undefined {
  const nums = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return nums.length ? Math.max(...nums) : undefined;
}

function averageDefined(values: Array<number | undefined>): number | undefined {
  const nums = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!nums.length) return undefined;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 1000) / 1000;
}

function medianDefined(values: Array<number | undefined>): number | undefined {
  const nums = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)).sort((left, right) => left - right);
  if (!nums.length) return undefined;
  const middle = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[middle] : (nums[middle - 1] + nums[middle]) / 2;
}

const sectionStartPattern = /[配护]\s*料\s*(?:表|衰)?|产品配料|食品配料|原料|ingredients?|ingr[eé]dients?|ingredientes?|ingredienti|zutaten|营养成分表|营养标签|营养成分|nutrition\s*(?:facts|information)|supplement\s*facts|项目\s+每\s*100|每\s*100\s*(?:g|克|ml|毫升)|per\s*100|NRV|品\s*名|产品名称|商品名称|食品名称|品牌|规格|净含量/i;
const administrativePattern = /生产日期|制造日期|保质期|赏味期限|有效期|批号|贮存|储存|产地|生产商|制造商|经销商|厂商|地址|电话|执行标准|食品生产许可证|食用方法|注意事项|MFG|EXP|BBE|best\s*before|use\s*by/i;
const nutritionRowPattern = /(能量|热量|蛋白质|脂肪|碳水化合物|碳水|糖|钠|膳食纤维|盐|energy|calories|protein|fat|carbohydrate|sugars?|sodium|fiber|fibre|salt)[^\n]{0,36}\d+(?:[\.,]\d+)?\s*(?:kJ|kj|KJ|kcal|g|mg|克|毫克|千焦|千卡|%)?/i;
const ingredientListPattern = /[、，,;；]/;
const commonIngredientPattern = /水|白砂糖|食用盐|食盐|植物油|小麦粉|淀粉|奶粉|乳粉|生牛乳|食品添加剂|香精|色素|防腐剂|增稠剂|甜味剂|酸度调节剂|乳化剂|flour|sugar|salt|oil|milk|water|starch|glucose|dextrose/i;
