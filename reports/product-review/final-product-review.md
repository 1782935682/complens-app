# 成分镜产品评审与优化报告

当前状态：Round 27 黑盒评审未通过，失败和低分会话已保留。本轮暴露的上传入口、画像优先级、异常恢复、收藏/避雷反馈、对比页一致性和 DeepSeek schema 归一化已完成本地修复；仍需要下一轮全新黑盒复评确认。

最新进展：Round 27 已完成 6 个 Codex 用户会话、2 个降频 DeepSeek 会话和独立聚合。DeepSeek 本轮仍标记为 `text-black-box-interaction`；修复验证中控糖 DeepSeek 能输出统一任务 JSON，但仍有 2/8 用户任务未完成。`mp-weixin` 仅完成构建，未声明真机交互通过。

## 今天改了什么

| 用户场景 | 新增/修复 | 用户能感知到的变化 | 证据 |
| --- | --- | --- | --- |
| 首次用户/怀疑产品价值用户开始识别 | 识别页中央“选择包装标签图片”整块卡片变成可点击上传入口。 | 用户点最显眼的标题、图标或提示文字都能选择图片并进入购买建议，不必猜只有下方“上传识别”按钮能点。 | ![点击上传卡片后进入报告](screenshots/round-27/fix-upload-card-click/03-after-card-upload.png) |
| 控糖用户/过敏用户看同一商品 | 首屏风险排序改为按画像目标排序：控糖先看糖/碳水/甜味剂；设置牛奶忌口后才把牛奶命中放第一。 | 同一款高糖乳酸菌饮料，控糖用户第一眼看到糖 12.8g；牛奶过敏用户第一眼看到命中忌口，不会互相抢重点。 | ![控糖首屏先看糖](screenshots/round-27/fix-profile-priority/sugar-03-report.png) |
| 只拍正面/拍糊后恢复 | 信息不足页从多个补拍入口收敛为一个主目标：缺配料时只显示“补拍配料表”。 | 用户不用判断该点“补拍标签、补拍配料表还是补拍营养表”；按唯一主按钮补拍后能恢复到购买建议。 | ![信息不足单一补拍动作](screenshots/round-27/fix-recovery-single-action-front-v2/02-failure-report.png) |
| 收藏/避雷复购 | 未保存报告的底部按钮改成真正的“收藏建议/加入避雷”，首次点击强制保存并同步首页计数。 | 用户点保存后，首页能看到 1 条收藏或避雷，以及“下次参考/不再买”的购买理由。 | ![收藏后首页已保存](screenshots/round-27/fix-retention-save-action/05-saved-filter.png) |
| 过敏用户看单品 | 报告页新增“一键设为忌口并重算”；命中常见过敏原时不再同时展示“适合”正向标签。 | 看到牛奶/大豆等过敏线索后，可一键改成过敏画像，报告立即变成不建议购买。 | ![单品过敏重算](screenshots/round-25/smoke-report-allergen-onetap-after-fix/04-after-click-1.png) |
| 过敏用户做 A/B 对比 | 两款都含同一常见过敏原时，对比页新增“一键设为忌口并重算”。 | 不会只因为 B 低糖就误选；重算后直接显示两款都命中当前忌口。 | ![对比过敏重算](screenshots/round-25/smoke-compare-allergen-onetap-after-fix-pass/05-after-click-1.png) |
| 过敏用户看同类对比 | 两款都含同一常见过敏原但用户还没设置忌口时，顶部不再显示 A/B 胜出，改为“过敏先确认”。 | 过敏用户不会被低糖/低钠胜出款误导；未过敏用户仍能看糖、钠、添加剂谁更低。 | ![共同过敏原先确认](screenshots/round-26/fix-compare-shared-allergen-confirm-pass/04-compare.png) |
| 控糖用户看 A/B 对比 | 关键差异卡去掉容易误读的“A/平/B”文字分段，改成无干扰视觉标记和明确文案。 | 糖、碳水、钠直接显示 B 更低；共同过敏原仍显示先确认，不再出现“更低但像打平”的冲突。 | ![对比差异一致](screenshots/round-27/fix-compare-difference-label-v3/04-compare.png) |
| 控糖用户判断是否值得继续用 | 对比摘要首屏新增“比直接问 AI 省事”证据条。 | 用户不用读长说明，就能看到糖/碳水/钠同屏、按当前画像优先、包装实拍可核对。 | ![对比价值证据](screenshots/round-27/fix-compare-value-proof/04-compare.png) |
| 控糖/家长看报告 | 报告首屏新增重点事实卡，直接露出糖、碳水、钠、过敏原、甜味剂等。 | 不用翻完整标签文字，也能先看到控糖和儿童零食最关心的数据。 | `env-smoke-report-allergen-onetap-after-fix.json` 通过 |
| 拍糊/只拍正面 | 信息不足页新增缺失清单，逐项说明配料表、营养成分表、致敏提示、清晰度和条码作用。 | 用户知道下一张该拍哪里，不会只看到一句“信息不足”。 | ![信息不足缺失清单](screenshots/round-25/smoke-insufficient-checklist-after-fix/03-report.png) |
| 只拍正面后补拍 | 补拍入口按缺失项进入“补拍配料表/营养表”，并带入上一张商品线索后重新判断。 | 用户不会感觉从头再来；先拍正面失败后，补拍清晰标签可恢复到完整购买建议。 | ![补拍带入上一张](screenshots/round-26/fix-insufficient-recovery-merge/03-after-recovery-click.png) |
| 首次打开 | 首页首屏从“区别于 AI”改成买前 3 步：拍哪里、先看什么、缺信息怎么办。 | 新用户不用理解技术定位，先知道拿起包装该拍哪里、会得到什么结论。 | ![首页买前流程](screenshots/round-26/fix-home-first-open-flow/home.png) |
| 超市 30 秒决策 | 报告首屏改为结论、商品名、当前画像、3 条关键依据和 1-2 个主动作；移除首屏长“下一步”任务卡。 | 第一屏即可看到该不该买、为什么、下一步做什么，不再先读长解释。 | ![压缩后的报告首屏](screenshots/round-26/fix-report-first-screen-density/03-report.png) |
| 收藏/避雷复购 | 首页保存列表从“记录摘要”改成“购买理由摘要”，带控糖/儿童/过敏/低钠标签。 | 下次打开能看到这款为什么收藏或为什么别买，不必重读完整报告。 | 代码检查和 H5 构建通过 |
| 未完成识别复用 | 首页最近记录把信息不足报告标成“继续补拍”，说明待补拍记录可继续补齐。 | 用户下次回来知道这不是废记录，可以点进去补拍完成判断。 | ![继续补拍记录](screenshots/round-26/fix-retention-continue-draft/home.png) |
| 评审口径 | Round 25 聚合报告改为按超市、家长、控糖、过敏、恢复、复购、替代通用 AI 场景组织。 | 后续修复不再围绕 AI/runner 视角，而是围绕真实购物失败点。 | `reports/product-review/round-25/aggregation-agent.md` |

