import { normalizeText } from '../utils/text.js';
import { isPendingDataStatus } from '../utils/dataStatus.js';

const reviewQueueItemLimit = 12;

export function buildManualReviewQueue({ ingredients = [], reports = [], category = 'food' } = {}) {
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
  const safeReports = Array.isArray(reports) ? reports.filter((report) => !category || report.category === category) : [];
  const ocrItems = buildOcrQueueItems(safeReports);
  const rejectedCandidateItems = buildRejectedCandidateQueueItems(safeReports);
  const candidateItems = buildCandidateQueueItems(safeReports);
  const datasetItems = buildDatasetQueueItems(safeIngredients);

  return {
    summary: {
      totalCount: ocrItems.length + rejectedCandidateItems.length + candidateItems.length + datasetItems.length,
      ocrUnmatchedCount: ocrItems.length,
      rejectedCandidateCount: rejectedCandidateItems.length,
      mappedCandidateCount: candidateItems.length,
      datasetReviewCount: datasetItems.length
    },
    items: [...ocrItems, ...rejectedCandidateItems, ...candidateItems, ...datasetItems].slice(0, reviewQueueItemLimit)
  };
}

function buildOcrQueueItems(reports) {
  const grouped = new Map();

  for (const report of reports) {
    const records = Array.isArray(report.unknownItemRecords) && report.unknownItemRecords.length
      ? report.unknownItemRecords
      : (report.unknownItems || []).map((item) => ({
        item,
        dataStatus: report.source === 'ocr' ? 'unknown_from_ocr' : 'unverified',
        sourceScope: report.source === 'ocr' ? 'ocr_unmatched' : 'unknown'
    }));

    for (const record of records) {
      if (record?.reason === 'low_confidence_rejected') continue;
      if (record?.dataStatus !== 'unknown_from_ocr') continue;
      const item = String(record.item || '').trim();
      if (!item) continue;
      const key = normalizeText(item);
      const current = grouped.get(key) || createQueueItem({
        type: 'ocr_unmatched',
        dataStatus: 'unknown_from_ocr',
        label: item,
        sourceScope: 'ocr_unmatched',
        action: '核对 OCR 原图和包装上下文，确认是普通配料、添加剂、错字还是噪声。'
      });
      addReportEvidence(current, report);
      grouped.set(key, current);
    }
  }

  return sortQueueItems([...grouped.values()]);
}

function buildRejectedCandidateQueueItems(reports) {
  const grouped = new Map();

  for (const report of reports) {
    const records = Array.isArray(report.unknownItemRecords) ? report.unknownItemRecords : [];
    for (const record of records) {
      if (record?.reason !== 'low_confidence_rejected') continue;
      const item = String(record.item || '').trim();
      if (!item) continue;
      const key = normalizeText(item);
      const current = grouped.get(key) || createQueueItem({
        type: 'uncollected_candidate',
        dataStatus: record.dataStatus || 'unverified',
        label: item,
        ingredientId: record.rejectedMatchId || '',
        sourceScope: record.sourceScope || 'candidate_mapping',
        sourceName: record.sourceName || '',
        action: '低置信候选已被用户驳回，请核对包装原文后决定新增普通配料、修正映射或忽略噪声。'
      });
      current.confidence = Math.max(Number(current.confidence) || 0, Number(record.confidence) || 0);
      addReportEvidence(current, report);
      grouped.set(key, current);
    }
  }

  return sortQueueItems([...grouped.values()]);
}

function buildCandidateQueueItems(reports) {
  const grouped = new Map();

  for (const report of reports) {
    for (const result of Array.isArray(report.matchResults) ? report.matchResults : []) {
      if (!result?.match || result.confidence <= 0) continue;
      if (result.reviewDecision === 'confirmed' || result.reviewDecision === 'rejected') continue;
      const dataStatus = result.dataStatus || result.match.dataStatus || 'unverified';
      if (result.confidence >= 0.9 && !isPendingDataStatus(dataStatus)) continue;
      const label = result.match.nameCn || result.term || result.match.id;
      const key = result.match.id || normalizeText(label);
      const current = grouped.get(key) || createQueueItem({
        type: 'mapped_candidate',
        dataStatus: 'mapped_candidate',
        label,
        ingredientId: result.match.id,
        sourceScope: result.match.sourceScope || 'candidate_mapping',
        action: '核对包装原文和候选成分名称，确认是否应归并、拆分或保留为低置信候选。'
      });
      current.confidence = Math.max(Number(current.confidence) || 0, Number(result.confidence) || 0);
      addReportEvidence(current, report);
      grouped.set(key, current);
    }
  }

  return sortQueueItems([...grouped.values()]);
}

function buildDatasetQueueItems(ingredients) {
  return ingredients
    .filter((item) => isPendingDataStatus(item?.dataStatus) || item?.sourceScope === 'seed_reference')
    .map((item) => createQueueItem({
      type: 'dataset_review',
      dataStatus: item.dataStatus || 'unverified',
      label: item.nameCn || item.id,
      ingredientId: item.id,
      sourceScope: item.sourceScope || 'seed_reference',
      sourceName: item.sourceName || '',
      action: '补充官方来源、原文片段、适用范围和人工审核结论后，才能升级数据状态。'
    }))
    .sort((a, b) => sortType(a.type) - sortType(b.type) || a.label.localeCompare(b.label, 'zh-Hans-CN'));
}

function createQueueItem(input) {
  return {
    type: input.type,
    dataStatus: input.dataStatus,
    label: input.label,
    ingredientId: input.ingredientId || '',
    sourceScope: input.sourceScope || 'unknown',
    sourceName: input.sourceName || '',
    action: input.action,
    reportCount: 0,
    reports: [],
    confidence: 0
  };
}

function addReportEvidence(item, report) {
  item.reportCount += 1;
  if (item.reports.length >= 3) return;
  item.reports.push({
    id: report.id,
    title: report.productName || report.title || '未命名报告',
    createdAt: report.createdAt || ''
  });
}

function sortQueueItems(items) {
  return items.sort((a, b) => (
    sortType(a.type) - sortType(b.type)
    || b.reportCount - a.reportCount
    || a.label.localeCompare(b.label, 'zh-Hans-CN')
  ));
}

function sortType(type) {
  const order = {
    ocr_unmatched: 0,
    uncollected_candidate: 1,
    mapped_candidate: 2,
    dataset_review: 3
  };
  return order[type] ?? 99;
}
