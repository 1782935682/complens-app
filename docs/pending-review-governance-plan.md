# pending_review 数据治理计划

生成时间：2026-06-18T13:35:13.550Z

当前 pending_review ingredient_master 数量：2741

## 分组统计

| source_tier | ingredient_type | ingredient_count | source_relation_count | evidence_complete_count | alias_count |
|---|---|---:|---:|---:|---:|
| S0 | food_additive | 2012 | 2 | 2012 | 6156 |
| S0 | food_medicine_substance | 13 | 2 | 13 | 31 |
| S0 | food_microorganism | 121 | 3 | 121 | 247 |
| S0 | novel_food_ingredient | 95 | 1 | 95 | 95 |
| S0 | nutrition_fortifier | 21 | 1 | 21 | 21 |
| S2 | ordinary_ingredient | 479 | 1 | 479 | 538 |

## 可自动 promoted 候选

说明：这里只是治理建议，不在本轮自动 promoted。建议条件为 S0 来源、source relation 和 evidence 完整、非普通配料。

| ingredient_id | name | type | source_tier | source_status | evidence |
|---|---|---|---|---|---|
| ik-gb2760-2024-b3-synthetic-flavor-1500 | (+/-)-1-环己基乙醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1500；编码 S1502；香料中文名称 (+/-)-1-环己基乙醇；香料英文名称 (+/-)-1-Cyclohexylethanol；FEMA 编号 4794。 |
| ik-gb2760-2024-b3-synthetic-flavor-0960 | (+/-)-1-苯乙基硫醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 960；编码 S0961；香料中文名称 (+/-)-1-苯乙基硫醇；香料英文名称 (+/-)-1-Phenylethylmercaptan；FEMA 编号 4061。 |
| ik-gb2760-2024-b3-synthetic-flavor-1057 | (+/-)-2-苯基-4-甲基-2-己烯醛 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1057；编码 S1058；香料中文名称 (+/-)-2-苯基-4-甲基-2-己烯醛；香料英文名称 (+/-)-2-Phenyl-4-methyl-2-hexenal；FEMA 编号 4194。 |
| ik-gb2760-2024-b3-synthetic-flavor-1433 | (+/-)-3-甲硫基丁酸异丁酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1433；编码 S1434；香料中文名称 (+/-)-3-甲硫基丁酸异丁酯；香料英文名称 (+/-)-Isobutyl 3-methylthiobutyrate；FEMA 编号 4150。 |
| ik-gb2760-2024-b3-synthetic-flavor-1437 | (+/-)-4-巯基-4-甲基-2-戊醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1437；编码 S1438；香料中文名称 (+/-)-4-巯基-4-甲基-2-戊醇；香料英文名称 (+/-)-4-Mercapto-4-methyl-2-pentanol；FEMA 编号 4158。 |
| ik-gb2760-2024-b3-synthetic-flavor-1388 | (+/-)-反式和顺式-4,8-二甲基-3,7-壬二烯-2-醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1388；编码 S1389；香料中文名称 (+/-)-反式和顺式-4,8-二甲基-3,7-壬二烯-2-醇；香料英文名称 (+/-)-trans-and cis-4,8-Dimethyl-3,7-nona-dien-2-ol；FEMA 编号 4102。 |
| ik-gb2760-2024-b3-synthetic-flavor-1389 | (+/-)-反式和顺式-4,8-二甲基-3,7-壬二烯-2-醇乙酸酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1389；编码 S1390；香料中文名称 (+/-)-反式和顺式-4,8-二甲基-3,7-壬二烯-2-醇乙酸酯；香料英文名称 (+/-)-trans-and cis-4,8-Dimethyl-3,7-nona-dien-2-yl acetate；FEMA 编号 4103。 |
| ik-gb2760-2024-b3-synthetic-flavor-0857 | (+/-)二氢薄荷内酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 857；编码 S0858；香料中文名称 (+/-)二氢薄荷内酯；香料英文名称 (+/-) Dihydromintlactone；FEMA 编号 4032。 |
| ik-gb2760-2024-b3-synthetic-flavor-1444 | (+/-)反式和顺式-2-己烯醛丙二醇缩醛 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1444；编码 S1445；香料中文名称 (+/-)反式和顺式-2-己烯醛丙二醇缩醛；香料英文名称 (+/-) trans-andcis-2-Hexenalpropylene glycolacetal；FEMA 编号 4272。 |
| ik-gb2760-2024-b3-synthetic-flavor-1502 | (1R,2S,5R)-N-(4-甲氧苯基)-5-甲基-2-(1-甲基乙基)环己基甲酰胺 | food_additive | S0 | verified_official_catalog | 2019 年第 6 号 （1R,2S,5R）-N-（4-甲氧苯基）-5-甲基-2-（1-甲基乙基）环己基甲酰胺 |
| ik-gb2760-2024-b3-synthetic-flavor-1502 | (1R,2S,5R)-N-(4-甲氧苯基)-5-甲基-2-(1-甲基乙基)环己基甲酰胺 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1502；编码 S1504；香料中文名称 (1R,2S,5R)-N-(4-甲氧苯基)-5-甲基-2-(1-甲基乙基)环己基甲酰胺；香料英文名称 (1R,2S,5R)-N-(4-Methoxyphenyl)-5-methyl-2-(1-methylethyl)cyclohexanecarboxamide；FEMA 编号 4681。 |
| ik-gb2760-2024-b3-synthetic-flavor-1475 | (2S,5R)-N-[4-(2-氨基-2-氧代乙基)苯基]-5-甲基-2-(丙基-2-)环己烷甲酰胺 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1475；编码 S1476；香料中文名称 (2S,5R)-N-[4-(2-氨基-2-氧代乙基)苯基]-5-甲基-2-(丙基-2-)环己烷甲酰胺；香料英文名称 (2S,5R)-N-[4-(2-Amino-2-oxoethyl)phenyl]-5-methyl-2-(propan-2-yl) cyclohexanecar-boxamide；FEMA 编号 4684。 |
| ik-gb2760-2024-b3-synthetic-flavor-0827 | (5H)-5-甲基-6,7-二氢环戊基并(b)吡嗪 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 827；编码 S0828；香料中文名称 (5H)-5-甲基-6,7-二氢环戊基并(b)吡嗪；香料英文名称 (5H)-5-Methyl-6,7-dihydro-cyclopenta (b) pyrazine；FEMA 编号 3306。 |
| ik-gb2760-2024-b3-synthetic-flavor-0954 | (6R)-3-甲基-6-(1-甲基乙基)-2-环己烯-1-酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 954；编码 S0955；香料中文名称 (6R)-3-甲基-6-(1-甲基乙基)-2-环己烯-1-酮；香料英文名称 2-Cyclohexen-1-one,3-methyl-6-(1-methylethyl)-, (6R)-；FEMA 编号 4200。 |
| ik-gb2760-2024-b3-synthetic-flavor-1103 | (E)-2-癸烯酸 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1103；编码 S1104；香料中文名称 (E)-2-癸烯酸；香料英文名称 (E)-2-Decenoic acid；FEMA 编号 3913。 |
| ik-gb2760-2024-b3-synthetic-flavor-1452 | (R,S)-3-羟基丁酸l-薄荷酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1452；编码 S1453；香料中文名称 (R,S)-3-羟基丁酸l-薄荷酯；香料英文名称 l-Menthyl (R,S)-3-hydroxybutyrate；FEMA 编号 4308。 |
| ik-gb2760-2024-b3-synthetic-flavor-0939 | (S1)-甲氧基-3-庚硫醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 939；编码 S0940；香料中文名称 (S1)-甲氧基-3-庚硫醇；香料英文名称 (S1)-Methoxy-3-heptanethiol；FEMA 编号 4162。 |
| ik-gb2760-2024-b3-synthetic-flavor-1054 | (±)3-巯基丁酸乙酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1054；编码 S1055；香料中文名称 (±)3-巯基丁酸乙酯；香料英文名称 (±)-Ethyl 3-mercaptobutyrate；FEMA 编号 3977。 |
| ik-gb2760-2024-b2-natural-flavor-0382 | (—)-高圣草酚钠盐 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.2：序号 382；编码 N398；香料中文名称 (—)-高圣草酚钠盐；香料英文名称 (—)-Homoeriodyctiolsodiumsalt；FEMA 编号 4228。 |
| ik-gb2760-2024-b3-synthetic-flavor-1138 | (反式,反式)-2,4-壬二烯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1138；编码 S1139；香料中文名称 (反式,反式)-2,4-壬二烯；香料英文名称 (E,E)-2,4-nonadiene；FEMA 编号 4292。 |
| ik-gb2760-2024-b3-synthetic-flavor-1419 | (反式,顺式)-2,6-壬二烯-1-醇乙酸酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1419；编码 S1420；香料中文名称 (反式,顺式)-2,6-壬二烯-1-醇乙酸酯；香料英文名称 (E,Z)-2,6-Nonadien-1-olacetate；FEMA 编号 3952。 |
| ik-gb2760-2024-b3-synthetic-flavor-1390 | (反式和顺式)-1-甲氧基-1-癸烯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1390；编码 S1391；香料中文名称 (反式和顺式)-1-甲氧基-1-癸烯；香料英文名称 trans-andcis-1-Methoxy-1-decene；FEMA 编号 4161。 |
| ik-gb2760-2024-b3-synthetic-flavor-0182 | 1,1-二甲氧基乙烷 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 182；编码 S0182；香料中文名称 1,1-二甲氧基乙烷；香料英文名称 1,1-Dimethoxyethane；FEMA 编号 3426。 |
| ik-gb2760-2024-b3-synthetic-flavor-1310 | 1,2-丁二硫醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1310；编码 S1311；香料中文名称 1,2-丁二硫醇；香料英文名称 1,2-Butanedithiol；FEMA 编号 3528。 |
| ik-gb2760-2024-b3-synthetic-flavor-0886 | 1,2-乙二硫醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 886；编码 S0887；香料中文名称 1,2-乙二硫醇；香料英文名称 1,2-Ethanedithiol；FEMA 编号 3484。 |
| ik-gb2760-2024-b3-synthetic-flavor-1292 | 1,2-二[(1'-乙氧基)-乙氧基]丙烷 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1292；编码 S1293；香料中文名称 1,2-二[(1'-乙氧基)-乙氧基]丙烷；香料英文名称 1,2-Di [(1'-ethoxy) ethoxy]propane；FEMA 编号 3534。 |
| ik-gb2760-2024-b3-synthetic-flavor-0676 | 1,2-二甲氧基苯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 676；编码 S0677；香料中文名称 1,2-二甲氧基苯；香料英文名称 1,2-Dimethoxybenzene；FEMA 编号 3799。 |
| ik-gb2760-2024-b3-synthetic-flavor-1356 | 1,2-环己二酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1356；编码 S1357；香料中文名称 1,2-环己二酮；香料英文名称 1,2-Cyclohexanedione；FEMA 编号 3458。 |
| ik-gb2760-2024-b3-synthetic-flavor-0665 | 1,3,5-十一碳三烯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 665；编码 S0666；香料中文名称 1,3,5-十一碳三烯；香料英文名称 1,3,5-Undecatriene；FEMA 编号 3795。 |
| ik-gb2760-2024-b3-synthetic-flavor-0801 | 1,3-丙二硫醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 801；编码 S0802；香料中文名称 1,3-丙二硫醇；香料英文名称 1,3-Propanedithiol；FEMA 编号 3588。 |
| ik-gb2760-2024-b3-synthetic-flavor-1351 | 1,3-二苯基-2-丙酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1351；编码 S1352；香料中文名称 1,3-二苯基-2-丙酮；香料英文名称 1,3-Diphenyl-2-propanone；FEMA 编号 2397。 |
| ik-gb2760-2024-b3-synthetic-flavor-1194 | 1,3-壬二醇乙酸酯(混合酯) | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1194；编码 S1195；香料中文名称 1,3-壬二醇乙酸酯(混合酯)；香料英文名称 1,3-Nonanediolacetate (mixedesters)；FEMA 编号 2783。 |
| ik-gb2760-2024-b3-synthetic-flavor-0838 | 1,4-二噻烷 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 838；编码 S0839；香料中文名称 1,4-二噻烷；香料英文名称 1,4-Dithiane；FEMA 编号 3831。 |
| ik-gb2760-2024-b3-synthetic-flavor-0662 | 1,4-二甲基-4-乙酰基-1-环己烯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 662；编码 S0663；香料中文名称 1,4-二甲基-4-乙酰基-1-环己烯；香料英文名称 1,4-Dimethyl-4-acetyl-1-cyclohexene；FEMA 编号 3449。 |
| ik-gb2760-2024-b3-synthetic-flavor-0660 | 1,4-桉叶素 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 660；编码 S0661；香料中文名称 1,4-桉叶素；香料英文名称 1,4-Cineole；FEMA 编号 3658。 |
| ik-gb2760-2024-b3-synthetic-flavor-0280 | 1,5,5,9-四甲基-13-氧杂三环[8.3.0.0(4,9)]十三烷 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 280；编码 S0280；香料中文名称 1,5,5,9-四甲基-13-氧杂三环[8.3.0.0(4,9)]十三烷；香料英文名称 1,5,5,9-Tetramethyl-13-oxatricyclo[8.3.0.0(4,9)]tridecane；FEMA 编号 3471。 |
| ik-gb2760-2024-b3-synthetic-flavor-0690 | 1,6-己二硫醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 690；编码 S0691；香料中文名称 1,6-己二硫醇；香料英文名称 1,6-Hexanedithiol；FEMA 编号 3495。 |
| ik-gb2760-2024-b3-synthetic-flavor-0659 | 1,8-桉叶素 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 659；编码 S0660；香料中文名称 1,8-桉叶素；香料英文名称 1,8-Cineole；FEMA 编号 2465。 |
| ik-gb2760-2024-b3-synthetic-flavor-1335 | 1,8-辛二硫醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1335；编码 S1336；香料中文名称 1,8-辛二硫醇；香料英文名称 1,8-Octanedithiol；FEMA 编号 3514。 |
| ik-gb2760-2024-b3-synthetic-flavor-0934 | 1-(3-羟基-5-甲基-2-噻吩)乙酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 934；编码 S0935；香料中文名称 1-(3-羟基-5-甲基-2-噻吩)乙酮；香料英文名称 1-(3-Hydroxy-5-methyl-2-thienyl)ethanone；FEMA 编号 4142。 |
| ik-gb2760-2024-b3-synthetic-flavor-1429 | 1-(4-甲氧苯基)-4-甲基-1-戊烯-3-酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1429；编码 S1430；香料中文名称 1-(4-甲氧苯基)-4-甲基-1-戊烯-3-酮；香料英文名称 1-(4-Methoxyphenyl)-4-methyl-1-penten-3-one；FEMA 编号 3760。 |
| ik-gb2760-2024-b3-synthetic-flavor-1263 | 1-(对-甲氧基苯基)-1-戊烯-3-酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1263；编码 S1264；香料中文名称 1-(对-甲氧基苯基)-1-戊烯-3-酮；香料英文名称 1-(p-Methoxyphenyl)-1-penten-3-one；FEMA 编号 2673。 |
| ik-gb2760-2024-b3-synthetic-flavor-0958 | 1-(对-甲氧基苯基)-2-丙酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 958；编码 S0959；香料中文名称 1-(对-甲氧基苯基)-2-丙酮；香料英文名称 1-(p-Methoxyphenyl)-2-propanone；FEMA 编号 2674。 |
| ik-gb2760-2024-b3-synthetic-flavor-1101 | 1-丁烯-1-基甲基硫醚 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1101；编码 S1102；香料中文名称 1-丁烯-1-基甲基硫醚；香料英文名称 1-Buten-1-ylmethylsulfide；FEMA 编号 3820。 |
| ik-gb2760-2024-c2-processing-aid-function-scope-001 | 1-丁醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 C.2：序号 1；助剂中文名称 1-丁醇；助剂英文名称 1-butanol；功能 萃取溶剂；使用范围 发酵工艺。 |
| ik-gb2760-2024-b3-synthetic-flavor-1141 | 1-乙基-2-甲酰基吡咯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1141；编码 S1142；香料中文名称 1-乙基-2-甲酰基吡咯(又名茶吡咯)；香料英文名称 1-ethyl-2-formylpyrrole (Teapyrrole)；FEMA 编号 4317。 |
| ik-gb2760-2024-b3-synthetic-flavor-0970 | 1-乙氧基-3-甲基-2-丁烯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 970；编码 S0971；香料中文名称 1-乙氧基-3-甲基-2-丁烯；香料英文名称 1-Ethoxy-3-methyl-2-butene；FEMA 编号 3777。 |
| ik-gb2760-2024-b3-synthetic-flavor-0025 | 1-十六醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 25；编码 S0025；香料中文名称 1-十六醇；香料英文名称 1-Hexadecanol；FEMA 编号 2554。 |
| ik-gb2760-2024-b3-synthetic-flavor-1119 | 1-吡咯啉 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1119；编码 S1120；香料中文名称 1-吡咯啉；香料英文名称 1-Pyrroline；FEMA 编号 3898。 |
| ik-gb2760-2024-b3-synthetic-flavor-0064 | 1-对-烯-4-醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 64；编码 S0064；香料中文名称 1-对-烯-4-醇(又名1-对-薄荷烯-4-醇)；香料英文名称 1-p-Menthen-4-ol；FEMA 编号 2248。 |
| ik-gb2760-2024-b3-synthetic-flavor-0744 | 1-对-烯-8-硫醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 744；编码 S0745；香料中文名称 1-对-烯-8-硫醇(又名1-对-薄荷烯-8-硫醇)；香料英文名称 1-p-Menthene-8-thiol；FEMA 编号 3700。 |
| ik-gb2760-2024-b3-synthetic-flavor-0991 | 1-巯基-2-丙酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 991；编码 S0992；香料中文名称 1-巯基-2-丙酮；香料英文名称 1-Mercapto-2-propanone；FEMA 编号 3856。 |
| ik-gb2760-2024-b3-synthetic-flavor-0051 | 1-己烯-3-醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 51；编码 S0051；香料中文名称 1-己烯-3-醇；香料英文名称 1-Hexen-3-ol；FEMA 编号 3608。 |
| ik-gb2760-2024-b3-synthetic-flavor-0926 | 1-庚烯-3-醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 926；编码 S0927；香料中文名称 1-庚烯-3-醇；香料英文名称 1-Hepten-3-ol；FEMA 编号 4129。 |
| ik-gb2760-2024-b3-synthetic-flavor-0209 | 1-戊烯-3-酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 209；编码 S0209；香料中文名称 1-戊烯-3-酮；香料英文名称 1-Penten-3-one；FEMA 编号 3382。 |
| ik-gb2760-2024-b3-synthetic-flavor-0009 | 1-戊烯-3-醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 9；编码 S0009；香料中文名称 1-戊烯-3-醇；香料英文名称 1-Penten-3-ol；FEMA 编号 3584。 |
| ik-gb2760-2024-b3-synthetic-flavor-1436 | 1-戊硫醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1436；编码 S1437；香料中文名称 1-戊硫醇；香料英文名称 1-Pentanethiol；FEMA 编号 4333。 |
| ik-gb2760-2024-b3-synthetic-flavor-1111 | 1-氨基-2-丙醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1111；编码 S1112；香料中文名称 1-氨基-2-丙醇；香料英文名称 1-Amino-2-propanol；FEMA 编号 3965。 |
| ik-gb2760-2024-b3-synthetic-flavor-0252 | 1-甲基-2,3-环己二酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 252；编码 S0252；香料中文名称 1-甲基-2,3-环己二酮；香料英文名称 1-Methyl-2,3-cyclohexadione；FEMA 编号 3305。 |
| ik-gb2760-2024-b3-synthetic-flavor-0768 | 1-甲基-2-乙酰基吡咯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 768；编码 S0769；香料中文名称 1-甲基-2-乙酰基吡咯；香料英文名称 1-Methyl-2-acetylpyrrole；FEMA 编号 3184。 |
| ik-gb2760-2024-b3-synthetic-flavor-0671 | 1-甲基-3-甲氧基-4-异丙基苯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 671；编码 S0672；香料中文名称 1-甲基-3-甲氧基-4-异丙基苯；香料英文名称 1-Methyl-3-methoxy-4-isopropylbenzene；FEMA 编号 3436。 |
| ik-gb2760-2024-b3-synthetic-flavor-0675 | 1-甲基萘 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 675；编码 S0676；香料中文名称 1-甲基萘；香料英文名称 1-Methylnaphthalene；FEMA 编号 3193。 |
| ik-gb2760-2024-b3-synthetic-flavor-0248 | 1-苯基-1,2-丙二酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 248；编码 S0248；香料中文名称 1-苯基-1,2-丙二酮；香料英文名称 1-Phenyl-1,2-propanedione；FEMA 编号 3226。 |
| ik-gb2760-2024-b3-synthetic-flavor-1361 | 1-苯基-3-甲基-戊醇-3 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1361；编码 S1362；香料中文名称 1-苯基-3-甲基-戊醇-3；香料英文名称 1-phenyl-3-methyl-3-pentanol；FEMA 编号 2883。 |
| ik-gb2760-2024-b3-synthetic-flavor-0994 | 1-苯基丙醇-1 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 994；编码 S0995；香料中文名称 1-苯基丙醇-1；香料英文名称 1-Phenylpropan-1-ol；FEMA 编号 2884。 |
| ik-gb2760-2024-b3-synthetic-flavor-1139 | 1-辛烯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1139；编码 S1140；香料中文名称 1-辛烯；香料英文名称 1-octene；FEMA 编号 4293。 |
| ik-gb2760-2024-b3-synthetic-flavor-0219 | 1-辛烯-3-酮 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 219；编码 S0219；香料中文名称 1-辛烯-3-酮；香料英文名称 1-Octen-3-one；FEMA 编号 3515。 |
| ik-gb2760-2024-b3-synthetic-flavor-0016 | 1-辛烯-3-醇 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 16；编码 S0016；香料中文名称 1-辛烯-3-醇；香料英文名称 1-Octen-3-ol；FEMA 编号 2805。 |
| ik-gb2760-2024-b3-synthetic-flavor-0435 | 1-辛烯-3-醇丁酸酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 435；编码 S0435；香料中文名称 1-辛烯-3-醇丁酸酯；香料英文名称 1-Octen-3-yl butyrate；FEMA 编号 3612。 |
| ik-gb2760-2024-b3-synthetic-flavor-0378 | 1-辛烯-3-醇乙酸酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 378；编码 S0378；香料中文名称 1-辛烯-3-醇乙酸酯；香料英文名称 1-Octen-3-yl acetate；FEMA 编号 3582。 |
| ik-gb2760-2024-b3-synthetic-flavor-1352 | 10-十一烯酸丁酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1352；编码 S1353；香料中文名称 10-十一烯酸丁酯；香料英文名称 Butyl 10-undecylenate；FEMA 编号 2216。 |
| ik-gb2760-2024-b3-synthetic-flavor-1203 | 10-十一烯酸乙酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1203；编码 S1204；香料中文名称 10-十一烯酸乙酯；香料英文名称 Ethyl 10-undecenoate；FEMA 编号 2461。 |
| ik-gb2760-2024-b3-synthetic-flavor-1405 | 10-十一烯酸烯丙酯 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1405；编码 S1406；香料中文名称 10-十一烯酸烯丙酯；香料英文名称 Allyl 10-undecenoate；FEMA 编号 2044。 |
| ik-gb2760-2024-b3-synthetic-flavor-1168 | 10-十一烯醛 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1168；编码 S1169；香料中文名称 10-十一烯醛；香料英文名称 10-Undecenal；FEMA 编号 3095。 |
| ik-gb2760-2024-b3-synthetic-flavor-0336 | 10-十一碳烯酸 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 336；编码 S0336；香料中文名称 10-十一碳烯酸；香料英文名称 10-Undecenoic acid；FEMA 编号 3247。 |
| ik-gb2760-2024-b3-synthetic-flavor-0202 | 12-甲基十三醛 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 202；编码 S0202；香料中文名称 12-甲基十三醛；香料英文名称 12-Methyltridecanal；FEMA 编号 4005。 |
| ik-gb2760-2024-b3-synthetic-flavor-1478 | 2(4)-乙基-4(2),6-二甲基二氢-1,3,5-二噻嗪 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1478；编码 S1479；香料中文名称 2(4)-乙基-4(2),6-二甲基二氢-1,3,5-二噻嗪；香料英文名称 2(4)-Ethyl-4(2),6-dimethyldihydro-1,3,5-dithiazinane；FEMA 编号 4667。 |
| ik-gb2760-2024-b3-synthetic-flavor-0950 | 2(4)-异丙基-4(2),6-二甲基二氢(4H)-1,3,5-二噻嗪 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 950；编码 S0951；香料中文名称 2(4)-异丙基-4(2),6-二甲基二氢(4H)-1,3,5-二噻嗪；香料英文名称 2(4)-Isopropyl-4(2),6-dimethyldihydro (4H)-1,3,5-dithiazine；FEMA 编号 3782。 |
| ik-gb2760-2024-b3-synthetic-flavor-0696 | 2,2'-(硫代二亚甲基)-二呋喃二糠基硫醚 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 696；编码 S0697；香料中文名称 2,2'-(硫代二亚甲基)-二呋喃二糠基硫醚；香料英文名称 2-Furfurylmonosufide Bis(2-furfuryl) sulfide Difurfurylsulphide；FEMA 编号 3238。 |
| ik-gb2760-2024-b3-synthetic-flavor-1047 | 2,2,6-三甲基-6-乙烯基四氢吡喃 | food_additive | S0 | verified_official_standard | GB 2760-2024 表 B.3：序号 1047；编码 S1048；香料中文名称 2,2,6-三甲基-6-乙烯基四氢吡喃；香料英文名称 2,2,6-Trimethyl-6-vinyltetrahydropyran；FEMA 编号 3735。 |

## 需人工审核

说明：S2 普通配料、非官方补充数据、以及证据足够但还未人工复核的数据保持此类。

| ingredient_id | name | type | source_tier | evidence |
|---|---|---|---|---|
| ordinary-s2-7629898d3bebd204395c | 丁香 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-267ff9b3447ddc9fc903 | 三文鱼 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=水产及藻类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-a879a385d2c84ae54f6c | 乳清 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-ddcc43bdf06fb91c9fa6 | 乳清粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-45826a214d304cc77c2b | 乳清蛋白粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-32eec156ce340de28bbc | 乳矿物盐 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-d380598fc8216566c74e | 乳粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-374ab8da2ea03513d44b | 乳糖 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-2f2198c18495e09963e1 | 乳脂 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=油脂；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-7d895b642ea8bf549ce0 | 乳脂肪 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-5bd66032ad9f9c645bc4 | 乳蛋白 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-7cb79f1baf710d21bc53 | 五香粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-2a5d021a116e8792193e | 亚麻籽 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=坚果/籽类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-d4ead4bfe4a9390a160b | 亚麻籽油 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=油脂；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-419ca4645bbaf0b20df0 | 亚麻籽粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=坚果/籽类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-a148959951dd82a2d70f | 人造奶油 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=油脂；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-aec6311a5ab5a243012f | 代可可脂 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=油脂；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-d2c62260a520543d8400 | 低筋小麦粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=谷物/杂粮/粉类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-8b340240fe701ff90aff | 低聚半乳糖 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=糖类/甜味原料；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-f8a3fe5270f88f5ae65e | 低聚异麦芽糖 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=糖类/甜味原料；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-ca4825ac4c694a58509c | 低聚果糖 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=糖类/甜味原料；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-09a6b2d02f2fe663cdc4 | 全脂乳粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-a75dbfe652d966dbcb3e | 全脂牛奶 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-b1c9360127726d495e6c | 全蛋液 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=蛋类及蛋制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-5a37aa499b16996c23e3 | 全蛋粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=蛋类及蛋制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-504f1f8fd9a055128830 | 全麦粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=谷物/杂粮/粉类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-6140dd7323d72c6eed02 | 八角 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-10511ebbb7425d1bd1ec | 再制干酪 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-a729cf6e25fe0ea1ccc1 | 冰糖 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=糖类/甜味原料；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-3a411a628e4d3d5d6e36 | 凤尾鱼 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=水产及藻类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-e74be0a89837c87b4a30 | 十三香 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-b305181976e3d4133a7c | 午餐肉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=肉禽及制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-474df783acf2885f240d | 南瓜 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=果蔬/汁浆；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-2677df114ccc84e0979c | 南瓜籽 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=坚果/籽类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-cf23b351472a99fb7569 | 发酵乳 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-5444bedec4df32a21b0e | 可可粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=淀粉/粉体/膳食纤维；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-3c211b16aee880f11935 | 可可脂 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=油脂；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-aea7a9fffd90743af0c3 | 味噌 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=调味料/发酵调味；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-c572f2f9cdcaeba32d61 | 味精 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=调味料/发酵调味；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-bf2f7b337db0e2e50023 | 咖啡粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=淀粉/粉体/膳食纤维；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-55cf8169497e0b4a9c97 | 咖喱粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-a4d59eb78da40b24d07f | 咖喱酱 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=调味料/发酵调味；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-3a6ccf6b2a8c21a1a551 | 咸蛋黄 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=蛋类及蛋制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-ee1ab82a681367defcca | 土豆 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=果蔬/汁浆；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-84275cee1af873e5ebc9 | 坚果 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=坚果/籽类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-1dfb7e87b8cfa79e5dc5 | 培根 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=肉禽及制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-14028c34c5aa2c5ec1b1 | 墨鱼 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=水产及藻类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-04a8427c2e4de9ab0297 | 复原乳 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-1589f4eda5f263f27458 | 夏威夷果 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=坚果/籽类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-8d1d7290b38352800a91 | 夏威夷果仁 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=坚果/籽类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-21c773868213c9745aa2 | 大米 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=谷物/杂粮/粉类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-aa3fc8499d4407d36b26 | 大米淀粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=淀粉/粉体/膳食纤维；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-a79bc67ce6b9fd1e7a18 | 大米蛋白 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=谷物/杂粮/粉类；非官方来源，需人工复核后才能提升。 |
| ik-common-garlic | 大蒜 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-b6cfb6ef1da42c650c11 | 大豆 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=豆类及豆制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-810d9187268d106b8028 | 大豆分离蛋白 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=豆类及豆制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-c78f59ee6f624a9d3e28 | 大豆卵磷脂 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=豆类及豆制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-996f971470017887c86a | 大豆油 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=油脂；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-13b134bb71262a3ef7f3 | 大豆粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=豆类及豆制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-f22ba87d2cac5fcb97b8 | 大豆组织蛋白 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=豆类及豆制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-265d775083aaf79a9c8c | 大豆膳食纤维 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=淀粉/粉体/膳食纤维；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-abd86dac380bbcc99f80 | 大豆蛋白 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=豆类及豆制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-b355dcc19ebe06324118 | 大豆蛋白粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=淀粉/粉体/膳食纤维；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-347a632a688b6a1edcbc | 大麦 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=谷物/杂粮/粉类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-eb81bceccaf3950d185e | 大麦粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=谷物/杂粮/粉类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-f34a7756d833c81af189 | 奇亚籽 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=坚果/籽类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-861e08f55328d41cad89 | 奶油 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-ceba240cabe9dd3b52a0 | 奶粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-610e2e730ce5c49979a1 | 奶酪 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-b38927dcc3c3e37f16c7 | 奶酪粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=乳及乳制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-d5c8413f7880dc3b69e0 | 姜 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-87f75a64b5416e293659 | 姜粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-d3378e11914708517e58 | 孜然 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-8479bf8ff1bd6b800614 | 孜然粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-fb253eaea6ab4df4003c | 小扁豆 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=豆类及豆制品；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-d87d365d6e7710cc90b3 | 小米 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=谷物/杂粮/粉类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-3aa5bcc009da87b2b34a | 小米粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=谷物/杂粮/粉类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-9d17c5b52fbf931f26bc | 小茴香 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=香辛料/草本；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-3c76f9697b5f2f42147e | 小麦 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=谷物/杂粮/粉类；非官方来源，需人工复核后才能提升。 |
| ordinary-s2-bbeddfc4c59fae96870a | 小麦淀粉 | ordinary_ingredient | S2 | S2 人工整理 OCR 高频普通配料词；类别=淀粉/粉体/膳食纤维；非官方来源，需人工复核后才能提升。 |

## 不建议使用/不得进入高置信匹配

说明：没有 source relation 或 evidence 的 pending_review 记录不得 promoted；只能作为低置信候选或等待补证。

| ingredient_id | name | type | source_status |
|---|---|---|---|
| 无 | 无 | 无 | 无 |

## 执行建议

- S0 官方抽取数据：逐条核对原文、页码、表格和适用范围后再 promoted。
- S2 普通配料：先用于 OCR 候选匹配，人工复核来源或企业标签样本后再提高置信度。
- 无 evidence/source relation 记录：补齐来源前不进入高置信自动匹配。
