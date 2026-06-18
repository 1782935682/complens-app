# AI Review — 2026-06-17

## P0 配料表 OCR 精准收敛

### 本轮目标

继续优化小程序 P0 OCR 主路径，但不新增页面、不接商品库、不做条码/商品正面/商品对比/日化识别。本轮只收敛一件事：用户拍照后优先只提取配料表，净含量、规格、产品名、厂家地址、条码、生产日期等包装信息作为噪音过滤，不进入本地规则分析。

### 已完成修改

1. `labelTextExtractor` 收紧强锚点：优先识别 `配料表 / 配料：/ 食品配料 / 原料：/ Ingredients`，避免裸“配料”在包装文案里误触发；无强锚点时只有具备明显配料清单形态的文本才作为兜底候选。
2. 无锚点兜底不再从整张 OCR 原文里按分数挑产品信息；候选必须满足多个分隔符、多个常见配料/添加剂命中、或 `食品添加剂(...)` 等清单特征，否则保持低置信并引导重拍/手动输入。
3. 产品信息过滤扩展到产品名称、品名、品牌、口味、净含量、净重、规格、厂家、地址、电话、条码、二维码、生产日期、保质期、许可证、SC、执行标准、食用方法和注意事项。
4. 营养成分提取改为强锚点或“营养字段 + 数值单位”才进入 `nutritionText`，避免配料里的“白砂糖”误触发营养表解析。
5. OCR API 请求继续使用 `category: 'food'` 保持后端兼容，同时追加非破坏性的 `target: 'ingredient_list'` 和配料表关键词提示；无 Key 或后端不支持时仍走原失败降级，不伪造 OCR。
6. 小程序侧补充 RapidOCR `bounds.points` 到 `x/y/width/height` 的矩形转换，让 `ocrAdapter` 能按坐标更稳定地排序文本块。
7. `capture` 与 `ImageUploader` 文案收敛为“拍配料表区域”，明确避开产品名、净含量、规格、厂家地址、条码和广告语；营养成分和致敏原仍保留在轻确认辅助分区，可手动补充。
8. `localTestSamples` 增加产品信息混入、有配料表前置产品信息、只有包装信息三个样例，覆盖“只保留配料”和“无配料保持低置信”的本地调试场景。

### 验证

已通过：

- `cd user-uniapp && npm install`
- `cd user-uniapp && npm run lint`
- `cd user-uniapp && npm run typecheck`
- `cd user-uniapp && npm run build:mp-weixin`
- `git diff --check`

## P0 识别质量、隐私与真机验收补强

### 本轮目标

在不新增页面、不扩大 P0 范围的前提下，继续打磨当前 6 个注册页中的主路径：

```text
首页 → 拍食品标签 / 手动输入 → OCR → 文本清洗 → 轻确认
→ 本地规则分析 → 消费建议 → 历史记录
```

禁止项继续保持：不做商品正面识别、条码识别、商品库优先匹配、mock 商品库主流程、商品对比、日化识别、登录、会员、支付、订阅、复杂搜索、法规查询或自动部署。

### 已完成修改

