export const supportTopics = [
  {
    id: 'subscription',
    label: '订阅与权益',
    description: '购买、恢复、续订、权益状态和会员中心问题。'
  },
  {
    id: 'data-correction',
    label: '数据纠错',
    description: '成分名称、来源、审核状态、使用限量或风险提示需要核对。'
  },
  {
    id: 'scan-analysis',
    label: '扫描与分析',
    description: '图片识别、成分表解析、报告保存或导出异常。'
  },
  {
    id: 'privacy-data',
    label: '隐私与本机数据',
    description: '本机数据导出、导入、清空、过敏原档案和历史记录问题。'
  },
  {
    id: 'bug-feedback',
    label: '功能问题',
    description: '页面打不开、交互异常、移动端显示或可访问性问题。'
  }
];

export const defaultSupportTopic = 'bug-feedback';

export function isSupportTopic(value) {
  return supportTopics.some((topic) => topic.id === value);
}

export function getSupportTopic(value) {
  return supportTopics.find((topic) => topic.id === value) || supportTopics.find((topic) => topic.id === defaultSupportTopic);
}
