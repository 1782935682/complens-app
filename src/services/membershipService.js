import { membershipEntitlement, membershipPlans } from '../data/membershipPlans.js';
import { getAnalysisReports, getLocalDataSummary } from '../store/userStore.js';

export function getMembershipOverview(category = 'food') {
  const currentPlan = getMembershipPlanById(membershipEntitlement.planId);
  const proPlan = getMembershipPlanById('pro');
  return {
    currentPlan,
    proPlan,
    entitlement: membershipEntitlement,
    usage: buildMembershipUsage(category),
    blockers: [
      '需要账号体系才能跨设备恢复权益。',
      'Apple IAP 与 Google Play Billing 必须接入官方支付。',
      '订阅状态必须由服务端校验，不能只依赖前端开关。'
    ]
  };
}

export function getMembershipPlanById(id) {
  return membershipPlans.find((plan) => plan.id === id) || membershipPlans[0];
}

export function getMembershipActionMessage(action) {
  const messages = {
    purchase: '购买入口尚未开放：需要先接入 Apple IAP、Google Play Billing 和服务端权益校验。',
    restore: '恢复购买尚未开放：需要账号登录和服务端订阅状态同步。',
    manage: '管理订阅尚未开放：上线后会跳转到 App Store 或 Google Play 的订阅管理入口。',
    support: '客服入口尚未接入：上线前需要补充邮件、反馈表单或帮助中心。'
  };
  return messages[action] || '该会员操作尚未开放。';
}

function buildMembershipUsage(category) {
  const summary = getLocalDataSummary();
  const categoryReports = getAnalysisReports(category).length;
  return [
    {
      key: 'reports',
      label: '本机报告',
      value: `${categoryReports} / 20`,
      detail: '每个类别最多保留 20 份本机分析报告。'
    },
    {
      key: 'history',
      label: '最近查询',
      value: `${summary.history} / 8`,
      detail: '最近查询当前只保存在本机。'
    },
    {
      key: 'ocr',
      label: 'OCR 扫描',
      value: '未接入',
      detail: '真实图片识别需要服务端代理和额度控制。'
    },
    {
      key: 'sync',
      label: '跨端同步',
      value: '未接入',
      detail: '收藏、报告和过敏原同步需要账号和后端。'
    }
  ];
}
