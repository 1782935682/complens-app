import { readJson, writeJson } from '@/platform/storage';
import type { LabelReport, ScanDraft } from '@/types';

const DRAFT_KEY = 'complens:user-scan-draft';
const REPORTS_KEY = 'complens:user-label-reports';

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
  const next = getDefaultDraft();
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
  const next = [report, ...getReports().filter((item) => item.id !== report.id)].slice(0, 100);
  writeJson(REPORTS_KEY, next);
  return next;
}

export function deleteReport(id: string): LabelReport[] {
  const next = getReports().filter((report) => report.id !== id);
  writeJson(REPORTS_KEY, next);
  return next;
}

function toPersistedDraft(draft: ScanDraft): ScanDraft {
  if (!draft.image?.file) return draft;
  const { file: _file, ...imageMeta } = draft.image;
  return {
    ...draft,
    image: imageMeta
  };
}