1. `labelTextExtractor` 收紧为只接收 `NormalizedOcrResult`，Demo 和草稿恢复也必须先走 `ocrAdapter`，页面不再向提取器传 legacy OCR 结构。
2. `labelTextExtractor` 补强配料、营养和致敏原锚点：支持 OCR 错字“配料衰”、繁体“營養成分 / 蛋白質 / 鈉”、英文 `Ingredients / Nutrition Facts / Contains / May contain`，弱锚点继续避开“营养成分表”。
3. 配料提取停止条件扩展到营养成分、致敏原、生产信息、厂家、地址、标准号、许可证、SC、净含量、条码等；营养和致敏原继续独立提取，不套用配料噪音过滤。
4. `ingredientParser` 增强食品配料 / Ingredients / OCR 错字锚点和停止条件，并保护 `单，双甘油脂肪酸酯` 与 `5'-呈味核苷酸二钠` 不被错误切分。
5. `nutritionParser` 新增 `salt` 字段和 `saltMg` 摘要，支持 `盐 / Salt` 独立解析；kJ/kcal 双向换算，继续支持糖、钠、脂肪、蛋白质、热量、每 100g / 100ml / per serving。
6. `additiveRules` 补充羧甲基纤维素钠 / CMC、单/双甘油脂肪酸酯英文别名、`5'-呈味核苷酸二钠` 英文别名；添加剂匹配统一为大小写不敏感的 name + aliases + keywords。
7. `decisionRules` 前置信息不足判断：无配料、低置信、只识别到营养表或只识别到广告语时，结果页不强行给明确消费结论，改为提示重新拍摄或手动补充。
8. 关注目标优先级固定为过敏 / 忌口 → 儿童模式 → 低钠 → 控糖 / 减脂 → 日常；结果页重点提醒最多展示 4 条。
9. `report` 页新增信息不足操作卡：重新拍摄、手动修改、返回首页。
10. `scanStore` 历史持久化继续最多 20 条；写入失败时删除最老记录后重试一次，第二次失败不让页面崩溃；持久化报告移除图片路径和图片摘要。
11. `settings` 隐私说明补齐：上传图片仅用于本次 OCR，历史不保存原图 / 图片路径 / 图片内容，本地只保存确认文本和分析结果；第三方 OCR 场景下图片可能发送至 OCR 服务；结果仅作标签阅读参考。
12. `localTestSamples` 增加特殊成分、英文添加剂别名、历史 20 条 LRU、规则库 fallback 等本地调试样例。

### 仍需人工配置 / 真机验收

- 微信小程序 AppID。
- 生产 OCR Key / provider 配置。
- 小程序 request 合法域名。
- 真实可访问的后端服务地址。
- 微信开发者工具导入 `user-uniapp/dist/build/mp-weixin`。
- 真机拍摄真实包装验证 OCR、失败降级、低置信提示、历史不保存图片、设置页不展示调试项。

### 验证

已通过：

- `cd user-uniapp && npm install`
- `cd user-uniapp && npm run lint`
- `cd user-uniapp && npm run typecheck`
- `cd user-uniapp && npm run build:mp-weixin`
- `git diff --check`

## P0 食品标签 OCR 解读稳定性补强

### 本轮目标

继续收缩小程序 MVP 到食品配料表 / 营养成分表 OCR 解读闭环，不新增商品库、条码识别、商品正面识别、商品对比或日化规则。重点补齐：

- 首页 Demo 体验入口。
- OCR 结果标准化 adapter。
- 清洗后的配料表 / 营养成分表 / 致敏原提示三段输入。
- 营养字段结构化解析。
- 添加剂 alias 匹配和本地规则 fallback。
- 阶段式 loading、结果反馈、历史 LRU。

### 已完成修改

1. 首页新增“身边没商品？点我体验一次”入口，使用内置食品标签样例走同一套本地分析流程，报告页显著标注“这是示例解读，不代表真实商品。”
2. 新增 `utils/demoSamples.ts` 和 `utils/localTestSamples.ts`，覆盖 Demo、广告语混入、生产/厂家信息混入、营养表混排、繁体、英文、OCR 错别字、仅营养表、仅广告语和致敏原提示等本地调试样例。
3. 新增 `utils/ocrAdapter.ts`，把当前 OCR 纯文本或 blocks 统一为 `NormalizedOcrResult`，保留可用坐标和置信度，后续 `labelTextExtractor` 不再依赖供应商返回结构。
4. `labelTextExtractor` 改为接收标准 OCR 结构或 legacy 输入，并补充英文 `Ingredients / Nutrition Facts / Contains / May contain` 等锚点；规则引擎只使用清洗后的 `ingredientText`、`nutritionText`、`allergenText`。
5. `nutritionParser` 新增 `parseNutritionSummary`，支持能量/热量、蛋白质、脂肪、碳水、糖、钠，以及 `kJ / kcal / g / mg / per 100g / per 100ml / per serving`。
6. `additiveRules` 支持 `name + aliases + keywords` 同时匹配，补充三氯蔗糖/蔗糖素/Sucralose、安赛蜜/乙酰磺胺酸钾/Acesulfame-K、阿斯巴甜/Aspartame、山梨酸钾/Potassium Sorbate、苯甲酸钠/Sodium Benzoate、黄原胶/Xanthan Gum、焦糖色/Caramel Color 等 alias。
7. 新增 `utils/rulesLoader.ts`，启动时优先读取本地缓存规则；远程规则地址为空时静默使用内置默认规则，远程失败不阻塞启动，校验不通过不覆盖缓存。
8. `capture` 识别和生成阶段增加阶段式 loading 文案：扫描配料文字、剔除无关噪音、识别添加剂和营养信息、结合当前关注目标分析；页面卸载时清理计时器。
9. 新增 `utils/localLabelAnalysis.ts`，Demo 和 capture 轻确认共用同一套本地报告构建流程，报告来源区分 OCR / 手动输入 / Demo。
10. `report` 页增加 Demo 提示卡和结果反馈入口；微信小程序使用原生 feedback 按钮，H5/其他端退化为提示用户反馈或重拍。
11. `history` 最多保留最近 20 条，写入失败时删除最老记录后重试一次；持久化报告不保存图片路径或图片 base64。
12. `decisionRules.buildAdditiveRecognitions` 改为基于清洗后的确认文本和拆分项共同识别添加剂，避免括号内添加剂被配料拆分遗漏。

