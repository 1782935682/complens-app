import { clearStoredImageMemory, deleteStoredImage, saveFileImageData, saveInlineImageData } from '@/platform/imageStore';
import { readJson, writeJson } from '@/platform/storage';
import type { LabelReport, LocalImageAsset, RecognitionHistoryItem, ReportFeedback, ReportFeedbackReason, ScanDraft } from '@/types';

const DRAFT_KEY = 'complens:user-scan-draft';
const REPORTS_KEY = 'complens:user-label-reports';
const RECOGNITION_HISTORY_KEY = 'complens:user-recognition-history';
const REPORT_FEEDBACK_KEY = 'complens:user-report-feedback';
const MAX_REPORTS = 20;
const MAX_RECOGNITION_HISTORY = 60;
const MAX_REPORT_FEEDBACK = 50;

export function getDefaultDraft(): ScanDraft {
  return {
    labelType: 'unknown_label',
    confirmedText: '',
    productName: '',
    foodTypeText: '',
    productionDateText: '',
    ingredients: [],
    nutrition: [],
    matches: [],
    frontClaimsText: '',
    updatedAt: new Date().toISOString()
  };
}

export function getScanDraft(): ScanDraft {
  return readJson<ScanDraft>(DRAFT_KEY, getDefaultDraft());
}

export function setFastScanMode(enabled: boolean): ScanDraft {
  return saveScanDraft({ isFastScan: enabled });
}

export function saveScanDraft(partial: Partial<ScanDraft>): ScanDraft {
  const next = {
    ...getScanDraft(),
    ...partial,
    updatedAt: new Date().toISOString()
  };
  writeJson(DRAFT_KEY, toPersistedDraft(next));
  return next;
}

export function resetScanDraft(): ScanDraft {
  const previousImage = getScanDraft().image;
  const next = getDefaultDraft();
  clearStoredImageMemory();
  void deleteStoredImage(previousImage);
  writeJson(DRAFT_KEY, next);
  return next;
}

