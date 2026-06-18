请直接检查并修改当前项目，完成“食品成分知识库数据补齐、数据库迁移、数据导入和覆盖报告”任务。

当前执行目录就是项目仓库根目录。

官方材料输入目录固定为当前仓库下：

docs/source-materials/

Codex 自动补下载的官方材料保存到：

docs/source-materials/downloaded/

报告输出目录固定为当前仓库下：

docs/

解析产生的中间文件、staging、manifest、缓存目录固定为：

data/official_sources/

不要使用任何绝对路径。
不要扫描 docs/ 根目录作为官方材料输入目录。
不要移动、覆盖、删除、改名 docs/source-materials/ 下已有官方原始文件。

# 一、最高目标

本次最优先目标是：尽量一次性补齐食品成分知识库实际数据，而不是只建表或只写导入框架。

要求：

1. 优先使用中国官方标准、公告、目录、问答和附件。
2. 官方数据不完整时，允许补充可靠非官方数据。
3. 非官方数据必须准确、可追溯、标明来源等级，不得伪装成官方数据。
4. 每条正式数据必须有来源。
5. 不确定数据进入 staging 或待复核层，不得提升为 verified。
6. 尽量一次性完成：扫描文件、下载缺失来源、解析、迁移、导入、校验、提升、测试、报告。
7. 需要用户抉择时，不要猜测；生成 docs/decision-required.md，暂停该分支，继续其他可执行任务。
8. 本次不实现页面、不实现扫码、不实现 OCR、不改结果页。

# 二、本次范围

本次只处理：

* 官方材料盘点
* 缺失材料检索和下载
* 非官方可靠数据源补充策略
* PDF、Excel、Word、HTML 解析
* 食品成分知识库数据库结构
* 数据库迁移
* staging 数据导入
* 数据质量校验
* 正式数据提升
* 现有添加剂数据兼容
* 数据更新脚本
* 自动化测试
* 数据覆盖报告

本次不要处理：

* 小程序页面
* 结果页面
* 页面文案
* 用户交互流程
* 条码扫描功能
* 二维码扫描功能
* OCR 拍照功能
* 商品库建设
* 健康评分展示
* 现有 API 返回结构变更
* 生产环境部署

“扫商品条码”“扫数字标签二维码”“拍配料表 OCR”是后续三个并列入口。

本次只建设三个入口共同依赖的食品成分知识库、官方规则库、营养规则库、过敏原规则库和数据来源体系。

# 三、来源优先级

## S0：中国官方监管来源

最高优先级，包括：

* 国家卫生健康委员会
* 国家市场监督管理总局
* 国家食品安全风险评估中心
* 全国标准信息公共服务平台
* 中国政府网
* 其他中国国家机关正式发布的标准、公告、目录和附件

来源状态可标记为：

* verified_regulation
* verified_official_standard
* verified_official_catalog

这类数据可用于确认：

* 中国境内监管状态
* 标准名称
* 允许使用范围
* 最大使用量
* 食品分类
* 不适宜人群
* 推荐食用量
* 标签要求
* 新增、修改、废止关系

## S1：国际官方或政府机构来源

可选来源包括：

* WHO
* FAO
* Codex Alimentarius
* USDA
* FDA
* EFSA
* 其他国家政府机构或政府数据库

来源状态标记为：

* verified_international_official

这类数据可用于补充：

* 英文名称
* 拉丁名称
* 化学名称
* 通用别名
* 国际编码
* 基础分类
* 营养成分基础信息

不得仅凭国际来源认定某成分在中国允许使用。
不得覆盖中国官方监管规则。

## S2：企业一手资料

包括：

* 企业官网
* 企业正式数字标签
* 商品实体标签照片
* 企业正式产品说明书
* 企业公布的配料表
* 企业公布的营养成分表

来源状态标记为：

* observed_digital_label
* observed_manufacturer_label
* verified_manufacturer_source

这类数据只能用于商品级标签、普通配料写法、配料表、营养表和实际标示形式。

企业数据不得标记为国家监管数据。

## S3：权威非官方数据

包括：

* 有明确维护主体和版本的数据集
* 权威科研机构数据
* 同行评议论文附属数据
* 正规行业协会公开数据
* 有清晰数据许可的开放数据库
* 有明确更新时间和许可说明的专业数据源

来源状态标记为：

* verified_secondary

使用前必须记录：

