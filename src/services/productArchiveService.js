import { isProductCategory } from '../data/categories.js';
import { getImage } from './imageStoreService.js';
import { readJson, writeJson } from './storageService.js';

export const PRODUCT_ARCHIVES_KEY = 'compcheck:products';
export const MAX_PRODUCT_ARCHIVES = 100;
export const PRODUCT_THUMBNAIL_MAX_BYTES = 20_000;

const THUMBNAIL_SIZE = 200;
const DEFAULT_CATEGORY = 'food';
const RISK_GRADES = ['A', 'B', 'C', 'D', 'F'];

export function getProductArchives(filters = {}) {
  const normalizedFilters = normalizeProductFilters(filters);
  const archives = normalizeProductArchives(readJson(PRODUCT_ARCHIVES_KEY, []));
  return archives.filter((item) => productMatchesFilters(item, normalizedFilters));
}

export function getProductArchiveById(id) {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return null;
  return getProductArchives().find((item) => item.id === normalizedId) || null;
}

export function getProductArchiveByReportId(reportId) {
  const normalizedReportId = normalizeId(reportId);
  if (!normalizedReportId) return null;
  return getProductArchives().find((item) => item.reportId === normalizedReportId) || null;
}

export async function saveProductArchiveFromReport(report, options = {}) {
  const existing = getProductArchiveByReportId(report?.id);
  const thumbnailDataUrl = Object.hasOwn(options, 'thumbnailDataUrl')
    ? options.thumbnailDataUrl
    : await createProductThumbnailDataUrl(options.imageId || report?.imageId);
  const archive = createProductArchiveFromReport(report, {
    ...options,
    id: options.id || existing?.id,
    createdAt: existing?.createdAt,
    isFavorite: options.isFavorite ?? existing?.isFavorite,
    tags: options.tags ?? existing?.tags,
    thumbnailDataUrl: thumbnailDataUrl || existing?.thumbnailDataUrl || null
  });
  if (!archive) return null;

  const current = getProductArchives().filter((item) => item.id !== archive.id && item.reportId !== archive.reportId);
  const next = enforceProductArchiveLimit([archive, ...current]);
  writeJson(PRODUCT_ARCHIVES_KEY, next);
  return archive;
}

export function createProductArchiveFromReport(report, options = {}) {
  if (!report || typeof report !== 'object') return null;
  const originalText = normalizeText(report.originalText || report.input);
  if (!originalText) return null;

  const now = new Date().toISOString();
  const category = isProductCategory(report.category) ? report.category : DEFAULT_CATEGORY;
  return normalizeProductArchive({
    id: options.id || createProductArchiveId(),
    category,
    createdAt: options.createdAt || report.createdAt || now,
    updatedAt: now,
    productName: report.productName || report.title || '未命名产品',
    brandName: report.brandName,
    imageId: options.imageId || report.imageId || null,
    thumbnailDataUrl: options.thumbnailDataUrl || null,
    originalText,
    parsedIngredients: Array.isArray(report.parsedIngredients) ? report.parsedIngredients : [],
    matchResults: Array.isArray(report.matchResults) ? report.matchResults : [],
    reportId: report.id,
    riskGrade: report.riskGrade,
    isFavorite: options.isFavorite === true,
    tags: options.tags
  });
}

export function updateProductArchive(id, patch = {}) {
  const normalizedId = normalizeId(id);
  if (!normalizedId || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return null;
  }

  const current = getProductArchives();
  const existing = current.find((item) => item.id === normalizedId);
  if (!existing) return null;

  const nextItem = normalizeProductArchive({
    ...existing,
    ...pickProductArchivePatch(patch),
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  });
  if (!nextItem) return null;

  const next = current.map((item) => item.id === normalizedId ? nextItem : item);
  writeJson(PRODUCT_ARCHIVES_KEY, next);
  return nextItem;
}

export function toggleProductArchiveFavorite(id) {
  const existing = getProductArchiveById(id);
  if (!existing) return null;
  return updateProductArchive(existing.id, { isFavorite: !existing.isFavorite });
}

export function deleteProductArchive(id) {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return getProductArchives();
  const next = getProductArchives().filter((item) => item.id !== normalizedId);
  writeJson(PRODUCT_ARCHIVES_KEY, next);
  return next;
}

export function clearProductArchives(category) {
  const next = category
    ? getProductArchives().filter((item) => item.category !== category)
    : [];
  writeJson(PRODUCT_ARCHIVES_KEY, next);
  return next;
}

export function normalizeProductArchives(value) {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  const reports = new Set();
  const archives = [];
  for (const item of value) {
    const archive = normalizeProductArchive(item);
    if (!archive || ids.has(archive.id) || reports.has(archive.reportId)) continue;
    ids.add(archive.id);
    reports.add(archive.reportId);
    archives.push(archive);
  }
  return enforceProductArchiveLimit(archives.sort(sortByUpdatedDesc));
}

export function normalizeProductArchive(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const originalText = normalizeText(value.originalText || value.input);
  const reportId = normalizeId(value.reportId);
  if (!originalText || !reportId) return null;

  return {
    id: normalizeProductArchiveId(value.id),
    category: isProductCategory(value.category) ? value.category : DEFAULT_CATEGORY,
    createdAt: normalizeIsoDate(value.createdAt),
    updatedAt: normalizeIsoDate(value.updatedAt || value.createdAt),
    productName: truncateText(value.productName || value.title || '未命名产品', 100) || '未命名产品',
    brandName: truncateText(value.brandName, 100) || undefined,
    imageId: normalizeNullableId(value.imageId),
    thumbnailDataUrl: normalizeThumbnailDataUrl(value.thumbnailDataUrl),
    originalText,
    parsedIngredients: normalizeJsonArray(value.parsedIngredients),
    matchResults: normalizeJsonArray(value.matchResults),
    reportId,
    riskGrade: RISK_GRADES.includes(value.riskGrade) ? value.riskGrade : 'C',
    isFavorite: value.isFavorite === true,
    tags: normalizeTags(value.tags)
  };
}