### 验证

已通过：

- `npm --prefix user-uniapp run lint`
- `npm --prefix user-uniapp run typecheck`
- `npm --prefix user-uniapp run build:mp-weixin`
- `node /tmp/compcheck-ui-smoke.mjs`

H5 smoke 观察：

- 首页存在主标题、主按钮和 Demo 入口，未出现商品正面、条码、商品对比或日化入口。
- Demo 报告展示示例提示、结论和添加剂识别模块。
- 拍食品标签页展示配料表 / 营养成分表引导框，支持手动输入。
- 结果页首屏展示结论、一句话建议和添加剂识别，更多信息默认折叠，反馈入口可见。
- 我的关注、扫描记录路径可访问，历史可重新打开结果并删除。

## H5 截图后的 UI 继续收口

### 本轮目标

继续优化小程序 P0 主流程，不新增商品库、条码、商品对比或日化能力。重点根据 H5 截图压缩信息层级：

- 结果页先让用户看到结论、建议和添加剂识别。
- 重点提醒不要占满首屏。
- 轻确认页减少重复空态和过长输入区。
- 默认日常目标下，结论文案不要泛泛提儿童、过敏等未开启设置。

### 已完成修改

1. `report` 页将“添加剂识别”前移到“一句话建议”之后，保证添加剂核心能力进入首屏重点区域。
2. `report` 页“你需要留意的点”改为“重点提醒”，最多展示 4 条紧凑提示，降低报告页卡片堆叠感。
3. `capture` 页移除手动输入空白状态下的重复大空态卡片，避免用户在未输入时被二次提示打断。
4. `capture` 页把营养成分和致敏原提示文本框降为较短的辅助输入，配料表文本框保持主输入地位。
5. `decisionRules` 的结论摘要改为按当前目标生成，默认“日常”只提示日常关注，只有开启儿童模式或设置过敏/忌口时才进入摘要。
6. `capture` 页按钮按状态显示：手动输入模式不再显示“有误，手动修改”，无文字时不再显示“清空文字”。
7. 重新跑 H5 截图，确认首页、拍食品标签、轻确认、结果页、更多信息、我的关注、扫描记录均可访问；首页未出现 P0 外入口。

### 验证

已通过：

- `node /tmp/compcheck-ui-smoke.mjs`
- `npm --prefix user-uniapp run lint`
- `npm --prefix user-uniapp run typecheck`
- `npm --prefix user-uniapp run build:mp-weixin`
- `git diff --check`

## OCR 噪音过滤与有效标签提取

### 本轮目标

用户拍摄食品包装时，OCR 可能识别到品牌、广告语、净含量、生产日期、厂家地址、执行标准和条码等无关文字。本轮在小程序 P0 主流程中补齐：

```text
拍配料表 / 营养成分表
→ OCR
→ 文本清洗
→ 提取配料表、营养成分、致敏原提示
→ 轻确认 / 手动修正
→ 本地规则分析
→ 消费建议
```

实现边界：

- 不新增真实后端、不自动部署、不引入复杂依赖。
- 当前 OCR block 只有文本和置信度，没有坐标，因此本轮先做拍照 UI 引导，不做真实裁剪。
- 规则引擎不再直接分析 OCR 全文，只分析清洗后的有效标签文本。
- 未识别到清晰配料表时，不直接生成结果，引导重新拍摄或手动输入。

### 已完成修改