* 发布机构
* 数据许可
* 更新时间
* 数据版本
* 原始来源
* 是否允许缓存和再分发

## S4：社区或众包数据

只在 S0-S3 都不能覆盖时使用。

必须至少满足以下条件之一：

1. 有清晰标签原图可以核对。
2. 有两个独立来源交叉验证。
3. 能与企业官方信息或监管数据交叉验证。
4. 已经人工复核。

来源状态标记为：

* community_verified
* community_unverified
* unverified

未经验证的数据只能进入 staging 或待复核表。

# 四、禁止使用的数据

以下数据不得进入正式表：

* 无法确定发布者的数据
* 没有来源地址的数据
* 搜索引擎摘要
* AI 自行推测的成分事实
* 无法确认版本的数据
* 复制转载但找不到原始来源的数据
* 许可证明确禁止使用或缓存的数据
* 不同来源严重冲突且尚未解决的数据
* 只有营销描述而没有标签、标准或技术依据的数据

搜索结果只能用于定位来源，不得直接作为数据库事实。

# 五、需要用户确认的情况

当前是 codex exec 非交互执行，不要中途阻塞全部任务。

遇到以下情况，生成：

docs/decision-required.md

并暂停该分支，继续其他可执行任务：

1. 需要购买付费数据源或 API。
2. 数据源许可证不明确。
3. 两个高可信来源存在重大冲突。
4. 需要破坏性数据库迁移。
5. 需要改变现有 API 或业务行为。
6. 需要导入低置信度数据。
7. 某个映射会影响大量现有数据。
8. 需要选择多个可能的规范名称。
9. 需要引入新的商业数据库。
10. 需要把非官方分析结论用于结果页。

decision-required.md 每个事项必须包含：

* 问题描述
* 涉及数据量
* 选项 A
* 选项 B
* 其他选项
* Codex 推荐选项
* 推荐理由
* 每个选项影响
* 默认安全处理
* 需要用户回复的明确问题

# 六、先审查现有项目

修改前先检查并记录：

1. 当前后端技术栈。
2. 当前数据库类型。
3. ORM 和迁移工具。
4. Docker Compose 配置。
5. 本地开发数据库连接方式。
6. 当前数据库表结构。
7. 当前已有导入脚本。
8. 当前已有 PDF 解析脚本。
9. 当前已有测试命令。
10. 当前已有 lint、typecheck、build 命令。
11. 当前 ingredients 查询和匹配逻辑。
12. 当前添加剂分析依赖字段。
13. 当前是否存在以下或等价结构：

    * ingredients
    * additive_usage_rules
    * gb2760_official_records
    * gb2760_official_pages
    * gb2760_official_reference_rows
    * source_documents
    * import_runs
    * import_errors
14. 当前正式数据、staging 数据、未验证数据数量。
15. 当前数据库是否为本地开发库。

不要相信旧报告统计，必须重新查询数据库。

不得连接、修改、清空或迁移生产数据库。

如果不能确认是开发环境，停止数据库写入，只生成代码、迁移、解析结果和报告，并在最终汇报中说明。

# 七、扫描官方材料目录

递归扫描：

docs/source-materials/

识别：

* PDF
* XLSX
* XLS
* CSV
* DOCX
* DOC
* HTML
* HTM

优先处理：

* GB 2760-2024 食品添加剂使用标准
* GB 14880-2012 食品营养强化剂使用标准
* 2023 年“三新食品”汇总目录
* 党参等 9 种食药物质目录
* 地黄等 4 种食药物质目录
* 可用于食品的菌种名单
* 可用于婴幼儿食品的菌种名单
* GB 7718
* GB 28050
* 数字标签相关公告
* 其他食品安全国家标准、公告、目录、问答、解读

不能只根据文件名判断是否官方。

每个文件记录：

* 原始文件名
* 相对路径
* 文件类型
* 文件大小
* SHA-256
* 文档标题
* 标准号
* 公告号
* 发布机构
* 发布日期
* 实施日期
* 废止日期
* 官方公告页面
* 官方附件地址
* 来源等级
* 解析状态
* 解析器版本
* 获取时间
* 数据有效状态

要求：

1. 不移动原始文件。
2. 不覆盖原始文件。
3. 不修改原始文件。
4. 不重命名原始文件。
5. 用 SHA-256 去重。
6. 相同哈希文件只解析一次。
7. 文件标题与正文明显不一致时不得导入正式表。
8. 无法确认官方来源的文件只能进入待核验状态。
9. 不把项目生成报告当作官方输入文件。