## 图文证据

### 上传卡片可直接点击

![点击上传卡片后进入报告](screenshots/round-27/fix-upload-card-click/03-after-card-upload.png)

Round 27 怀疑产品价值用户像真实用户一样点了识别页中央“选择包装标签图片”，原版本没有打开文件选择。现在该区域和“上传识别”按钮共用同一入口，上传清晰标签后直接进入购买建议。

### 画像优先级按用户目标排序

![控糖首屏先看糖](screenshots/round-27/fix-profile-priority/sugar-03-report.png)

同一款高糖且含牛奶的饮料，在控糖画像下首屏第一条依据是“糖/碳水 12.8g，高于提醒阈值 10g”，不是未设置忌口时的牛奶条件提醒。

![牛奶忌口首屏先阻断](screenshots/round-27/fix-profile-priority/milk-allergy-03-report.png)

切换为牛奶忌口后，同一商品首屏第一条变为“命中你的过敏/忌口项：牛奶”，结论进入不建议购买。这样控糖和过敏两类用户看到的是各自最该先判断的事。

### 信息不足只给一个主补拍动作

![信息不足单一补拍动作](screenshots/round-27/fix-recovery-single-action-front-v2/02-failure-report.png)

只有包装正面时，首屏明确“还不能判断该不该买”，下一步只提示拍清完整配料表；页面不再并列显示“补拍营养表/补拍标签”等相近入口。

![补拍后恢复购买建议](screenshots/round-27/fix-recovery-single-action-front-v2/04-recovered-report.png)

点击主补拍动作后，上传清晰标签可以恢复到购买建议。模糊/反光样本也通过同样流程恢复。

### 收藏和避雷能形成复购记忆

![收藏后首页已保存](screenshots/round-27/fix-retention-save-action/05-saved-filter.png)

未保存报告底部不再显示容易误解的“查看已保存”，而是直接显示“收藏建议”。点击后回首页，计数变为 1 收藏，并展示下次参考理由。

![避雷后首页已保存](screenshots/round-27/fix-retention-avoid-action/05-avoid-list.png)

牛奶忌口用户看到命中牛奶后点击“加入避雷”，首页显示 0 收藏 / 1 避雷，并保留不再买的理由。

