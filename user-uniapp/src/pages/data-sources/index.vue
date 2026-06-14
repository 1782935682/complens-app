<script setup lang="ts">
import AppCard from '@/components/AppCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import { dataStatusOrder, dataStatusLabels } from '@/constants/dataStatus';

const sourceNotes = [
  { title: 'OCR 结果需要确认', detail: 'OCR 识别文字属于用户输入来源，必须经过文本确认页修正后再进入解析。' },
  { title: '数据来源分级', detail: '官方标准、安全评价、普通配料词库、OCR 输入、AI 解释和用户反馈会分层展示。' },
  { title: 'AI 不作为权威来源', detail: 'AI 只能做解释和摘要，不生成法规来源、限量或医疗建议。' },
  { title: '专业依据可展开', detail: '报告默认给普通消费者信息，需要时可在查看依据中看到来源说明。' }
];
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">数据说明</text>
      <text class="page-subtitle">这里说明数据可信等级、OCR 边界和查看依据。食品标签解读只做标签信息参考。</text>
    </view>

    <AppCard>
      <view class="stack">
        <text class="section-title">可信状态</text>
        <view v-for="status in dataStatusOrder" :key="status" class="status-row">
          <StatusTag :status="status" />
          <text class="muted">{{ dataStatusLabels[status] }}。待复核、疑似、未验证和暂未收录不会作为权威结论。</text>
        </view>
      </view>
    </AppCard>

    <AppCard v-for="note in sourceNotes" :key="note.title">
      <view class="stack">
        <text class="section-title">{{ note.title }}</text>
        <text class="muted">{{ note.detail }}</text>
      </view>
    </AppCard>
  </view>
</template>

<style scoped>
.status-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
