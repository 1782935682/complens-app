# AI Review - OCR 产品闭环深度打磨与任务体系重建

## 本轮目标

两轮文档修订：第一轮重排任务优先级（OCR 前置，订阅后移）；第二轮对所有任务做深度产品打磨，新增关键缺失批次，补全 UX 细节、设计规范、边界条件和测试用例。本轮为**文档修订轮次**，不修改源代码。

## 本轮目标摘要

```
本轮目标：CODEX_TASKS.md 深度产品打磨，新增 3 个关键批次，全面补全 UX/技术细节
已修改文件：CODEX_TASKS.md / AI_REVIEW.md
新增批次：
  Batch O-D（图片预处理：EXIF修正+压缩+IndexedDB）
  Batch Q-A（前端登录/注册 UI，补全后端已完成的账号体系）
  阶段 7 重命名为"前端账号登录 UI"，阶段 8-11 顺延
新增全局设计语言规范（CSS 变量体系）
O-A 深化：扫描页完整布局、首次引导、拍摄技巧
O-B 深化：超时/重试/错误分类、provider 抽象接口
O-C 深化：成分数量实时预览、状态机、键盘体验、产品名称字段
P-A 深化：OCR 噪声修正、E-number 识别、配料顺序、去重、12 个测试用例
P-B 深化：E-number 直查、文本标准化、客户端缓存、置信度分级展示
R-A 深化：整体风险评级（A-F）、配料顺序说明、特殊人群提醒、分享文字摘要
F-A 深化：IndexedDB 图片存储策略、缩略图分离存储
M-A 深化：Skeleton 动画、Empty/Error 统一组件、无障碍规范
下一步 Codex 执行顺序：O-A → O-D → O-B → O-C → P-A → P-B → R-A → F-A → F-B → Q-A → U-A → M-A → M-B
验证结果：git diff --check 通过
```

## 已修改文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `readme.md`
- `AI_REVIEW.md`（本文件）

## 未修改文件

- `COMMANDS.md`：已检查，当前命令无需修改；新增的验证脚本命令在相应批次完成后再同步更新
- `DATA_SOURCES.md`：已检查，内容与本轮调整一致，无需修改
- 所有源代码文件：本轮只修改文档，不修改代码

## CODEX_TASKS.md 变更摘要

### 新增内容

1. **产品定位区块**：明确 CompLens / 成分镜的 OCR 核心主路径，列出禁止文案和推荐文案。
2. **人工阻塞处理规则**：统一定义 10 类人工阻塞项，Codex 遇到阻塞时标记 `blocked_by_user` 后继续处理其他任务。
3. **已完成任务归档表**：将已完成的 12 个批次归档为表格，保留可追溯性，不删除原有任务。
4. **阶段 3：OCR 拍照识别产品闭环**：新增 3 个批次（O-A/O-B/O-C），贯通拍照→OCR→文本确认→跳转分析的完整主路径。
5. **阶段 4：食品配料表解析与成分匹配**：新增 2 个批次（P-A/P-B），增强配料表解析和数据库匹配。
6. **阶段 5：食品配料分析报告**：新增 1 个批次（R-A），生成结构化分析报告。
7. **阶段 6：产品档案、收藏、历史**：新增 2 个批次（F-A/F-B），建立产品档案概念。
8. **阶段 7：个性化关注项**：新增 1 个批次（U-A），整合关注成分/忌口项/过敏原。
9. **阶段 8：移动端和 PWA 产品体验**：新增 2 个批次（M-A/M-B），重构首页和移动端体验。
10. **阶段 9：AI 总结和解释**：新增 1 个批次（A-A），AI 只作为解释层。

### 后移内容

| 原位置 | 原批次 | 后移到 | 后移原因 |
|---|---|---|---|
| 阶段 2 | Batch 2-D iOS 工程配置 | 阶段 10 | iOS 上架属于分发环节，核心功能先完成 |
| 阶段 2 | Batch 2-E Android 工程配置 | 阶段 10 | 同上 |
| 阶段 4 | Batch 4-A 套餐设计与权益 | 阶段 10 | OCR/AI 未真实接入前无法定义免费额度 |
| 阶段 4 | Batch 4-B Apple IAP | 阶段 10 | 依赖 Apple Developer 账号和产品稳定 |
| 阶段 4 | Batch 4-C Google Play Billing | 阶段 10 | 同上 |
| 阶段 5 | Batch 5-A OCR 服务端代理 | 重构为 O-B | OCR 是核心功能，从附属升级为独立阶段 |
| 阶段 5 | Batch 5-B AI 分析代理 | 阶段 10 (A-A) | AI 解释层依赖完整产品闭环 |
| 阶段 6 | Batch 6-A E2E 测试 | 阶段 10 | 依赖产品功能稳定 |
| 阶段 6 | Batch 6-B/6-C/6-D 合规/资源/基础设施 | 阶段 10 | 依赖核心功能和人工阻塞项 |
| 阶段 7 | Batch 7-A/7-B/7-C 监控/上架/发布 | 阶段 10 | 必须最后执行 |