# 八、自动查找和下载缺失资料

优先从以下中国官方域名查找和下载：

* nhc.gov.cn
* zwfw.nhc.gov.cn
* cfsa.net.cn
* sppt.cfsa.net.cn
* samr.gov.cn
* std.samr.gov.cn
* openstd.samr.gov.cn
* gov.cn

自动下载的官方文件保存到：

docs/source-materials/downloaded/

不要把自动下载文件放到 data/official_sources/。
不要把自动下载文件放到 docs/ 根目录。

如果官方数据不存在或明显不完整，可查找可靠非官方来源，但必须：

1. 不覆盖官方数据。
2. 不标记为官方。
3. 记录 source_tier。
4. 记录 source_status。
5. 记录 license。
6. 记录 confidence_score。
7. 记录 verification_method。
8. 无法验证时进入 staging 或待复核。

# 九、建立来源目录

创建或复用：

data/official_sources/
raw/
manifests/
extracted/
staging/
reports/
failed/
checksums/

建立统一来源清单，例如：

data/official_sources/manifests/sources.yaml

或使用符合项目技术栈的 JSON、YAML、数据库配置。

每个来源至少记录：

* source_id
* source_tier
* source_status
* source_type
* title
* standard_no
* announcement_no
* source_org
* official_page_url
* attachment_url
* original_source_url
* local_file_path
* sha256
* publication_date
* effective_date
* expiry_date
* retrieved_at
* source_version
* license
* parser_name
* parser_version
* parse_status
* verification_status
* confidence_score
* supersedes_source_id
* superseded_by_source_id
* notes

# 十、需要补齐的数据类别

## A. 食品添加剂：GB 2760

检查并补齐：

* 表 A.1
* 表 A.2
* 附录 B
* 附录 C
* 附录 D
* 附录 E
* 附录 F
* 食品分类代码
* 食品分类名称
* 食品添加剂标准名称
* CNS 编号
* INS 编号
* 功能类别
* 最大使用量
* 使用单位
* 使用范围
* 残留量
* 例外食品类别
* “按生产需要适量使用”
* 食品用香料
* 食品工业用加工助剂
* 胶基糖果基础剂物质
* 食品添加剂功能类别
* 编码和名称参考关系

检查当前 staging 表中是否已有有效数据。

已解析且通过校验的数据应安全提升为正式数据。

不得因为缺少 ingredient_id 静默丢弃记录，必须输出无法关联原因。

## B. 营养强化剂：GB 14880

解析并补齐：

* 营养强化剂名称
* 营养素名称
* 化合物来源
* 化合物名称
* 化合物别名
* 食品类别代码
* 食品类别名称
* 使用量
* 使用单位
* 特殊限制
* 适用范围
* 婴幼儿食品规则
* 特殊膳食食品规则
* 表格编号
* 页码
* 来源行定位

检查后续公告是否新增、修改、废止 GB 14880 相关品种、来源、范围、使用量。

后续公告不得覆盖历史数据，应按有效期保存版本。

## C. 三新食品

以已有三新食品汇总目录为基础，核实其覆盖起止时间。

继续从官方平台查找并补充汇总目录之后、截至本次执行日期的正式公告和附件。

处理：

* 新食品原料
* 食品添加剂新品种
* 营养强化剂新品种
* 食品用菌种
* 食品用酶制剂
* 扩大使用范围
* 扩大使用量
* 名称修改
* 规格要求修改
* 使用范围修改
* 废止
* 替换
* 纠错公告

不要将以下内容作为食品成分导入：

* 食品相关产品新品种
* 食品接触材料
* 包装材料
* 树脂
* 涂层
* 生产设备材料

新食品原料提取：

* 中文名称
* 拉丁名称
* 英文名称
* 来源物种
* 来源部位
* 生产工艺
* 推荐食用量
* 食用方式
* 不适宜人群
* 婴幼儿限制
* 孕妇限制
* 哺乳期人群限制
* 质量规格要求
* 标签要求
* 公告号
* 公告日期
* 有效状态

食品添加剂新品种提取：

* 标准名称
* 别名
* INS 编号
* CNS 编号
* 功能类别
* 食品类别
* 最大使用量
* 单位
* 使用限制
* 公告号
* 与 GB 2760 现有记录关系

三新食品与 GB 2760 重复时，不得创建重复主成分，应建立来源关系和规则版本关系。

