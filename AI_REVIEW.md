# AI Review - Analysis Confidence Flow

## 任务目标

新增成分表分析置信度闭环，让用户粘贴更接近真实包装的配料文本时，系统能更稳地拆分复配添加剂、清理剂量后缀，并明确展示本地库匹配覆盖率、匹配原因、置信度和需要核对的条目。

## 修改摘要

- `splitIngredientInput()` 支持 `配料：` / `成分：` 前缀清理、复配添加剂括号展开、剂量/百分比后缀清理，并保留原有单/双甘油脂肪酸酯保护逻辑。
- `analyzeIngredientText()` 新增 `analysisItems` 和 `quality`，返回逐条匹配原因、置信度、覆盖率、低置信数量和暂未收录数量。
- 分析页新增解析质量面板，展示覆盖率、解析条目、本地匹配、暂未收录、低置信和逐条核对提示。
- 补充移动端样式，解析质量指标和匹配条目在小屏下单列展示。
- PWA shell 缓存版本升到 `compcheck-shell-v14`。
- 补充真实包装成分表拆分、分析置信度、解析质量面板和 service worker 缓存测试。
- 同步更新 `COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `src/utils/text.js`
- `src/services/ingredientService.js`
- `src/pages/analyzePage.js`
- `src/types/ingredient.js`
- `src/styles.css`
- `src/sw.js`
- `scripts/test.mjs`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

## 验证命令

```bash
npm run validate:data
npm run lint
npm run test
npm run build
git diff --check
```

## 验证结果

- `npm run validate:data` 通过，50 条食品添加剂记录校验成功。
- `npm run lint` 通过。
- `npm run test` 通过。
- `npm run build` 通过，构建产物输出到 `dist/`。
- `git diff --check` 通过。
- `curl -I http://127.0.0.1:5181/`、`/main.js`、`/pages/analyzePage.js`、`/services/ingredientService.js`、`/utils/text.js`、`/styles.css` 和 `/sw.js` 均返回 HTTP 200。

## 风险点

- 当前置信度来自本地字符串匹配分数，不是机器学习模型；后续接入真实 OCR/AI 后需要重新校准阈值。
- 复配括号解析使用启发式规则，已覆盖常见 `食品添加剂（柠檬酸、山梨酸钾）` 场景，但复杂供应商配方仍可能需要用户核对。
- 暂未收录条目仍可能是普通食品原料、复合原料或数据库缺口，不能直接判断为风险项。

## 本次 git diff 摘要

- 增强成分表文本预处理和本地库匹配 metadata。
- 分析页新增解析质量反馈和移动端样式。
- 更新 PWA 预缓存版本与测试覆盖。