export function getReports(): LabelReport[] {
  return readJson<LabelReport[]>(REPORTS_KEY, []).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getReportById(id: string): LabelReport | undefined {
  return getReports().find((report) => report.id === id);
}

export function saveReport(report: LabelReport): LabelReport[] {
  const next = [toPersistedReport(report), ...getReports().filter((item) => item.id !== report.id)].slice(0, MAX_REPORTS);
  writeReportsWithRetry(next);
  return next;
}

export function deleteReport(id: string): LabelReport[] {
  const next = getReports().filter((report) => report.id !== id);
  writeReportsWithRetry(next);
  return next;
}

export function clearReports(): LabelReport[] {
  writeReportsWithRetry([]);
  return [];
}

export function getRecognitionHistory(): RecognitionHistoryItem[] {
  return readJson<RecognitionHistoryItem[]>(RECOGNITION_HISTORY_KEY, [])
    .map(normalizeRecognitionHistoryItem)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function findRecognitionHistory(input: { normalizedCode?: string; qrContent?: string; productName?: string }): RecognitionHistoryItem | undefined {
  const normalizedCode = String(input.normalizedCode || '').trim();
  const qrContent = String(input.qrContent || '').trim();
  const productName = normalizeProductSearchName(input.productName);
  return getRecognitionHistory().find((item) => {
    if (normalizedCode && item.normalizedCode === normalizedCode) return true;
    if (qrContent && item.qrContent === qrContent) return true;
    return Boolean(productName && normalizeProductSearchName(item.productName) === productName);
  });
}

export function saveRecognitionHistory(input: Omit<RecognitionHistoryItem, 'id' | 'updatedAt'> & { id?: string; updatedAt?: string }): RecognitionHistoryItem[] {
  const now = new Date().toISOString();
  const normalized = normalizeRecognitionHistoryItem({
    ...input,
    id: input.id || buildRecognitionHistoryId(input),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now
  });
  const previous = getRecognitionHistory();
  const mergeIndex = previous.findIndex((item) => shouldMergeRecognitionHistory(item, normalized));
  const merged = mergeIndex >= 0
    ? mergeRecognitionHistory(previous[mergeIndex], normalized, now)
    : normalized;
  const next = [
    merged,
    ...previous.filter((_, index) => index !== mergeIndex && _.id !== merged.id)
  ].slice(0, MAX_RECOGNITION_HISTORY);
  writeJson(RECOGNITION_HISTORY_KEY, next);
  return next;
}

export function toggleReportFavorite(id: string, favorite?: boolean): LabelReport | undefined {
  let updated: LabelReport | undefined;
  const now = new Date().toISOString();
  const next = getReports().map((report) => {
    if (report.id !== id) return report;
    const isFavorite = typeof favorite === 'boolean' ? favorite : !report.isFavorite;
    updated = {
      ...report,
      isFavorite,
      favoritedAt: isFavorite ? (report.favoritedAt || now) : undefined
    };
    return updated;
  });
  if (updated) writeReportsWithRetry(next);
  return updated;
}

export function getReportFeedbackQueue(): ReportFeedback[] {
  return readJson<ReportFeedback[]>(REPORT_FEEDBACK_KEY, []).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function saveReportFeedback(input: {
  report: LabelReport;
  reason: ReportFeedbackReason;
  note?: string;
  source: ReportFeedback['source'];
}): ReportFeedback {
  const now = new Date().toISOString();
  const feedback: ReportFeedback = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reportId: input.report.id,
    reportTitle: input.report.title || '食品标签解读',
    productName: input.report.productName || '未命名食品',
    reason: input.reason,
    reasonLabel: reportFeedbackReasonLabel(input.reason),
    note: String(input.note || '').trim().slice(0, 160),
    source: input.source,
    status: 'queued',
    createdAt: now
  };
  const next = [feedback, ...getReportFeedbackQueue()].slice(0, MAX_REPORT_FEEDBACK);
  writeJson(REPORT_FEEDBACK_KEY, next);
  return feedback;
}

export function clearReportFeedbackQueue(): ReportFeedback[] {
  writeJson(REPORT_FEEDBACK_KEY, []);
  return [];
}

export function buildReportFeedbackExportText(items = getReportFeedbackQueue()): string {
  if (!items.length) return '成分镜反馈清单\n暂无反馈记录。';
  const reasonCounts = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.reasonLabel] = (counts[item.reasonLabel] || 0) + 1;
    return counts;
  }, {});
  const summary = Object.entries(reasonCounts)
    .map(([label, count]) => `${label} ${count} 条`)
    .join('；');
  const lines = [
    '成分镜反馈清单',
    `共 ${items.length} 条`,
    `问题类型：${summary}`,
    '',
    ...items.slice(0, MAX_REPORT_FEEDBACK).map((item, index) => {
      const note = item.note ? `；备注：${item.note}` : '';
      return `${index + 1}. ${formatFeedbackDate(item.createdAt)}｜${item.productName}｜${item.reasonLabel}${note}`;
    })
  ];
  return lines.join('\n');
}

export function reportFeedbackReasonLabel(reason: ReportFeedbackReason): string {
  if (reason === 'ocr_wrong') return '识别错了';
  if (reason === 'missing_text') return '漏了内容';
  if (reason === 'unclear_explanation') return '解释不清楚';
  return '其他问题';
}

function formatFeedbackDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

function writeReportsWithRetry(reports: LabelReport[]): void {
  try {
    writeJson(REPORTS_KEY, reports.slice(0, MAX_REPORTS));
  } catch {
    try {
      writeJson(REPORTS_KEY, reports.slice(0, Math.max(0, MAX_REPORTS - 1)));
    } catch {
      // Storage may be full or unavailable on device; keep the current session alive.
    }
  }
}

function buildRecognitionHistoryId(input: Pick<RecognitionHistoryItem, 'normalizedCode' | 'qrContent' | 'imageId'>): string {
  if (input.normalizedCode) return `product-code-${input.normalizedCode}`;
  if (input.qrContent) return `product-qr-${hashText(input.qrContent)}`;
  return `product-image-${input.imageId || Date.now().toString(36)}`;
}

function shouldMergeRecognitionHistory(left: RecognitionHistoryItem, right: RecognitionHistoryItem): boolean {
  if (left.normalizedCode && right.normalizedCode && left.normalizedCode === right.normalizedCode) return true;
  if (left.qrContent && right.qrContent && left.qrContent === right.qrContent) return true;
  const leftName = normalizeProductSearchName(left.productName);
  const rightName = normalizeProductSearchName(right.productName);
  if (leftName && rightName && leftName === rightName) return true;
  return false;
}

