<script setup lang="ts">
import AppCard from '@/components/AppCard.vue';

const sections = [
  {
    title: '图片处理',
    detail: '图片用于食品标签识别和预览。H5/PWA 使用临时文件或 IndexedDB，小程序使用平台文件缓存，localStorage/Storage 只保存索引、设置和小型元数据。'
  },
  {
    title: 'OCR 与文本',
    detail: 'OCR 文本会先展示给用户确认。无后端 OCR 配置时保留手动输入，不返回假识别文字。'
  },
  {
    title: '第三方与密钥',
    detail: '前端、小程序和 App 不保存 OCR Key 或 AI Key，不直连 OCR 服务、AI 服务或数据库。'
  },
  {
    title: '本机数据',
    detail: '关注项和历史报告 MVP 阶段保存在本机，可在历史页删除单条记录。'
  },
  {
    title: '使用边界',
    detail: '本产品仅供标签信息参考，请结合包装原文和个人情况判断。'
  }
];
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">隐私说明</text>
      <text class="page-subtitle">说明图片、OCR、关注项和历史记录在用户端的处理边界。</text>
    </view>
    <AppCard v-for="section in sections" :key="section.title">
      <view class="stack">
        <text class="section-title">{{ section.title }}</text>
        <text class="muted">{{ section.detail }}</text>
      </view>
    </AppCard>
  </view>
</template>