### 保留内容

原有 Data Batch 1-B、Data Batch 1-C 内容不变，仅位置保持在阶段 1（数据源准确性与数据完整度）。

## PROJECT_PLAN.md 变更摘要

1. **优先级重排**：从 8 项调整为 10 项，OCR 从第 6 位提升到第 4 位，订阅/支付从第 8 位后移到第 10 位。
2. **产品定位更新**：明确 OCR 主路径，成分搜索为辅助功能。
3. **里程碑表更新**：新增 M3（OCR 产品闭环）、M4（解析+报告）、M5（档案+个性化）、M6（移动端+AI），M7（订阅支付上架）后置。
4. **关键缺口更新**：OCR 产品闭环从 P1 升级到 P0，订阅/支付降为 P3。

## readme.md 变更摘要

1. **新增 3.0 核心用户流程**：完整描述 OCR 主路径。
2. **新增 3.0.1 OCR 降级策略**：real → manual → fallback 三级降级。
3. **新增 3.0.2 禁止伪造规则**：5 条明确禁止（伪造 OCR/数据来源/AI 结论/seed 充当完整库/医疗诊断）。

## COMMANDS.md 变更摘要

已检查，无需修改。以下内容已在 COMMANDS.md 中覆盖：
- `npm run validate:data`
- `npm run lint`
- `npm run test`
- `npm run build`
- 后端数据库命令
- Capacitor 命令

新增的批次完成后，如有新的验证命令（如 `npm run test:e2e`），届时再同步更新 COMMANDS.md。

## 需要人工介入的任务

| 任务 | 人工操作内容 | 当前状态 |
|---|---|---|
| Data Batch 1-B | 确认官方来源清单（GB 2760 等），逐条审核 10-20 条数据 | ⏳ 等待人工 |
| Batch D-A | 选择生产数据库和部署平台，获取连接串 | ⏸ blocked_by_user |
| Batch L-A | 申请 OCR API Key | ⏸ blocked_by_user |
| Batch A-A | 申请 AI API Key | ⏸ blocked_by_user |
| Batch 2-D | Apple Developer 账号和 Xcode | ⏸ blocked_by_user |
| Batch 2-E | Google Play 账号和 14 天闭测 | ⏸ blocked_by_user |
| Batch 4-B | App Store Connect IAP 配置 | ⏸ blocked_by_user |
| Batch 4-C | Google Play Billing 服务账号 | ⏸ blocked_by_user |
| Batch 6-B | 法务复核合规材料 | ⏸ blocked_by_user |
| Batch 6-C | 上架资源准备（截图/图标/文案） | ⏸ blocked_by_user |
| Batch 6-D | 域名 + 生产环境配置 | ⏸ blocked_by_user |

## 下一步建议 Codex 优先执行的任务

**无阻塞，Codex 可立即开始**：

1. `Batch O-A`：拍照/上传入口与移动端体验增强（`src/pages/scanPage.js` + `src/pages/homePage.js`）
2. `Batch O-B`：OCR 服务抽象层（`src/services/ocrService.js` 重构 + 后端 OCR 代理占位）
3. `Batch O-C`：识别文本确认与修正页（新建 `src/pages/ocrConfirmPage.js`）
4. `Batch P-A`：配料表文本解析增强（`src/utils/text.js`）
5. `Batch P-B`：数据库成分匹配（新建 `src/services/ingredientMatchService.js`）

**等待人工的任务（并行处理，不阻塞上面任务）**：

- `Data Batch 1-B` 人工部分：官方来源清单确认

## 风险点

1. 当前 100 条食品添加剂 seed 全部未验证，Data Batch 1-B 的人工审核可能需要较长时间；但 OCR 闭环任务不依赖此人工操作，可以并行推进。
2. OCR API Key 属于人工阻塞项；O-A/O-B/O-C 批次设计时已考虑无 Key 情况，用 manual 模式保证闭环可验收。
3. 前端登录 UI 仍未实现，导致云同步和个性化设置无法跨设备，但不阻塞 OCR 闭环的本地验收。
4. 化妆品数据仍是原型数据，本轮文档明确了不混入化妆品方向；后续迭代时再单独规划。

## 验证结果

本轮只修改文档，无源码改动。

```bash
git diff --check   # 通过，文档格式无尾随空格
```

相关源代码验证命令在下一个 Codex 批次（Batch O-A）完成后执行：

```bash
npm run validate:data
npm run lint
npm run test
npm run build
cd backend && npm run typecheck && npm test
```