## D. 食药物质目录

补齐：

* 基础食药物质名单
* 当归等 6 种新增食药物质公告
* 党参等 9 种
* 地黄等 4 种
* 截至执行日期的其他正式新增、修改、纠错公告

提取：

* 规范名称
* 其他名称
* 植物名称
* 拉丁学名
* 科名
* 使用部位
* 食用方式
* 使用限制
* 仅作为香辛料或调味品等限制
* 公告号
* 公告日期
* 有效状态

同一物质多次出现时，不得重复创建主成分。

## E. 食品菌种

解析：

* 可用于食品的菌种名单
* 可用于婴幼儿食品的菌种名单

提取：

* 中文规范名称
* 拉丁规范名称
* 原中文名称
* 原拉丁名称
* 菌株号
* 菌株限制
* 使用范围
* 是否允许用于婴幼儿食品
* 适用年龄限制
* 名称变更关系
* 来源文件
* 页码
* 表格位置

原名称作为别名或历史名称保存。

不得将同一菌种新旧名称创建为两个独立主成分。

菌种和具体菌株需要区分。

## F. 配料表和过敏原规则

查找、解析、补齐：

* GB 7718-2011
* GB 7718-2025
* 官方问答
* 官方解读
* 预包装食品数字标签相关公告
* 数字标签相关问答

提取：

* 配料表标示规则
* 配料排列规则
* 复合配料规则
* 食品添加剂标示规则
* 营养强化剂标示规则
* 菌种标示规则
* INS 编号标示规则
* 配料定量标示规则
* 八大类致敏物质
* 致敏物质直接声明
* “可能含有”
* 共线生产
* 交叉污染提示
* 数字标签字段规则
* 数字标签生效日期
* 不同标准版本有效期

不得把未来生效标准直接当作当前唯一有效规则。

必须保存旧版和新版规则有效时间。

过敏原至少支持：

* 含麸质谷物
* 甲壳类动物
* 鱼类
* 蛋类
* 花生
* 大豆
* 乳及乳制品
* 坚果及果仁

过敏原关系必须区分：

* direct：标签直接声明含有
* inferred：根据已核验成分来源推断
* possible：可能含有或交叉污染

不得把 possible 解释成确定含有。

## G. 营养成分和营养声称规则

查找、解析、补齐：

* GB 28050-2011
* GB 28050-2025
* 官方问答
* 官方解读
* 营养标签相关正式修改单或公告

提取：

* 营养素规范名称
* 营养素别名
* 能量单位
* 质量单位
* NRV
* NRV 单位
* 100g 计量基础
* 100ml 计量基础
* 每份计量基础
* 每份换算规则
* 能量换算规则
* 蛋白质规则
* 脂肪规则
* 饱和脂肪规则
* 碳水化合物规则
* 糖规则
* 钠规则
* “高”
* “低”
* “无”
* “富含”
* “减少”
* “增加”
* 其他官方营养声称条件
* 标准版本
* 生效日期
* 失效日期

不得把营养声称条件直接转换成疾病风险或健康评分。

## H. 普通食品原料

尽量补充普通食品原料，但必须分级。

普通食品原料来源包括：

1. 官方标准或公告中明确出现的普通原料。
2. 官方产品标准中出现的普通原料。
3. 企业数字标签或实体标签中观察到的普通原料。
4. 可靠非官方数据源中可验证的普通原料。

要求：

* 不得声称已经有官方全量普通食品原料库。
* 不得用第三方词库后标记为官方。
* 不得根据常识批量生成。
* 水、白砂糖、小麦粉、乳粉、植物油等必须有来源。
* 无法确认来源时进入 unverified 或 staging。
* 尽量补充别名、分类、过敏原关系、添加糖/糖醇等标签。

# 十一、数据库结构

根据现有架构安全扩展。

已有等价表优先复用或扩展，不要整体重构。

## 1. ingredients

支持成分类型：

* ordinary_ingredient
* food_additive
* nutrition_fortifier
* novel_food_ingredient
* food_medicine_substance
* food_microorganism
* allergen_source
* compound_ingredient
* other

建议字段或等价结构：

* id
* canonical_name
* normalized_name
* ingredient_type
* regulatory_status
* source_status
* description
* cns_code
* ins_code
* cas_number
* enabled
* valid_from
* valid_to
* created_at
* updated_at

CAS 号只有官方或高可信来源明确提供时保存。

