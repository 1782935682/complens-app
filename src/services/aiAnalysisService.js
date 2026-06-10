export async function analyzeIngredientsByAI(input) {
  if (!String(input || '').trim()) {
    return {
      enabled: false,
      message: '请输入成分文本后再尝试 AI 分析。'
    };
  }

  return {
    enabled: false,
    message: 'AI 分析接口已预留，当前未配置服务端代理，仍使用本地成分库结果。'
  };
}