### 单品过敏重算

![单品过敏重算](screenshots/round-25/smoke-report-allergen-onetap-after-fix/04-after-click-1.png)

上传含常见过敏原提示的食品后，点击“一键设为忌口”，报告按新画像重算，并出现“不要购买 / 不建议”结果。

### 对比过敏重算

![对比过敏重算](screenshots/round-25/smoke-compare-allergen-onetap-after-fix-pass/05-after-click-1.png)

高糖乳酸菌饮料和低糖酸奶饮品都含牛奶。点击一键忌口后，对比结论从“看胜出款”变成“过敏/忌口优先，两款都不选”。

### 共同过敏原先确认

![共同过敏原先确认](screenshots/round-26/fix-compare-shared-allergen-confirm-pass/04-compare.png)

两款都含牛奶但还没设置忌口时，对比页先提示过敏者不要只看胜出款；页面不再显示 A/B 胜出，只把糖、钠、添加剂作为“更低”差异展示。

### 对比差异一致

![对比差异一致](screenshots/round-27/fix-compare-difference-label-v3/04-compare.png)

控糖场景下，糖、碳水、钠和添加剂差异都用同一套结果展示。页面保留“B 更低”和“过敏先确认”，不再出现旧的“A 平 B”文字分段。

### 对比价值证据

![对比价值证据](screenshots/round-27/fix-compare-value-proof/04-compare.png)

对比摘要首屏直接展示“糖/碳水/钠同屏、当前画像优先、包装实拍可核对”。这是用户正在看的数据，不是单独的宣传文案。

### 模糊图恢复

![模糊图恢复](screenshots/round-25/smoke-recovery-checklist-after-fix/04-recovered-report.png)

模糊/反光样本先进入信息不足，补拍清晰标签后可恢复到正常报告。

### 正面图补拍恢复

![补拍带入上一张](screenshots/round-26/fix-insufficient-recovery-merge/03-after-recovery-click.png)

只有包装正面时，报告先阻断购买判断；点击“补拍配料表”后，补拍页明确显示已带入上一张商品线索，上传清晰标签后恢复到完整报告。

### 首页买前流程

![首页买前流程](screenshots/round-26/fix-home-first-open-flow/home.png)

首页首屏不再把“和通用 AI 的区别”作为主说明，改成真实购物动作：拍配料/营养/条码，先看买/谨慎/不建议，缺信息就补拍。

### 继续补拍记录

![继续补拍记录](screenshots/round-26/fix-retention-continue-draft/home.png)

首页最近判断区把待补拍记录作为可继续任务展示；收藏和避雷保留购买理由，待补拍用于完成未结束识别。

### 30 秒报告首屏

![压缩后的报告首屏](screenshots/round-26/fix-report-first-screen-density/03-report.png)

首屏只保留用户购买决策需要的信息：结论、商品名、当前关注项、过敏/糖等关键依据，以及“设为忌口/拍第二款对比”等主动作。完整标签文字和来源放到下方证据区。

## 自动验证

| 检查 | 结果 |
| --- | --- |
| `npm --prefix user-uniapp run typecheck` | 通过 |
| `npm --prefix user-uniapp run lint` | 通过 |
| 上传卡片真实点击 H5 冒烟 | 通过，点击“选择包装标签图片”进入报告 |
| 控糖/牛奶忌口双画像首屏顺序 H5 冒烟 | 通过 |
| 只拍正面一步式补拍恢复 H5 冒烟 | 通过 |
| 模糊图一步式补拍恢复 H5 冒烟 | 通过 |
| 信息不足残留文案检查 | 通过，不再出现并列“补拍营养表/补拍标签”入口 |
| 收藏建议 H5 冒烟 | 通过，首页显示 1 条收藏和购买理由 |
| 加入避雷 H5 冒烟 | 通过，首页显示 1 条避雷和不再买理由 |
| 控糖 A/B 对比一致性 H5 冒烟 | 通过，页面显示 B 更低、糖、碳水、过敏先确认，且不显示 A 平 B |
| 对比页可见文本检查 | 通过，0 个控制台错误，0 个网络错误 |
| DeepSeek 控糖 runner schema 修复验证 | 通过，独立会话无 `runnerFinalReviewError`，6/8 任务完成，2/8 作为真实交互失败保留 |
| H5/API 环境守护 | 通过，12 秒 5 次采样，H5 首页、H5 代理 health、直连 API health 均可达 |
| 对比价值证据 H5 冒烟 | 通过，首屏文本包含“比直接问 AI 省事”“糖/碳水/钠同屏”“包装实拍可核对” |
| `npm --prefix user-uniapp run regression:ocr-report` | 通过，45 个场景 |
| `npm run user:build:h5` | 通过 |
| `npm run user:build:mp-weixin` | 通过，仅代表构建成功 |
| 信息不足后补拍合并 H5 冒烟 | 通过 |
| 报告首屏压缩 H5 冒烟 | 通过 |
| 共同过敏原对比 H5 冒烟 | 通过；首次断言失败和胜出摘要问题已保留为 `fix-compare-shared-allergen-confirm.json` |
| 首页首屏流程视觉检查 | 通过 |
| 留存继续补拍视觉检查 | 通过 |
| `npm run user:visual:smoke` | 通过；旧断言失败已保留为 `fix-report-first-screen-density-visual-smoke-initial-failure.json` |
| `npm --prefix user-uniapp run audit:product-output` | 通过，27 项 |
| `npm run test` | 通过；本轮首次沙箱运行因 `.codex/state/checkpoint.json` 只读失败，已保留，提升权限重跑通过 |
| `git diff --check` | 通过 |
| 单品过敏一键重算 H5 冒烟 | 通过 |
| 对比过敏一键重算 H5 冒烟 | 通过 |
| 控糖 A/B 对比 H5 冒烟 | 通过 |
| 模糊恢复 H5 冒烟 | 通过 |
| 信息不足缺失清单 H5 冒烟 | 通过 |