1. `ImageUploader` 增加透明矩形引导框，提示“请将配料表 / 营养成分表放在框内”，并提醒尽量避免拍到正面广告语。
2. 新增 `user-uniapp/src/utils/labelTextExtractor.ts`，接收 OCR 原文或 `OcrBlock[]`，输出 `ingredientText`、`nutritionText`、`allergenText`、`ignoredText`、`confidence` 和 `sourceType`。
3. 配料表提取优先使用“配料表 / 配料 / 食品配料 / 原料 / Ingredients”等强锚点，弱锚点避开“营养成分表”误命中。
4. 配料表提取遇到营养成分、致敏原提示、生产日期、保质期、厂家、地址、执行标准、条码、净含量等内容时停止，但保留营养表和致敏原段落供单独提取。
5. 营养成分表单独提取，保留能量、蛋白质、脂肪、碳水化合物、糖、钠、NRV、每 100g / 100ml 等信息，不套用配料噪音过滤。
6. 致敏原提示单独提取，识别“致敏原提示 / 过敏原提示 / 含有 / 可能含有”等提示和常见过敏原，不混入普通添加剂列表。
7. `capture` 轻确认从单个 OCR 原文文本框改为三段有效文本：配料表、营养成分、致敏原提示，并展示清洗置信度和已过滤行数。
8. `capture` 生成结果时只使用 `ingredientText + nutritionText + allergenText`；配料拆分只读 `ingredientText`，营养解析只读 `nutritionText`。
9. `decisionRules.buildAdditiveRecognitions` 只基于清洗后的确认文本和配料项识别添加剂，避免整张 OCR 原文噪音进入添加剂识别。
10. 低置信或未识别到配料表时禁用直接生成，引导用户重新拍摄配料表区域或手动输入。

### 风险与边界

- 目前没有 OCR 坐标，无法只裁剪引导框区域送 OCR；后续若 OCR provider 返回坐标或前端裁剪能力稳定，再接入真实裁剪。
- 文本提取是本地规则，仍需用户在轻确认区修正错字、漏字和 OCR 顺序错乱。
- `ignoredText` 只用于减少噪音，不作为数据来源或结论依据。
- 过敏/忌口提醒仍需用户结合包装过敏原提示和个人情况判断。

### 验证

已通过：

- `apt-get update`
- `apt-get install -y chromium chromium-driver`
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install -D @playwright/test`
- `npm --prefix user-uniapp install --prefer-offline`
- `npm --prefix user-uniapp run dev:h5 -- --host 127.0.0.1 --port 5176`
- `curl -I http://127.0.0.1:5176/`
- `node /tmp/compcheck-ui-smoke.mjs`
- `npm --prefix user-uniapp run lint`
- `npm --prefix user-uniapp run typecheck`
- `npm --prefix user-uniapp run build:mp-weixin`
- `git diff --check`

### 可用性自测补充

- ARM 机器已安装 Debian arm64 `chromium` / `chromium-driver`，`user-uniapp` 已新增 `@playwright/test` 开发依赖并跳过浏览器下载，H5 截图复用系统 Chromium。
- H5 预览服务已启动并用 Playwright 覆盖普通用户路径：首页、拍食品标签入口、手动输入、轻确认、结果页、更多信息展开、我的关注、扫描记录。
- 截图产物保存在 `/tmp/compcheck-screenshots/`，观测文件为 `/tmp/compcheck-screenshots/observations.json`。
- 首页主 CTA 清楚，没有商品正面、条码、商品库、商品对比或日化识别入口。
- 拍食品标签页展示配料表 / 营养成分表引导框；手动输入可以进入轻确认，轻确认展示清洗后的配料表、营养成分、致敏原提示。
- 结果页首屏能看到结论、一句话建议、重点提醒和独立添加剂识别模块；更多信息折叠区包含营养快照、确认后的标签文字、本次分析依据和免责声明。
- 截图发现默认日常目标下，未设置的乳制品 / 大豆过敏原词和多类提示叠加后，结论过度收紧到“不太适合当前目标”。已调整 `decisionRules`：未配置的常见过敏原只作为普通查看提示，不再加重结论；默认日常目标提高最重档阈值，过敏 / 忌口显式命中仍保持最高优先级。
- 未发现首页或主流程页面存在 P0 范围外入口。
