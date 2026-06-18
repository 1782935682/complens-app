import { clearStoredImageMemory, deleteStoredImage, saveFileImageData, saveInlineImageData } from '@/platform/imageStore';
import { readJson, writeJson } from '@/platform/storage';
import type { LabelReport, LocalImageAsset, ScanDraft } from '@/types';

const DRAFT_KEY = 'complens:user-scan-draft';
const REPORTS_KEY = 'complens:user-label-reports';
const MAX_REPORTS = 20;

export function getDefaultDraft(): ScanDraft {
  return {
    labelType: 'unknown_label',
    confirmedText: '',
    productName: '',
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
