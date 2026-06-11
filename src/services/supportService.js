import { categoryPath, getProductCategory } from '../data/categories.js';
import { defaultSupportTopic, getSupportTopic, isSupportTopic } from '../data/supportTopics.js';

const SUPPORT_PREFILL_LIMITS = {
  contact: 120,
  message: 1000,
  subject: 80
};

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

export function buildSupportPrefillFromParams(params = new URLSearchParams()) {
  return normalizeSupportPrefill({
    topic: params.get('topic') || '',
    subject: params.get('subject') || '',
    message: params.get('message') || '',
    contact: params.get('contact') || ''
  });
}

export function buildSupportPrefillUrl(category = 'food', input = {}) {
  const prefill = normalizeSupportPrefill(input);
  const params = new URLSearchParams();
  if (prefill.topic && prefill.topic !== defaultSupportTopic) params.set('topic', prefill.topic);
  if (prefill.subject) params.set('subject', prefill.subject);
  if (prefill.message) params.set('message', prefill.message);
  if (prefill.contact) params.set('contact', prefill.contact);
  const query = params.toString();
  return `#${categoryPath(category, '/support')}${query ? `?${query}` : ''}`;
}

export function normalizeSupportPrefill(input = {}) {
  const topic = isSupportTopic(input.topic) ? input.topic : '';
  const subject = limitSupportText(input.subject, SUPPORT_PREFILL_LIMITS.subject);
  const message = limitSupportText(input.message, SUPPORT_PREFILL_LIMITS.message);
  const contact = limitSupportText(input.contact, SUPPORT_PREFILL_LIMITS.contact);
  return {
    topic,
    subject,
    message,
    contact,
    hasPrefill: Boolean(topic || subject || message || contact)
  };
}

function limitSupportText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}
