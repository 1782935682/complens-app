import type { LabelReport } from '@/types';

export interface WeixinShareMessage {
  title: string;
  path: string;
}

export async function shareReport(report: LabelReport): Promise<boolean> {
  const text = `${report.title}\n${report.summarySentence}\n仅供标签信息参考，请结合包装原文和个人情况判断。`;
  const shareApi = (uni as typeof uni & { share?: (options: Record<string, unknown>) => void }).share;
  try {
    if (typeof shareApi === 'function') {
      shareApi({
        provider: 'weixin',
        scene: 'WXSceneSession',
        type: 0,
        title: report.title,
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
