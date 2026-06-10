export async function extractIngredientsFromImage(file) {
  if (!file) {
    return {
      enabled: false,
      text: '',
      message: '请先选择一张清晰的产品成分表图片。'
    };
  }

  return {
    enabled: false,
    text: '',
    message: '图片识别接口已预留，当前版本请先粘贴成分表文本。'
  };
}
