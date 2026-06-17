<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppModal from '@/components/AppModal.vue';
import PageHeader from '@/components/PageHeader.vue';
import Toast from '@/components/Toast.vue';
import { routes, navigateToRoute } from '@/constants/routes';
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
        <text class="muted">拍照识别会把图片发送到已配置的后端 OCR 服务；手动输入内容仅用于本次分析和本机历史。</text>
        <text class="muted">前端不会暴露 OCR Key，历史记录可以随时清空。</text>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">免责声明</text>
        <text class="muted">本工具仅基于配料表和营养成分表做消费参考，不替代专业人士或监管机构意见。</text>
        <text class="muted">食品是否适合个人食用，还需要结合年龄、疾病、过敏史和实际摄入量判断。</text>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">默认目标设置</text>
        <text class="muted">设置日常均衡、控糖、减脂、少盐/低钠、儿童、健身和过敏关注，结果页会按这些目标调整提醒。</text>
        <AppButton variant="secondary" @click="navigateToRoute(routes.attention)">去设置关注目标</AppButton>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">规则库版本</text>
        <text class="notice">本机规则库：消费者配料提醒 MVP</text>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">关于产品</text>
        <text class="muted">配料雷达帮助普通消费者阅读配料表，提醒你设置过的关注成分。</text>
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

<style scoped>
.notice {
  border: 1px dashed var(--line);
  border-radius: var(--radius-btn);
  background: var(--surface-subtle);
  padding: var(--space-md);
  color: var(--text);
  font-size: var(--font-size-sm);
  word-break: break-all;
}
</style>
