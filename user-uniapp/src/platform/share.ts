import type { LabelReport } from '@/types';

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
