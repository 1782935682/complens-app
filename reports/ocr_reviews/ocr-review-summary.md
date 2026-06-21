# OCR AI Review Summary

- chatgpt-subagent: total 9, skipped 0, passed 1, averageScore 92, highRisk 0, mediumRisk 9
- deepseek: total 8, skipped 0, passed 8, averageScore 90.6, highRisk 0, mediumRisk 0

## Sample Issues

- vita-ingredients / chatgpt-subagent: score 0, risk medium, skipped no, issues pending_subagent_review: OPENAI_API_KEY 未配置，按用户要求等待当前 Codex 会话子 agent 执行 ChatGPT Review。
- vita-ingredients / deepseek: score 95, risk low, skipped no, issues
- soy-ingredients / chatgpt-subagent: score 0, risk medium, skipped no, issues pending_subagent_review: OPENAI_API_KEY 未配置，按用户要求等待当前 Codex 会话子 agent 执行 ChatGPT Review。
- soy-ingredients / deepseek: score 90, risk low, skipped no, issues severity:low, description:配料表提取基本正确，但OCR识别有少量错位和缺失（如'谷氨酸'后缺少'钠'，'草菇'后缺少句号），且'护料'被归入otherText，实际应为'配料'的OCR错误。 | severity:low, description:报告summary中'识别到6项配料'与actual中列出的配料数量（7项）略有出入，但整体合理。
- curry-ingredients / chatgpt-subagent: score 0, risk medium, skipped no, issues pending_subagent_review: OPENAI_API_KEY 未配置，按用户要求等待当前 Codex 会话子 agent 执行 ChatGPT Review。
- curry-ingredients / deepseek: score 90, risk low, skipped no, issues severity:low, description:actual.ingredientsText 中 '维生素E' 后缺少右括号，且 '5-肌苷酸二' 后缺失 '钠' 字，但整体配料提取正确，不影响理解。 | severity:low, description:actual.otherText 中包含了 '钠、磷脂、柠檬酸、单硬脂酸甘油酯)、椰子粉、脱脂乳'，这些实际是配料的一部分，但被错误归类为 otherText。不过由于 OCR 原文中配料表连续，且 otherText 内容与配料相关，未造成严重分区错误。
- 8000500023976-ingredients / chatgpt-subagent: score 0, risk medium, skipped no, issues pending_subagent_review: OPENAI_API_KEY 未配置，按用户要求等待当前 Codex 会话子 agent 执行 ChatGPT Review。
- 8000500023976-ingredients / deepseek: score 90, risk low, skipped no, issues type:minor, description:actual.ingredientsText 中部分成分顺序与 OCR 原文不一致，但内容完整，未遗漏关键配料。 | type:minor, description:otherText 中包含了配料表末尾的过敏原声明和部分配料，但未影响配料表主体识别，边界合理。
- 8713788124272-ingredients / chatgpt-subagent: score 0, risk medium, skipped no, issues pending_subagent_review: OPENAI_API_KEY 未配置，按用户要求等待当前 Codex 会话子 agent 执行 ChatGPT Review。
- 8713788124272-ingredients / deepseek: score 90, risk low, skipped no, issues type:minor, description:OCR识别有少量字符错误（如rommk应为room(melk)），但配料表整体提取正确，未混入营养表或广告语。 | type:minor, description:otherText中'Kachevatts'可能是OCR误识别或包装上其他文字，但未影响配料表。
- 8719189108545-ingredients / chatgpt-subagent: score 0, risk medium, skipped no, issues pending_subagent_review: OPENAI_API_KEY 未配置，按用户要求等待当前 Codex 会话子 agent 执行 ChatGPT Review。
- 8719189108545-ingredients / deepseek: score 90, risk low, skipped no, issues type:minor, description:配料表提取基本正确，但actual.ingredientsText中混入了少量非配料内容（如'de traitement dela farine:acide ascorbique'实际是配料，但'Chocolat13%'等重复出现），整体边界合理。 | type:minor, description:productName字段被误赋值为'melkennotenbevatten.'，该内容实际为过敏原声明，应归入otherText。 | type:info, description:codeInfo字段提取了'6136871368713'，但OCR原文中未出现该条码，可能来自其他来源，建议标注来源。
- 8719189108576-ingredients / chatgpt-subagent: score 0, risk medium, skipped no, issues pending_subagent_review: OPENAI_API_KEY 未配置，按用户要求等待当前 Codex 会话子 agent 执行 ChatGPT Review。
- 8719189108576-ingredients / deepseek: score 90, risk low, skipped no, issues type:minor, description:配料表提取顺序与原文略有差异，但内容基本正确。 | type:minor, description:otherText 中 'trocesdelait' 应为 'traces de lait'，属于 OCR 识别误差，但未影响配料表主体。
- 4902115318475-ingredients / chatgpt-subagent: score 0, risk medium, skipped no, issues pending_subagent_review: OPENAI_API_KEY 未配置，按用户要求等待当前 Codex 会话子 agent 执行 ChatGPT Review。
- 4902115318475-ingredients / deepseek: score 90, risk low, skipped no, issues severity:low, description:配料表提取顺序与原文略有差异，但内容基本一致，未遗漏关键成分。 | severity:low, description:otherText 中 '一七一' 可能为生产信息或无关文本，但未误入配料表，可接受。
- overall / chatgpt-subagent: score 92, risk medium, skipped no, issues 500样本门禁核心指标已达标：totalSamples=500，passedSamples=494，overallPassRate=98.8%，高于95%门槛。 | coreIngredientSamples=150、coreNutritionSamples=150，均满足各不少于150的要求；invalidSampleCount=0、weakOcrSampleCount=0。 | ingredientsAccuracy、nutritionAccuracy、coreIngredientsAccuracy、coreNutritionAccuracy均为99.33%，满足>=95%要求。