一个成分可能属于多个分类时，不要只依赖单枚举，可增加标签或多对多分类。

## 2. ingredient_aliases

至少支持：

* ingredient_id
* alias_name
* normalized_alias
* alias_type
* language
* source_id
* source_status
* is_official
* confidence_score
* created_at
* updated_at

alias_type 至少支持：

* official_alias
* previous_name
* latin_name
* english_name
* common_name
* ins_code
* cns_code
* formatting_variant
* ocr_variant
* other

格式归一化变体不能标记为官方别名。

OCR 常见误识别词不得未经人工确认标记为官方别名。

## 3. ingredient_tags

用于表达：

* 添加糖
* 糖醇
* 甜味剂
* 防腐剂
* 增稠剂
* 着色剂
* 抗氧化剂
* 乳来源
* 大豆来源
* 花生来源
* 含麸质谷物来源
* 新食品原料
* 食药物质
* 儿童相关限制
* 婴幼儿相关限制

标签来源必须区分：

* official
* derived
* product_rule
* manual_verified
* unverified

不得把产品分析标签伪装成官方监管事实。

## 4. ingredient_relations

支持：

* alias_of
* previous_name_of
* source_of
* derived_from
* contains
* may_contain
* belongs_to_allergen
* fortifier_compound_of
* strain_of
* replaced_by
* supersedes
* modified_by_announcement
* other

字段至少包括：

* source_ingredient_id
* target_ingredient_id
* relation_type
* source_id
* evidence_summary
* confidence
* valid_from
* valid_to
* status

## 5. official_sources 或 source_documents

如果 source_documents 能满足要求，优先复用或扩展。

至少保存：

* source_id
* source_tier
* source_status
* source_org
* source_type
* standard_no
* announcement_no
* title
* official_page_url
* attachment_url
* original_source_url
* local_file_path
* publication_date
* effective_date
* expiry_date
* retrieved_at
* sha256
* source_version
* license
* parser_version
* verification_status
* confidence_score
* status
* created_at
* updated_at

## 6. ingredient_source_relations

每条正式监管数据必须追溯到：

* ingredient_id
* source_id
* page_number
* table_name
* row_reference
* section_reference
* original_name
* evidence_summary
* valid_from
* valid_to
* status

## 7. additive_usage_rules

保留现有兼容性。

至少支持：

* ingredient_id
* source_id
* food_category_code
* food_category_name
* allowed_status
* max_use_level
* unit
* residue_level
* use_principle
* exclusions
* restrictions
* notes
* valid_from
* valid_to
* status

不得将“允许使用”解释为“安全”“推荐”或“无风险”。

## 8. nutrition_fortifier_rules

至少支持：

* ingredient_id
* nutrient_id
* source_id
* compound_name
* food_category_code
* food_category_name
* min_use_level
* max_use_level
* unit
* restrictions
* valid_from
* valid_to
* status

## 9. allergen_categories

至少支持：

* id
* code
* canonical_name
* description
* source_id
* valid_from
* valid_to
* status

## 10. ingredient_allergen_relations

至少支持：

* ingredient_id
* allergen_category_id
* relation_type
* source_id
* evidence_summary
* confidence
* review_status
* valid_from
* valid_to

relation_type 至少支持：

* direct
* inferred
* possible

## 11. nutrients

至少支持：

* id
* canonical_name
* normalized_name
* standard_unit
* nutrient_type
* enabled
* created_at
* updated_at

## 12. nutrition_aliases

至少支持：

* nutrient_id
* alias_name
* normalized_alias
* source_id
* is_official

## 13. nutrition_reference_values

至少支持：

* nutrient_id
* source_id
* value
* unit
* population_scope
* valid_from
* valid_to
* status

## 14. nutrition_claim_rules

至少支持：

* nutrient_id
* source_id
* claim_type
* comparison_operator
* threshold_value
* threshold_unit
* basis_type
* additional_conditions
* valid_from
* valid_to
* status

basis_type 至少支持：

* per_100g
* per_100ml
* per_serving
* energy_ratio
* other

## 15. microorganism_strains

至少支持：

* ingredient_id
* strain_code
* permitted_for_general_food
* permitted_for_infant_food
* age_restrictions
* usage_restrictions
* source_id
* valid_from
* valid_to
* status

## 16. novel_food_ingredient_rules

至少支持：

