import { getProductCategory } from '../data/categories.js';
import { getSupportTopic } from '../data/supportTopics.js';

export function buildSupportRequestMarkdown(request) {
  const topic = getSupportTopic(request.topic);
  const category = getProductCategory(request.category);
  return [
    `# ${request.subject}`,
    '',
    `- 类型：${topic.label}`,
    `- 类别：${category.label}`,
    `- 状态：${formatSupportStatus(request.status)}`,
    `- 创建时间：${formatSupportDate(request.createdAt)}`,
    request.contact ? `- 联系方式：${request.contact}` : '- 联系方式：未填写',
    '',
    '## 问题描述',
    '',
    request.message,
    '',
    '## 本机处理边界',
    '',
    '当前版本仅把反馈记录保存在本机。复制或发送给客服前，请自行确认是否包含个人信息、过敏原档案或报告内容。'
  ].join('\n');
}

export function formatSupportDate(value) {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatSupportStatus(status) {
  const labels = {
    local: '已保存在本机',
    copied: '已复制',
    closed: '已关闭'
  };
  return labels[status] || labels.local;
}