export function paginateProductArchives(items, page = 1, limit = 20) {
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const normalizedLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
  const allItems = Array.isArray(items) ? items : [];
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));
  const safePage = Math.min(normalizedPage, totalPages);
  const start = (safePage - 1) * normalizedLimit;
  return {
    items: allItems.slice(start, start + normalizedLimit),
    page: safePage,
    limit: normalizedLimit,
    total,
    totalPages
  };
}

export async function createProductThumbnailDataUrl(imageId) {
  const normalizedImageId = normalizeNullableId(imageId);
  if (!normalizedImageId || !canRenderThumbnail()) return null;

  const record = await getImage(normalizedImageId);
  if (!record?.blob) return null;

  const objectUrl = URL.createObjectURL(record.blob);
  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    const scale = Math.min(THUMBNAIL_SIZE / image.naturalWidth, THUMBNAIL_SIZE / image.naturalHeight, 1);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return encodeThumbnail(canvas);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function normalizeProductFilters(filters) {
  if (typeof filters === 'string') return { category: filters };
  if (!filters || typeof filters !== 'object') return {};
  return {
    category: isProductCategory(filters.category) ? filters.category : '',
    search: normalizeText(filters.search),
    isFavorite: filters.isFavorite === true || filters.isFavorite === 'true'
      ? true
      : filters.isFavorite === false || filters.isFavorite === 'false'
        ? false
        : undefined,
    riskGrade: RISK_GRADES.includes(filters.riskGrade) ? filters.riskGrade : ''
  };
}

function productMatchesFilters(item, filters) {
  if (filters.category && item.category !== filters.category) return false;
  if (filters.isFavorite !== undefined && item.isFavorite !== filters.isFavorite) return false;
  if (filters.riskGrade && item.riskGrade !== filters.riskGrade) return false;
  if (!filters.search) return true;
  const haystack = [
    item.productName,
    item.brandName,
    item.originalText,
    ...item.tags
  ].join(' ').toLowerCase();
  return haystack.includes(filters.search.toLowerCase());
}

function enforceProductArchiveLimit(items) {
  const next = [...items].sort(sortByUpdatedDesc);
  while (next.length > MAX_PRODUCT_ARCHIVES) {
    const removableIndex = findOldestNonFavoriteIndex(next);
    if (removableIndex < 0) break;
    next.splice(removableIndex, 1);
  }
  return next;
}

function findOldestNonFavoriteIndex(items) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!items[index].isFavorite) return index;
  }
  return -1;
}

function pickProductArchivePatch(patch) {
  const next = {};
  if (Object.hasOwn(patch, 'productName')) next.productName = patch.productName;
  if (Object.hasOwn(patch, 'brandName')) next.brandName = patch.brandName;
  if (Object.hasOwn(patch, 'thumbnailDataUrl')) next.thumbnailDataUrl = patch.thumbnailDataUrl;
  if (Object.hasOwn(patch, 'isFavorite')) next.isFavorite = patch.isFavorite === true;
  if (Object.hasOwn(patch, 'tags')) next.tags = patch.tags;
  if (Object.hasOwn(patch, 'riskGrade')) next.riskGrade = patch.riskGrade;
  return next;
}

function sortByUpdatedDesc(a, b) {
  return b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt);
}

function normalizeProductArchiveId(value) {
  const id = normalizeId(value);
  return /^[a-z0-9][a-z0-9_-]{0,80}$/i.test(id) ? id : createProductArchiveId();
}

function createProductArchiveId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `product-${Date.now().toString(36)}-${random}`;
}

function normalizeId(value) {
  return String(value || '').trim();
}

function normalizeNullableId(value) {
  const id = normalizeId(value);
  return id || null;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncateText(value, maxLength) {
  const normalized = normalizeText(value);
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function normalizeIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeJsonArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === 'object')
    : [];
}

function normalizeTags(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((item) => truncateText(item, 24))
    .filter(Boolean))]
    .slice(0, 12);
}

function normalizeThumbnailDataUrl(value) {
  const dataUrl = String(value || '').trim();
  if (!dataUrl || !/^data:image\/(png|jpe?g|webp);base64,/i.test(dataUrl)) return null;
  return getDataUrlByteSize(dataUrl) <= PRODUCT_THUMBNAIL_MAX_BYTES ? dataUrl : null;
}

function getDataUrlByteSize(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.max(0, Math.floor(base64.length * 0.75) - padding);
}

function canRenderThumbnail() {
  return typeof document !== 'undefined'
    && typeof Image !== 'undefined'
    && typeof URL !== 'undefined'
    && typeof URL.createObjectURL === 'function';
}

function loadImage(objectUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', () => reject(new Error('Image load failed')), { once: true });
    image.src = objectUrl;
  });
}

function encodeThumbnail(canvas) {
  for (const quality of [0.82, 0.68, 0.54, 0.4, 0.3]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (getDataUrlByteSize(dataUrl) <= PRODUCT_THUMBNAIL_MAX_BYTES) return dataUrl;
  }
  return null;
}