## 后续任务

| 优先级 | 任务 | 为什么重要 |
| --- | --- | --- |
| P1 | Round 28 用全新会话复评控糖任务覆盖：信息不足是否稳定、产品替代性是否能自然理解。 | 本轮已把对比价值前置，但不能代替真实用户复评。 |
| P1 | 用全新会话复评 Round 27 已修复链路：上传、画像、恢复、收藏/避雷、对比。 | 本地修复不能替代真实用户黑盒结果。 |
| P1 | 儿童场景继续强化添加剂、色素、甜味剂和高糖高钠解释。 | 家长需要的是儿童购买理由，不是成人通用建议。 |
| P1 | 复购页继续打磨成“购买记忆卡”，保留上次理由、画像和当前建议。 | 收藏/避雷必须让用户下次更快决策。 |
| P2 | 把“比直接问 AI 省事”的说明折叠，改用流程证明差异。 | 用户不需要反复看定位文案。 |
| P2 | 下一轮评审减少 DeepSeek 次数：非最终打磨轮只跑关键 1-2 个角色；最终验收轮再恢复完整覆盖。 | 按用户要求降低 DeepSeek 频次，同时保留覆盖缺口说明。 |

## Round 27 复评摘要

| 项目 | 结果 |
| --- | --- |
| Codex 用户会话 | 6/6 已完成，失败和低分保留 |
| DeepSeek 用户会话 | 2/2 已完成，按要求降频；不能作为最终验收覆盖 |
| DeepSeek 模式 | `text-black-box-interaction`，不声明视觉评审 |
| 聚合结论 | 1 个 P0、多个 P1；Round 27 不通过 |
| 已修复 | 上传卡片点击、画像优先级、异常恢复、收藏/避雷反馈、对比一致性、DeepSeek schema 归一化、H5/API 环境守护 |
| 仍需处理 | 控糖任务覆盖复评、下一轮全新黑盒复评 |

### Round 27 关键发现

| 场景 | 用户结果 | 处理判断 |
| --- | --- | --- |
| 怀疑产品价值用户 | 点中央上传文案后没有进入报告，直接触发 P0。 | 已修复卡片点击入口；下一轮必须复评。 |
| 控糖用户 | 认为未设置忌口时，过敏提示不应压过糖、碳水和甜味剂。 | 已按画像目标重排首屏依据，下一轮复评确认。 |
| 过敏用户 | 觉得默认“谨慎”不够明确，同时需要看到命中词和来源。 | 强阻断必须绑定用户忌口/致敏提示来源，不能空泛下结论。 |
| 家长 | 能看到儿童画像更严，但缺少“为什么变严”的差异说明。 | 报告首屏要解释画像触发项。 |
| 留存 | 收藏/避雷反馈和首页计数不一致。 | 已修成可确认的购买记忆，下一轮复评确认。 |
| 对比 | 控糖用户需要更明确的糖、碳水、钠差异。 | 已统一关键差异展示，下一轮复评确认。 |
| DeepSeek 控糖 | schema 修复后仍有信息不足和产品替代性任务未完成。 | 已前置对比价值证据；失败仍保留，下一轮按场景复评。 |

## Round 26 复评摘要

