export const membershipPlans = [
  {
    id: 'free',
    name: 'Free',
    label: '免费版',
    badge: '当前',
    priceLabel: '0 元',
    description: '适合完成基础搜索、文本分析、过敏原本地提醒和少量本机报告复查。',
    features: [
      '基础成分搜索和详情',
      '文本成分表本地分析',
      '本机过敏原提醒',
      '本机收藏、历史和报告'
    ],
    limits: [
      '真实 OCR 扫描暂未开放',
      'AI 高级报告暂未接入',
      '跨设备同步暂未接入'
    ]
  },
  {
    id: 'pro',
    name: 'CompCheck Pro',
    label: 'Pro 订阅',
    badge: '规划中',
    priceLabel: '价格待定',
    description: '面向高频扫描、报告导出、跨端同步和更多数据能力，需移动端支付和服务端权益校验后开放。',
    features: [
      'OCR 扫描额度',
      '高级 AI 分析报告',
      '跨设备同步',
      '报告导出和原生分享',
      '离线数据包和更多类别数据'
    ],
    limits: [
      'Apple IAP 未接入',
      'Google Play Billing 未接入',
      '服务端 entitlement 未接入'
    ]
  }
];

export const membershipEntitlement = {
  planId: 'free',
  source: 'local-preview',
  status: 'active',
  purchaseEnabled: false,
  restoreEnabled: false,
  manageEnabled: false,
  renewalText: '当前没有订阅续费状态。',
  unavailableReason: '移动端支付、账号登录和服务端权益校验尚未接入。'
};
