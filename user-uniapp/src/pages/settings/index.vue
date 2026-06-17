<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppModal from '@/components/AppModal.vue';
import PageHeader from '@/components/PageHeader.vue';
import Toast from '@/components/Toast.vue';
import { deleteReport, getReports } from '@/stores/scanStore';

const message = ref('');
const messageTone = ref<'info' | 'success' | 'error'>('info');
const clearHistoryOpen = ref(false);

onShow(loadState);

function loadState() {
  message.value = '';
}

function clearHistory() {
  getReports().forEach((report) => {
    deleteReport(report.id);
  });
  clearHistoryOpen.value = false;
  message.value = '已清空本机扫描记录。';
  messageTone.value = 'success';
}
</script>

<template>
  <view class="page page--calm stack">
    <PageHeader title="设置" subtitle="隐私、说明和本机记录都放在这里。" />

    <Toast :message="message" :tone="messageTone" />

    <AppCard>
      <view class="stack">
        <text class="section-title">隐私说明</text>
        <text class="muted">用户上传图片仅用于本次 OCR 文字识别，历史记录不保存原图、图片路径或图片内容。</text>
        <text class="muted">本地只保存你确认后的食品标签文字、分区文本和分析结果摘要，记录可以随时清空。</text>
        <text class="muted">如果使用第三方 OCR 服务，图片可能会发送至 OCR 服务用于文字识别；前端不会暴露 OCR Key。</text>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">免责声明</text>
        <text class="muted">分析结果仅作食品标签阅读参考，不替代医生、营养师或监管机构意见。</text>
        <text class="muted">食品标签是否适合个人目标，还需要结合包装原文、过敏史和实际摄入量判断。</text>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">关于产品</text>
        <text class="muted">配料雷达帮助普通消费者阅读食品配料表和营养成分表，识别添加剂、糖、钠、脂肪和过敏原。</text>
      </view>
    </AppCard>

    <AppButton variant="danger" @click="clearHistoryOpen = true">清空历史记录</AppButton>

    <AppModal
      :open="clearHistoryOpen"
      title="清空历史记录"
      message="清空后只会删除本机扫描记录，不影响之后重新扫描。"
      confirm-label="确认清空"
      @close="clearHistoryOpen = false"
      @confirm="clearHistory"
    />
  </view>
</template>
