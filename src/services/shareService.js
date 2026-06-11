import { categoryPath, getProductCategory } from '../data/categories.js';
import { riskLabel } from '../components/render.js';
import { shareWithNative } from './nativeBridgeService.js';

export function buildIngredientSharePayload(ingredient, category = 'food', baseUrl = '') {
  if (!ingredient) return null;
  const currentCategory = getProductCategory(category);
  const title = `${ingredient.nameCn || ingredient.nameEn || '成分详情'} - CompCheck`;
  const lines = [
    `${currentCategory.label}成分：${ingredient.nameCn || ingredient.nameEn || '未命名成分'}`,
    ingredient.nameEn ? `英文名：${ingredient.nameEn}` : '',
    `关注等级：${riskLabel(ingredient.riskLevel || 'unknown')}`,
    ingredient.category ? `分类：${ingredient.category}` : '',
    ingredient.description || '',
    '仅供日常成分理解，请结合产品标签、个人情况和专业意见判断。'
  ].filter(Boolean);

  return {
    title,
    text: lines.join('\n'),
    url: buildShareUrl(category, `/ingredient/${ingredient.id}`, baseUrl)
  };
}

export function buildReportSharePayload(report, baseUrl = '') {
  if (!report) return null;
  const currentCategory = getProductCategory(report.category);
  const allergenHitCount = (report.ingredientAllergenHits || []).length + (report.textAllergenHits || []).length;
  const lines = [
    `${currentCategory.label}分析报告：${report.title}`,
    report.summary,
    `已匹配：${report.matchedCount || 0} 项`,
    `重点关注：${(report.highlightIngredientIds || []).length} 项`,
    `暂未收录：${(report.unknownItems || []).length} 项`,
    `过敏原命中：${allergenHitCount} 项`,
    '报告保存在本机，分享内容不代表数据已完成正式审核。'
  ].filter(Boolean);

  return {
    title: `${report.title} - CompCheck`,
    text: lines.join('\n'),
    url: buildShareUrl(report.category, buildReportSharePath(report), baseUrl)
  };
}

export function buildCompareSharePayload(overview, baseUrl = '') {
  if (!overview) return null;
  const names = (overview.ingredients || [])
    .map((ingredient) => `${ingredient.nameCn}（${riskLabel(ingredient.riskLevel || 'unknown')}）`)
    .filter(Boolean);
  const lines = [
    `${overview.categoryLabel}成分对比`,
    `当前对比：${overview.count || 0} / ${overview.maxItems || 0}`,
    names.length ? `成分：${names.join('、')}` : '还没有加入对比的成分。',
    '对比列表只保存在本机，分享内容仅用于日常成分理解。'
  ];

  return {
    title: `${overview.categoryLabel}成分对比 - CompCheck`,
    text: lines.join('\n'),
    url: buildShareUrl(overview.category, '/compare', baseUrl)
  };
}

export function formatShareText(payload) {
  if (!payload) return '';
  return [
    payload.title,
    payload.text,
    payload.url
  ].filter(Boolean).join('\n\n');
}

export function buildShareUrl(category = 'food', path = '/', baseUrl = '') {
  const route = `#${categoryPath(category, path)}`;
  const normalizedBase = String(baseUrl || '').split('#')[0];
  return normalizedBase ? `${normalizedBase}${route}` : route;
}

export async function sharePayloadWithFallback(payload, options = {}) {
  const {
    copyText,
    navigatorShare = typeof navigator === 'undefined' ? null : navigator.share?.bind(navigator),
    updateStatus = () => {}
  } = options;

  if (!payload) {
    updateStatus('没有可分享的内容。');
    return { ok: false, method: 'none' };
  }

  try {
    const nativeResult = await shareWithNative(payload);
    if (nativeResult.ok) {
      updateStatus(nativeResult.message || '已打开系统分享。');
      return { ok: true, method: 'native' };
    }
    if (nativeResult.reason === 'abort') {
      updateStatus('已取消系统分享。');
      return { ok: false, method: 'native', reason: 'abort' };
    }

    if (typeof navigatorShare === 'function') {
      try {
        await navigatorShare({
          title: payload.title,
          text: payload.text,
          url: payload.url
        });
        updateStatus('已打开系统分享。');
        return { ok: true, method: 'web-share' };
      } catch (error) {
        if (isShareAbort(error)) {
          updateStatus('已取消系统分享。');
          return { ok: false, method: 'web-share', reason: 'abort' };
        }
        await copyShareText(payload, copyText);
        updateStatus(isShareTypeError(error) ? '系统分享不可用，已复制分享内容。' : '系统分享未完成，已复制分享内容。');
        return { ok: true, method: 'copy' };
      }
    }

    await copyShareText(payload, copyText);
    updateStatus('已复制分享内容。');
    return { ok: true, method: 'copy' };
  } catch {
    updateStatus('分享失败，请稍后再试。');
    return { ok: false, method: 'error' };
  }
}

export function isShareAbort(error) {
  return error && (error.name === 'AbortError' || error.code === 20);
}

export function isShareTypeError(error) {
  return error instanceof TypeError || error?.name === 'TypeError';
}

function buildReportSharePath(report) {
  const input = String(report.input || '').trim();
  return input ? `/analyze?text=${encodeURIComponent(input)}` : '/analyze';
}

async function copyShareText(payload, copyText) {
  if (typeof copyText !== 'function') throw new Error('Copy fallback unavailable');
  await copyText(formatShareText(payload));
}