function mergeRecognitionHistory(previous: RecognitionHistoryItem, next: RecognitionHistoryItem, updatedAt: string): RecognitionHistoryItem {
  const mergedHasNonAiLabelText = !next.usedAiSearch && Boolean(next.ingredientsText || next.nutritionText);
  return normalizeRecognitionHistoryItem({
    ...previous,
    ...next,
    id: previous.id,
    imageId: next.imageId || previous.imageId,
    detectedType: next.detectedType || previous.detectedType,
    rawContent: next.rawContent || previous.rawContent,
    ocrText: next.ocrText || previous.ocrText,
    normalizedCode: next.normalizedCode || previous.normalizedCode,
    qrContent: next.qrContent || previous.qrContent,
    productName: next.productName || previous.productName,
    brand: next.brand || previous.brand,
    ingredientsText: next.ingredientsText || previous.ingredientsText,
    nutritionText: next.nutritionText || previous.nutritionText,
    source: Array.from(new Set([...(previous.source || []), ...(next.source || [])])),
    reportSummary: next.reportSummary || previous.reportSummary,
    usedAiSearch: mergedHasNonAiLabelText ? false : Boolean(previous.usedAiSearch || next.usedAiSearch),
    aiNotice: next.aiNotice || previous.aiNotice,
    aiSearchErrorCode: next.aiSearchErrorCode || previous.aiSearchErrorCode,
    createdAt: previous.createdAt || next.createdAt,
    updatedAt
  });
}

function normalizeRecognitionHistoryItem(item: RecognitionHistoryItem): RecognitionHistoryItem {
  const now = new Date().toISOString();
  return {
    id: String(item.id || '').trim() || buildRecognitionHistoryId(item),
    imageId: String(item.imageId || '').trim(),
    detectedType: item.detectedType || 'unknown',
    rawContent: String(item.rawContent || '').trim(),
    ocrText: String(item.ocrText || '').trim(),
    normalizedCode: String(item.normalizedCode || '').trim(),
    qrContent: String(item.qrContent || '').trim(),
    productName: String(item.productName || '').trim(),
    brand: String(item.brand || '').trim(),
    ingredientsText: String(item.ingredientsText || '').trim(),
    nutritionText: String(item.nutritionText || '').trim(),
    source: Array.isArray(item.source) ? Array.from(new Set(item.source)).slice(0, 5) : [],
    reportSummary: String(item.reportSummary || '').trim(),
    usedAiSearch: Boolean(item.usedAiSearch),
    aiNotice: String(item.aiNotice || '').trim(),
    aiSearchErrorCode: String(item.aiSearchErrorCode || '').trim(),
    createdAt: String(item.createdAt || '').trim() || now,
    updatedAt: String(item.updatedAt || '').trim() || item.createdAt || now
  };
}

function normalizeSearchText(value = ''): string {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function normalizeProductSearchName(value = ''): string {
  const normalized = normalizeSearchText(value);
  if (!normalized || genericProductNames.has(normalized)) return '';
  if (/^(未命名|未识别|未知|包装正面|食品标签|商品|这款食品)/.test(normalized)) return '';
  return normalized;
}

const genericProductNames = new Set([
  '未命名食品',
  '未识别商品',
  '未知食品',
  '食品标签解读',
  '包装正面',
  '这款食品'
]);

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function toPersistedReport(report: LabelReport): LabelReport {
  if (!report.analysisSource?.imagePath && !report.analysisSource?.imageSummary) return report;
  const { imagePath: _imagePath, imageSummary: _imageSummary, ...analysisSource } = report.analysisSource;
  return {
    ...report,
    analysisSource
  };
}

function toPersistedDraft(draft: ScanDraft): ScanDraft {
  return {
    ...draft,
    image: toPersistedImage(draft.image)
  };
}

function toPersistedImage(image?: LocalImageAsset): LocalImageAsset | undefined {
  if (!image) return undefined;
  const { file, ...imageMeta } = image;
  if (file && saveFileImageData(image)) {
    return {
      ...imageMeta,
      storage: 'h5-file',
      tempFilePath: ''
    };
  }
  if (isInlineImageDataUrl(imageMeta.tempFilePath) && saveInlineImageData(image)) {
    return {
      ...imageMeta,
      storage: 'h5-file',
      tempFilePath: ''
    };
  }
  return {
    ...imageMeta
  };
}

function isInlineImageDataUrl(path: string): boolean {
  return /^data:image\//i.test(path);
}
