import type { LabelReport } from '@/types';

export interface WeixinShareMessage {
  title: string;
  path: string;
}

export interface ReportShareCard {
  title: string;
  headline: string;
  points: string[];
  meta: string;
}

export async function shareReport(report: LabelReport, card?: ReportShareCard): Promise<boolean> {
  const text = buildReportShareText(report, card);
  const shareApi = (uni as typeof uni & { share?: (options: Record<string, unknown>) => void }).share;
  try {
    if (typeof shareApi === 'function') {
      shareApi({
        provider: 'weixin',
        scene: 'WXSceneSession',
        type: 0,
        title: card?.title || report.title,
        summary: text
      });
      return true;
    }
  } catch {
    // Fall through to clipboard fallback.
  }
  try {
    await uni.setClipboardData({ data: text });
    return true;
  } catch {
    return false;
  }
}

export function buildReportShareText(report: LabelReport, card?: ReportShareCard): string {
  const title = card?.title || report.productName || report.title || '食品标签解读';
  const headline = card?.headline || report.summarySentence || '食品标签解读已生成';
  const points = (card?.points || report.focusItems || []).slice(0, 3);
  const lines = [
    '成分镜',
    title,
    headline,
    ...points.map((point) => `- ${point}`),
    card?.meta || '',
    '仅供标签信息参考。'
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildReportShareMessage(report?: LabelReport): WeixinShareMessage {
  const title = report?.productName
    ? `${report.productName} 标签解读`
    : '成分镜食品标签解读';
  return {
    title,
    path: '/pages/index/index?from=share'
  };
}

export function enableWeixinShareMenu(): void {
  const showShareMenu = (uni as typeof uni & {
    showShareMenu?: (options: { menus?: string[]; withShareTicket?: boolean }) => void;
  }).showShareMenu;

  if (typeof showShareMenu !== 'function') return;
  try {
    showShareMenu({
      withShareTicket: false,
      menus: ['shareAppMessage']
    });
  } catch {
    // Sharing remains available through clipboard fallback.
  }
}