* ingredient_id
* source_id
* source_species
* edible_part
* production_process
* recommended_daily_intake
* intake_unit
* unsuitable_populations
* label_requirements
* quality_requirements
* valid_from
* valid_to
* status

## 17. food_medicine_rules

至少支持：

* ingredient_id
* source_id
* botanical_name
* latin_name
* family_name
* edible_part
* permitted_use
* usage_restrictions
* valid_from
* valid_to
* status

# 十二、现有数据兼容

如果项目已有添加剂数据：

1. 不得删除现有 ingredients 记录。
2. 不得删除现有 additive_usage_rules。
3. 不得丢失人工维护字段。
4. 不得改变现有主键。
5. 不得破坏现有添加剂查询。
6. 不得破坏现有 OCR 成分匹配。
7. 不得修改现有 API 返回结构。
8. 必要时增加兼容视图或适配层。
9. 迁移必须向后兼容。
10. 无来源数据不得伪造来源。
11. 无法确认的数据标记为 unverified。
12. 生成未验证旧数据报告。

输出到：

docs/unverified-existing-data.md

现有 risk_level 等业务字段：

* 保持兼容
* 不删除
* 不根据官方目录自动生成新风险等级
* 没有业务规则时保持 null、unknown 或现有默认值
* 官方监管事实和产品消费建议必须分开保存

# 十三、解析要求

1. 优先使用 PDF 文本层。
2. 优先使用官方 Excel、表格附件。
3. 优先使用结构化 HTML。
4. 只有没有文本层时才使用 OCR。
5. OCR 结果不得未经校验进入正式表。
6. PDF 表格解析必须保留页码和表格位置。
7. 解析失败行必须保存。
8. 不得静默跳过解析失败内容。
9. 不得只按视觉列位置硬编码。
10. 表格跨页要处理表头继承。
11. 同一成分多行规则不得错误合并。
12. “按生产需要适量使用”必须结构化保存。
13. 最大使用量中的破折号、空值、“不适用”必须区分。
14. 食品类别代码保留前导零。
15. 中文括号、英文括号、全角、半角做匹配归一化。
16. 原始文本保留在 staging 或审计字段。
17. 不在正式库大量复制整份标准原文。
18. 每个解析器记录 parser_version。
19. 文件内容变化通过 SHA-256 识别。

# 十四、导入流程

实现或复用可重复执行的数据管道：

1. inventory
2. fetch
3. checksum
4. extract
5. normalize
6. load-staging
7. validate
8. detect-conflicts
9. promote
10. report
11. update-all

要求：

* 幂等。
* 相同来源重复执行不产生重复记录。
* 使用事务。
* 所有外部数据先进入 staging。
* 校验通过后提升正式表。
* 原始文件不可被解析脚本覆盖。
* 某来源失败不能影响其他独立来源。
* 每次执行记录 import_runs。
* 每条失败写入 import_errors。
* 保存失败阶段和失败原因。
* 支持按单个来源重新执行。
* 支持全量重建 staging。
* 正式表提升使用稳定业务键。
* 不依赖随机 ID 判断重复。
* 公告更新保留历史版本。
* 废止记录不得物理删除。
* 失效规则不得作为当前有效规则返回。
* 同一来源再次导入后记录数量稳定。
* 不在代码中写死本机密码。
* 不把数据库密码写进日志。
* 不提交包含密码的 .env 文件。

沿用当前项目语言、包管理器和脚本体系。

如果已有 CLI、Makefile、package.json scripts、Python 命令或任务系统，优先集成。

# 十五、下载失败处理

遇到以下情况：

* HTTP 403
* HTTP 404
* 验证码
* 登录限制
* JavaScript 动态下载
* SSL 错误
* 网络超时
* 附件地址失效
* 页面能打开但附件无法下载
* 文件标题与内容不一致
* 下载内容不是目标文档
* 官方站点暂不可用

不得使用第三方转载文件替代官方文件。

生成：

docs/manual-download-required.md

每个缺失文件写清：

* 文件正式名称
* 标准号或公告号
* 发布机构
* 官方公告页面
* 官方附件地址
* 建议文件名
* 下载失败原因
* 下载后应放置目录：
  docs/source-materials/
* 对应数据类别
* 任务优先级

单个来源失败时，继续其他工作。

# 十六、数据质量校验

至少实现：

## 来源校验

