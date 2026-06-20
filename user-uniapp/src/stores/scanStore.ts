import { clearStoredImageMemory, deleteStoredImage, saveFileImageData, saveInlineImageData } from '@/platform/imageStore';
import { readJson, writeJson } from '@/platform/storage';
import type { LabelReport, LocalImageAsset, ReportFeedback, ReportFeedbackReason, ScanDraft } from '@/types';

const DRAFT_KEY = 'complens:user-scan-draft';
const REPORTS_KEY = 'complens:user-label-reports';
const REPORT_FEEDBACK_KEY = 'complens:user-report-feedback';
const MAX_REPORTS = 20;
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