| 项目 | 结果 |
| --- | --- |
| Codex 用户会话 | 6/6 已完成，截图 256 张 |
| DeepSeek 用户会话 | 2/2 已完成，按要求降频；不能作为最终验收覆盖 |
| DeepSeek 模式 | `text-black-box-interaction`，不声明视觉评审 |
| 机器聚合 | P0 5 / P1 39 / P2 42 / P3 52 |
| 最主要失败 | 上传识别/信息不足链路仍是第一放弃点 |

### Round 26 关键发现

| 场景 | 用户结果 | 处理判断 |
| --- | --- | --- |
| 首次用户 | 能完成识别、补拍、对比、忌口重算和避雷；认为比通用 AI 有差异。 | 可保留当前主流程，但报告仍偏长。 |
| 超市 30 秒用户 | 能理解产品，但报告太长，评分语言不够快。 | 首屏还要继续压缩。 |
| 家长 | 价值成立，但画像不够前置，历史/样本状态混入会损害信任。 | 儿童添加剂和画像入口继续前置。 |
| 控糖 | 多个公开样本会话停在信息不足，无法证明控糖单品和 A/B 价值。 | 这是 Round 26 P0，必须先处理环境稳定和上传状态。 |
| 过敏 | 信息不足不硬判有价值，但清晰标签识别失败、过敏画像保存和对比胜出文案仍影响信任。 | 过敏路径不能发布。 |
| 怀疑产品价值 | 认可“不硬判”和证据边界，但没有稳定产出购买判断时不会替代通用 AI。 | 产品价值仍需由稳定结果证明。 |

### Round 26 已确认的覆盖缺口

- 本轮 DeepSeek 只跑 2 个角色，是按“这次之后减少 DeepSeek 评审次数”执行的非最终打磨轮；不能用于最终通过判断。
- Round 26 中 public sample 曾因 API/H5 环境不稳定出现 502 和全部信息不足；失败会话已保留。重启 API 后 `env-smoke-public-sample01-after-api-restart.json` 通过，说明下一轮必须加入环境健康守护，不能让用户会话期间 API 静默中断。

## Round 26 P0 修复记录

| 问题 | 修复 | 验证 |
| --- | --- | --- |
| API/proxy 断线时用户只看到普通信息不足 | H5 代理失败改为结构化 `api_proxy_unavailable`；前端 OCR 识别为“识别服务暂时不可用”。 | `reports/product-review/round-26/fix-api-down-ui.json` 通过 |
| 服务不可用仍自动生成信息不足报告 | Capture 页遇到 OCR 服务不可用时停留在上传页，提示稍后重试或手动补充。 | ![API故障提示](screenshots/round-26/fix-api-down-ui/03-api-down.png) |
| 冒烟脚本在 API 断线时继续跑 | report/compare/recovery 浏览器冒烟增加 `/api/health` preflight。 | `fix-public-sample01-health.json`、`fix-public-compare-health.json` 通过 |
| 只拍正面后补拍像重新开始 | 补拍入口保存上一张商品线索，Capture 页按缺失项展示“补拍配料表/营养表”，新照片识别后合并缺失字段再判断。 | `reports/product-review/round-26/fix-insufficient-recovery-merge.json` 通过 |
| 报告首屏太长，30 秒用户抓不到重点 | 移除首屏长任务卡和重复数据块，改成快速决策面板：分数、画像、3 条依据、主动作。 | `reports/product-review/round-26/fix-report-first-screen-density.json` 通过 |
| 共同过敏原被“胜出款”冲淡 | 共同常见过敏原未设置忌口时，最终态改为“过敏先确认”，屏蔽远端胜出摘要，差异行用“更低”而非“胜出”。 | `reports/product-review/round-26/fix-compare-shared-allergen-confirm-pass.json` 通过 |
| 首页首屏从产品定位角度解释太重 | 首页把通用 AI 对比文案降级，改成买前 3 步流程卡。 | `reports/product-review/round-26/fix-home-first-open-flow.json` 通过 |
| 待补拍/收藏/避雷的复用价值不够明确 | 首页最近判断说明待补拍可继续补齐，未完成记录按钮改为“继续补拍”。 | `reports/product-review/round-26/fix-retention-continue-draft.json` 通过 |

这些是本地修复验证，不覆盖 Round 26 原始低分；下一轮仍需全新用户会话复评。

## 覆盖缺口

- DeepSeek 当前只能算 `text-black-box-interaction`，不能声明视觉评审完成。
- `mp-weixin` 已构建，但没有微信开发者工具真机交互验证，不能声明小程序真实环境完全通过。
- Round 25 的失败评审、分歧和失败冒烟文件均保留，未删除低分结果。