* 正式监管数据必须关联来源。
* 官方数据来源域名必须在允许列表。
* 来源标题不能为空。
* 发布机构不能为空。
* 标准号或公告号在适用时不能为空。
* 文件 SHA-256 不能为空。
* 正式来源必须能定位到本地文件或官方页面。
* 非官方数据必须记录 source_tier、source_status、license、confidence_score。

## 成分校验

* canonical_name 不能为空。
* normalized_name 不能为空。
* 同一规范名称不能无理由重复。
* INS 编号不能错误关联多个无关成分。
* CNS 编号不能错误关联多个无关成分。
* 别名冲突必须报告。
* 新旧名称不能重复创建主成分。
* 菌种新旧名称不能重复建成两个成分。
* 三新食品与 GB 2760 重复时必须建立关系。
* 食药物质目录重复项必须合并来源。

## 规则校验

* 食品类别代码和名称必须同时保存。
* 最大使用量必须有单位，或明确属于“按生产需要适量使用”。
* 不得把空值当作零。
* 不得把“不适用”当作允许使用。
* 有效期不得倒置。
* 已废止规则不得标记为当前有效。
* 未来生效规则不得覆盖当前有效规则。
* 营养声称阈值必须保留计量基础。
* 过敏原 direct、inferred、possible 不得混淆。

## 幂等校验

* 同一导入命令连续执行两次。
* 第二次不得生成重复数据。
* 第二次正式表记录数应保持稳定。
* 内容未变化的来源不得重复提升。
* 文件哈希变化时必须产生新来源版本或变更记录。

# 十七、实际执行

在确认是本地开发环境后执行：

1. 创建必要目录。
2. 盘点 docs/source-materials/ 文件。
3. 计算 SHA-256。
4. 建立来源 manifest。
5. 校验官方来源。
6. 下载能够自动获取的缺失官方文件到 docs/source-materials/downloaded/。
7. 查找可靠非官方补充数据源，但不得未经验证提升。
8. 创建数据库迁移。
9. 执行本地数据库迁移。
10. 解析本地官方文件。
11. 解析自动下载的官方文件。
12. 导入 staging。
13. 执行数据校验。
14. 生成冲突报告。
15. 将通过校验的数据提升正式表。
16. 验证现有添加剂功能兼容。
17. 重复执行导入，验证幂等。
18. 生成覆盖报告。
19. 执行项目测试。

禁止：

* DROP 现有业务表
* TRUNCATE 现有正式数据
* 清空生产数据
* 删除现有人工数据
* 重置整个数据库
* 修改生产环境配置
* 把未验证 OCR 结果提升为正式数据
* 为了提高数量生成虚假数据

# 十八、测试要求

补充并执行：

1. 数据库迁移测试。
2. 本地文件盘点测试。
3. SHA-256 去重测试。
4. PDF 文本解析测试。
5. 跨页表格解析测试。
6. 官方网页解析测试。
7. staging 导入测试。
8. 正式表提升测试。
9. 导入幂等性测试。
10. 来源追溯测试。
11. 别名归一化测试。
12. 别名冲突测试。
13. INS/CNS 编码匹配测试。
14. 添加剂使用规则测试。
15. 营养强化剂规则测试。
16. 新食品原料限制测试。
17. 菌种新旧名称测试。
18. 过敏原关系类型测试。
19. 营养 NRV 规则测试。
20. 营养声称规则测试。
21. 标准有效期测试。
22. 已废止规则排除测试。
23. 非官方来源分级测试。
24. 旧添加剂查询兼容测试。
25. 项目现有测试。
26. 项目现有 lint。
27. 项目现有 typecheck。
28. 项目现有 build。

不得为了测试通过删除、屏蔽或跳过原有测试。

测试失败时记录：

* 失败命令
* 失败测试
* 错误摘要
* 是否为本次修改导致
* 建议修复方式

# 十九、生成报告

## 1. 官方与补充来源清单

生成：

docs/official-source-inventory.md

包含：

* docs/source-materials/ 现有文件
* 自动下载文件
* 重复文件
* 无法确认来源文件
* 非官方补充来源
* 缺失文件
* 文件 SHA-256
* 官方标题
* 标准号或公告号
* 发布机构
* 官方页面
* 附件地址
* 来源等级
* 许可证
* 解析状态
* 导入状态

## 2. 数据覆盖报告

生成：

docs/official-food-data-coverage.md

必须根据实际数据库统计生成，包含：

