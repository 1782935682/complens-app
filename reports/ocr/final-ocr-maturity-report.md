# Final OCR Maturity Report

当前 OCR 分区能力未达到成熟标准，不能声明完成。

## Final Status

- 是否达标：否
- 总样本数：100
- 样本级通过率：99%
- 样本分类覆盖：11
- 当前成熟度阶段：清洗 100 样本 gold set
- 是否已达到扩样到 500 的门槛：否
- 最终稳定性目标样本数：500
- 核心有效样本数：100
- 核心有效配料样本数：100
- 核心有效营养样本数：0
- 无效样本数：0
- 弱 OCR 样本数：0
- ingredientsText 准确率：99%
- nutritionText 准确率：100%
- 核心有效 ingredientsText 准确率：99%
- 核心有效 nutritionText 准确率：100%
- 配料表误判率：100%
- 营养成分表误判为配料表比例：0%
- 广告语 / 生产信息误判为配料表比例：0%
- ChatGPT Review 平均分：skipped
- DeepSeek Review 平均分：skipped
- 是否可以进入产品使用：不可以

## Gold Set Quality

- 当前阶段目标：先清洗 100 样本 gold set，并在核心有效样本上达到 95% 稳定正确率。
- 最终稳定性目标：100 样本稳定后扩到 500 样本，并在 500 样本上继续稳定 95% 以上。
- 后续识别扩展目标：食品包装 OCR 500 样本稳定 95% 后，新增二维码 / 条形码 / 商品数字码评测，三类各 500 用例且各自正确率 >= 95%。
- 当前核心有效样本：100
- 当前无效样本：0
- 当前弱 OCR 样本：0
- 当前结论：不能扩到 500，需先修复 100 样本 gold set 和核心抽取

## Post-OCR Code Recognition Gate

- 适用顺序：只在食品包装 OCR 分区达到 500 样本、95% 稳定正确率后激活。
- 覆盖范围：二维码内容分类、条形码标准化编码、包装印刷 8/12/13 位商品数字码提取。
- 验收指标：二维码、条形码、商品数字码各 500 用例；每类和整体正确率均 >= 95%；二维码 URL 必须保留为 URL 类型，AI/联网结果不得伪装成包装实拍识别。
- 可重复命令：`npm run product-code:evaluate`
- 当前状态：未激活；当前 OCR 分区尚未达标

## Failed Samples

- 00825702-ingredients: ingredients_low_overlap

## Fixed Issues This Run

- 建立可重复运行的网络样本 OCR 评测链路。
- 分离配料表、营养成分表、商品信息、编码、otherText 与 uncertainText。
- 增加营养/广告/生产信息误入配料表的校验。
- 增加 ChatGPT / DeepSeek Review provider，缺少 API Key 时明确 skipped。

## Unfixed Issues

- 最终稳定性样本数不足 500：当前 100
- 尚未达到 100 样本 95% 稳定正确率，不能进入 500 样本扩容阶段
- 核心有效营养样本不足 25：当前 0
- 配料表误判率超过 5%：当前 100%
- ChatGPT Review 未达到 85：当前 skipped
- DeepSeek Review 未达到 85：当前 skipped

## Sample Source Issues

- none

## AI Optimization Decision

- 暂无可引用的 ChatGPT 子 agent AI 优化判断。

## Next Suggestions

- 补足真实模糊、倾斜、反光、二维码、条码局部样本。
- 对失败 Top 错误继续收紧关键词、边界和置信度规则。
- 在配置 API Key 后跑完整 ChatGPT / DeepSeek Review，不用脚本默认 smoke 限量。