* 修改前 ingredients 数量
* 修改后 ingredients 数量
* 本次新增 ingredients 数量
* 各 ingredient_type 数量
* food_additive 数量
* nutrition_fortifier 数量
* novel_food_ingredient 数量
* food_medicine_substance 数量
* food_microorganism 数量
* ordinary_ingredient 数量
* ingredient_aliases 数量
* ingredient_tags 数量
* ingredient_relations 数量
* allergen_categories 数量
* ingredient_allergen_relations 数量
* nutrients 数量
* nutrition_reference_values 数量
* nutrition_claim_rules 数量
* additive_usage_rules 数量
* nutrition_fortifier_rules 数量
* official_sources 数量
* 各来源实际导入数量
* verified_regulation 数量
* verified_official_standard 数量
* verified_official_catalog 数量
* verified_international_official 数量
* verified_secondary 数量
* observed_digital_label 数量
* manual_verified 数量
* unverified 数量
* staging 数量
* 正式提升数量
* 重复数量
* 冲突数量
* 解析失败数量
* 下载失败数量
* 未识别记录数量
* 无法关联 ingredient_id 数量
* 当前尚未覆盖的数据类别
* 普通食品原料客观覆盖限制
* 当前使用的标准版本
* 未来生效的标准版本
* 下一次更新命令

不得预填虚假统计。

## 3. 冲突报告

生成：

docs/official-data-conflicts.md

包含：

* 规范名称冲突
* 别名冲突
* INS 冲突
* CNS 冲突
* 来源版本冲突
* 新旧名称冲突
* 食品分类冲突
* 最大使用量冲突
* 有效期冲突
* 官方与非官方冲突
* 需要人工确认的数据

## 4. 人工下载清单

生成：

docs/manual-download-required.md

只有确实无法自动获取的文件才写入。

## 5. 未验证旧数据

生成：

docs/unverified-existing-data.md

包含：

* 现有无来源成分
* 现有无来源别名
* 现有无来源风险字段
* 现有无法验证人工数据
* 建议处理方式

## 6. 需要用户决策事项

生成：

docs/decision-required.md

仅在确实需要用户抉择时生成。

# 二十、统一更新命令

为项目增加统一、可重复执行的数据更新入口。

命令名称根据现有技术栈确定，但至少支持：

* inventory
* fetch
* extract
* import-staging
* validate
* promote
* report
* update-all

最终报告必须给出实际可执行命令。

不要只写伪命令，必须实现对应脚本。

# 二十一、验收标准

完成后必须满足：

1. 小程序页面没有变化。
2. 结果页面没有变化。
3. API 返回结构没有变化。
4. 条码、二维码、OCR 入口没有被实现或修改。
5. 现有添加剂查询继续工作。
6. 现有添加剂规则没有丢失。
7. 数据库支持多种食品成分类别。
8. 已实际解析 docs/source-materials/ 中的文件。
9. 已实际导入一批数据，不只是建空表。
10. 每条正式监管数据可以追溯到来源。
11. 每个来源保存 SHA-256。
12. 所有导入先经过 staging。
13. 导入可以重复执行。
14. 未验证数据没有伪装成官方数据。
15. 没有根据 AI 推测生成监管事实。
16. 没有声称普通食品原料已经全量覆盖。
17. 未来生效标准与当前标准分版本保存。
18. 非官方数据明确标注来源等级和置信度。
19. 测试结果已记录。
20. 生成真实覆盖报告。
21. 生成缺失资料清单。
22. 未修改生产数据库。

# 二十二、最终汇报格式

完成后用中文汇报：

1. 审查到的原有项目和数据库情况。
2. 使用了哪些 docs/source-materials/ 中的文件。
3. 自动下载了哪些官方文件。
4. 使用了哪些非官方补充来源。
5. 哪些文件需要人工下载。
6. 新增或修改了哪些数据库表。
7. 创建了哪些迁移。
8. 修改或新增了哪些代码文件。
9. 各类数据实际导入数量。
10. staging 数据数量。
11. 正式提升数据数量。
12. 未验证数据数量。
13. 冲突和失败数量。
14. 当前数据库仍然存在的客观缺口。
15. 后续更新数据的实际命令。
16. 执行过的测试及结果。
17. 是否存在需要人工确认的问题。

不要只输出设计方案。

直接检查项目、编写代码、执行迁移、解析文件、导入本地开发数据库、运行校验和测试，并生成报告。

如果某一步由于下载失败或来源不确定无法完成，继续完成其他部分，并把缺失内容写入对应报告。
