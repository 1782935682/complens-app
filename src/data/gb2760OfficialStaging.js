const gb2760OfficialRetrievedAt = '2026-06-12';
const gb2760OfficialSearchUrl = 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch';
const gb2760OfficialDownloadUrl = 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo';
const gb2760OfficialFileGuid = '43C9B75E-3D84-4577-80FC-0F7D77D36407';
const gb2760OfficialFactName = '1747898473246.pdf';
const gb2760OfficialPdfPath = '/home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf';
const gb2760OfficialPdfSha256 = '2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de';

export const gb2760OfficialStagingSource = {
  sourceName: '国家卫生健康委公告（2024年第1号）/ 食品安全国家标准数据检索平台',
  sourceType: 'official_standard',
  sourceUrl: gb2760OfficialSearchUrl,
  downloadEndpoint: gb2760OfficialDownloadUrl,
  standardCode: 'GB 2760-2024',
  standardTitle: '食品安全国家标准 食品添加剂使用标准',
  publishedAt: '2024-02-08',
  effectiveDate: '2025-02-08',
  retrievedAt: gb2760OfficialRetrievedAt,
  platformRecordId: '6CA1489A-9570-4906-8CE8-CC86FBFB1941',
  announcementRecordId: '3D0601E8-A77C-4EC5-B148-30E2E7020822',
  fileGuid: gb2760OfficialFileGuid,
  factName: gb2760OfficialFactName,
  localPdfPath: gb2760OfficialPdfPath,
  pdfSha256: gb2760OfficialPdfSha256
};

const sourceFields = {
  sourceName: gb2760OfficialStagingSource.sourceName,
  sourceType: gb2760OfficialStagingSource.sourceType,
  sourceUrl: gb2760OfficialStagingSource.sourceUrl,
  downloadEndpoint: gb2760OfficialStagingSource.downloadEndpoint,
  platformRecordId: gb2760OfficialStagingSource.platformRecordId,
  announcementRecordId: gb2760OfficialStagingSource.announcementRecordId,
  fileGuid: gb2760OfficialStagingSource.fileGuid,
  factName: gb2760OfficialStagingSource.factName,
  pdfSha256: gb2760OfficialStagingSource.pdfSha256,
  retrievedAt: gb2760OfficialStagingSource.retrievedAt,
  standardCode: gb2760OfficialStagingSource.standardCode,
  standardTitle: gb2760OfficialStagingSource.standardTitle,
  tableName: '表 A.1'
};

function officialRecord(record) {
  return {
    ...sourceFields,
    ...record
  };
}

function officialUsageRows(common, rows) {
  return rows.map((row) => officialRecord({
    ...common,
    ...row,
    rawSourceText: row.rawSourceText || [
      `GB 2760-2024 表 A.1：${common.additiveNameCn} ${common.additiveNameEn}`,
      `CNS号 ${common.cnsNumber}`,
      `INS号 ${common.insNumber}`,
      `功能 ${common.functionText}`,
      `${row.foodCategoryCode} ${row.foodCategoryName}`,
      `最大使用量 ${row.maxUseLevel}${row.unit ? ` ${row.unit}` : ''}`,
      row.note || ''
    ].filter(Boolean).join('；') + '。'
  }));
}

export const gb2760OfficialStagingRecords = [
  officialRecord({
    id: 'gb2760-2024-a1-citric-acid-general',
    ingredientId: 'citric-acid',
    additiveNameCn: '柠檬酸',
    additiveNameEn: 'citric acid',
    cnsNumber: '01.101',
    insNumber: '330',
    functionText: '酸度调节剂、抗氧化剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~15、17~53、59~62、64~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 89,
    standardPage: 68,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：柠檬酸 citric acid；CNS号 01.101；INS号 330；功能 酸度调节剂、抗氧化剂；各类食品（表 A.2 中编号为 1~15、17~53、59~62、64~68 的食品类别除外）按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-sodium-citrate-general',
    ingredientId: 'sodium-citrate',
    additiveNameCn: '柠檬酸钠',
    additiveNameEn: 'trisodium citrate',
    cnsNumber: '01.303',
    insNumber: '331(iii)',
    functionText: '酸度调节剂、稳定剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~53、59~62、64~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 89,
    standardPage: 68,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：柠檬酸钠 trisodium citrate；CNS号 01.303；INS号 331(iii)；功能 酸度调节剂、稳定剂；各类食品（表 A.2 中编号为 1~53、59~62、64~68 的食品类别除外）按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-xanthan-gum-general',
    ingredientId: 'xanthan-gum',
    additiveNameCn: '黄原胶（又名汉生胶）',
    additiveNameEn: 'xanthan gum',
    cnsNumber: '20.009',
    insNumber: '415',
    functionText: '稳定剂、增稠剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~4、6~49、54~61、63~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 53,
    standardPage: 50,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：黄原胶（又名汉生胶）xanthan gum；CNS号 20.009；INS号 415；功能 稳定剂、增稠剂；各类食品（表 A.2 中编号为 1~4、6~49、54~61、63~68 的食品类别除外）按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-xanthan-gum-butter',
    ingredientId: 'xanthan-gum',
    additiveNameCn: '黄原胶（又名汉生胶）',
    additiveNameEn: 'xanthan gum',
    cnsNumber: '20.009',
    insNumber: '415',
    functionText: '稳定剂、增稠剂',
    foodCategoryCode: '02.02.01.01',
    foodCategoryName: '黄油和浓缩黄油',
    maxUseLevel: '5.0',
    unit: 'g/kg',
    note: '',
    pdfPage: 53,
    standardPage: 50,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：黄原胶（又名汉生胶）xanthan gum；02.02.01.01 黄油和浓缩黄油；最大使用量 5.0 g/kg。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-xanthan-gum-wet-noodles',
    ingredientId: 'xanthan-gum',
    additiveNameCn: '黄原胶（又名汉生胶）',
    additiveNameEn: 'xanthan gum',
    cnsNumber: '20.009',
    insNumber: '415',
    functionText: '稳定剂、增稠剂',
    foodCategoryCode: '06.03.02.01',
    foodCategoryName: '生湿面制品（如面条、饺子皮、馄饨皮、烧麦皮）',
    maxUseLevel: '10.0',
    unit: 'g/kg',
    note: '',
    pdfPage: 53,
    standardPage: 50,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：黄原胶（又名汉生胶）xanthan gum；06.03.02.01 生湿面制品（如面条、饺子皮、馄饨皮、烧麦皮）；最大使用量 10.0 g/kg。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-xanthan-gum-dry-noodles',
    ingredientId: 'xanthan-gum',
    additiveNameCn: '黄原胶（又名汉生胶）',
    additiveNameEn: 'xanthan gum',
    cnsNumber: '20.009',
    insNumber: '415',
    functionText: '稳定剂、增稠剂',
    foodCategoryCode: '06.03.02.02',
    foodCategoryName: '生干面制品',
    maxUseLevel: '4.0',
    unit: 'g/kg',
    note: '',
    pdfPage: 53,
    standardPage: 50,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：黄原胶（又名汉生胶）xanthan gum；06.03.02.02 生干面制品；最大使用量 4.0 g/kg。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-xanthan-gum-syrup',
    ingredientId: 'xanthan-gum',
    additiveNameCn: '黄原胶（又名汉生胶）',
    additiveNameEn: 'xanthan gum',
    cnsNumber: '20.009',
    insNumber: '415',
    functionText: '稳定剂、增稠剂',
    foodCategoryCode: '11.01.02',
    foodCategoryName: '赤砂糖、原糖、其他糖和糖浆',
    maxUseLevel: '5.0',
    unit: 'g/kg',
    note: '',
    pdfPage: 53,
    standardPage: 50,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：黄原胶（又名汉生胶）xanthan gum；11.01.02 赤砂糖、原糖、其他糖和糖浆；最大使用量 5.0 g/kg。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-xanthan-gum-infant-medical-formula',
    ingredientId: 'xanthan-gum',
    additiveNameCn: '黄原胶（又名汉生胶）',
    additiveNameEn: 'xanthan gum',
    cnsNumber: '20.009',
    insNumber: '415',
    functionText: '稳定剂、增稠剂',
    foodCategoryCode: '13.01.03',
    foodCategoryName: '特殊医学用途婴儿配方食品',
    maxUseLevel: '9.0',
    unit: 'g/kg',
    note: '使用量仅限粉状产品，液态产品按照稀释倍数折算',
    pdfPage: 53,
    standardPage: 50,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：黄原胶（又名汉生胶）xanthan gum；13.01.03 特殊医学用途婴儿配方食品；最大使用量 9.0 g/kg；使用量仅限粉状产品，液态产品按照稀释倍数折算。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-calcium-carbonate-general',
    ingredientId: 'calcium-carbonate',
    additiveNameCn: '碳酸钙（包括轻质碳酸钙，重质碳酸钙）',
    additiveNameEn: 'calcium carbonate (light and heavy)',
    cnsNumber: '13.006',
    insNumber: '170(i)',
    functionText: '膨松剂、面粉处理剂、稳定剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 112,
    standardPage: 109,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：碳酸钙（包括轻质碳酸钙，重质碳酸钙）calcium carbonate；CNS号 13.006；INS号 170(i)；功能 膨松剂、面粉处理剂、稳定剂；各类食品（表 A.2 中编号为 1~68 的食品类别除外）按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-calcium-carbonate-wheat-flour',
    ingredientId: 'calcium-carbonate',
    additiveNameCn: '碳酸钙（包括轻质碳酸钙，重质碳酸钙）',
    additiveNameEn: 'calcium carbonate (light and heavy)',
    cnsNumber: '13.006',
    insNumber: '170(i)',
    functionText: '膨松剂、面粉处理剂、稳定剂',
    foodCategoryCode: '06.03.01',
    foodCategoryName: '小麦粉',
    maxUseLevel: '0.03',
    unit: 'g/kg',
    note: '',
    pdfPage: 112,
    standardPage: 109,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：碳酸钙（包括轻质碳酸钙，重质碳酸钙）；06.03.01 小麦粉；最大使用量 0.03 g/kg。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-calcium-carbonate-biscuit',
    ingredientId: 'calcium-carbonate',
    additiveNameCn: '碳酸钙（包括轻质碳酸钙，重质碳酸钙）',
    additiveNameEn: 'calcium carbonate (light and heavy)',
    cnsNumber: '13.006',
    insNumber: '170(i)',
    functionText: '膨松剂、面粉处理剂、稳定剂',
    foodCategoryCode: '07.03',
    foodCategoryName: '饼干',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 112,
    standardPage: 109,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：碳酸钙（包括轻质碳酸钙，重质碳酸钙）；07.03 饼干；按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-sodium-bicarbonate-general',
    ingredientId: 'sodium-bicarbonate',
    additiveNameCn: '碳酸氢钠',
    additiveNameEn: 'sodium hydrogencarbonate',
    cnsNumber: '06.001',
    insNumber: '500(ii)',
    functionText: '膨松剂、酸度调节剂、稳定剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~56、58~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 114,
    standardPage: 111,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：碳酸氢钠 sodium hydrogencarbonate；CNS号 06.001；INS号 500(ii)；功能 膨松剂、酸度调节剂、稳定剂；各类食品（表 A.2 中编号为 1~56、58~68 的食品类别除外）按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-sodium-bicarbonate-fermented-rice',
    ingredientId: 'sodium-bicarbonate',
    additiveNameCn: '碳酸氢钠',
    additiveNameEn: 'sodium hydrogencarbonate',
    cnsNumber: '06.001',
    insNumber: '500(ii)',
    functionText: '膨松剂、酸度调节剂、稳定剂',
    foodCategoryCode: '06.02.02',
    foodCategoryName: '大米制品（仅限发酵大米制品）',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 114,
    standardPage: 111,
    extractionStatus: 'verified',
    reviewStatus: 'verified',
    rawSourceText: 'GB 2760-2024 表 A.1：碳酸氢钠 sodium hydrogencarbonate；06.02.02 大米制品（仅限发酵大米制品）按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-guar-gum-general',
    ingredientId: 'guar-gum',
    additiveNameCn: '瓜尔胶',
    additiveNameEn: 'guar gum',
    cnsNumber: '20.025',
    insNumber: '412',
    functionText: '增稠剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 45,
    standardPage: 42,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review',
    rawSourceText: 'GB 2760-2024 表 A.1：瓜尔胶 guar gum；CNS号 20.025；INS号 412；功能 增稠剂；各类食品（表 A.2 中编号为 1~68 的食品类别除外）按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-guar-gum-cream',
    ingredientId: 'guar-gum',
    additiveNameCn: '瓜尔胶',
    additiveNameEn: 'guar gum',
    cnsNumber: '20.025',
    insNumber: '412',
    functionText: '增稠剂',
    foodCategoryCode: '01.05.01',
    foodCategoryName: '稀奶油',
    maxUseLevel: '1.0',
    unit: 'g/kg',
    note: '',
    pdfPage: 45,
    standardPage: 42,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review',
    rawSourceText: 'GB 2760-2024 表 A.1：瓜尔胶 guar gum；01.05.01 稀奶油；最大使用量 1.0 g/kg。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-guar-gum-older-infant-formula',
    ingredientId: 'guar-gum',
    additiveNameCn: '瓜尔胶',
    additiveNameEn: 'guar gum',
    cnsNumber: '20.025',
    insNumber: '412',
    functionText: '增稠剂',
    foodCategoryCode: '13.01.02',
    foodCategoryName: '较大婴儿和幼儿配方食品',
    maxUseLevel: '1.0',
    unit: 'g/L',
    note: '以即食状态计',
    pdfPage: 45,
    standardPage: 42,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review',
    rawSourceText: 'GB 2760-2024 表 A.1：瓜尔胶 guar gum；13.01.02 较大婴儿和幼儿配方食品；最大使用量 1.0 g/L；以即食状态计。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-pectin-general',
    ingredientId: 'pectin',
    additiveNameCn: '果胶',
    additiveNameEn: 'pectins',
    cnsNumber: '20.006',
    insNumber: '440',
    functionText: '乳化剂、稳定剂、增稠剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~4、6~9、11~30、33~46、48~49、54~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 45,
    standardPage: 42,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review',
    rawSourceText: 'GB 2760-2024 表 A.1：果胶 pectins；CNS号 20.006；INS号 440；功能 乳化剂、稳定剂、增稠剂；各类食品（表 A.2 中编号为 1~4、6~9、11~30、33~46、48~49、54~68 的食品类别除外）按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-pectin-juice',
    ingredientId: 'pectin',
    additiveNameCn: '果胶',
    additiveNameEn: 'pectins',
    cnsNumber: '20.006',
    insNumber: '440',
    functionText: '乳化剂、稳定剂、增稠剂',
    foodCategoryCode: '14.02.01',
    foodCategoryName: '果蔬汁（浆）',
    maxUseLevel: '3.0',
    unit: 'g/kg',
    note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量',
    pdfPage: 45,
    standardPage: 42,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review',
    rawSourceText: 'GB 2760-2024 表 A.1：果胶 pectins；14.02.01 果蔬汁（浆）；最大使用量 3.0 g/kg；以即饮状态计，相应的固体饮料按稀释倍数增加使用量。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-potassium-citrate-general',
    ingredientId: 'potassium-citrate',
    additiveNameCn: '柠檬酸钾',
    additiveNameEn: 'tripotassium citrate',
    cnsNumber: '01.304',
    insNumber: '332(ii)',
    functionText: '酸度调节剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~53、59~62、64~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 89,
    standardPage: 68,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review',
    rawSourceText: 'GB 2760-2024 表 A.1：柠檬酸钾 tripotassium citrate；CNS号 01.304；INS号 332(ii)；功能 酸度调节剂；各类食品（表 A.2 中编号为 1~53、59~62、64~68 的食品类别除外）按生产需要适量使用。'
  }),
  officialRecord({
    id: 'gb2760-2024-a1-sodium-carboxymethyl-cellulose-general',
    ingredientId: 'sodium-carboxymethyl-cellulose',
    additiveNameCn: '羧甲基纤维素钠',
    additiveNameEn: 'sodium carboxymethyl cellulose',
    cnsNumber: '20.003',
    insNumber: '466',
    functionText: '增稠剂、稳定剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~4、6~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 112,
    standardPage: 109,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review',
    rawSourceText: 'GB 2760-2024 表 A.1：羧甲基纤维素钠 sodium carboxymethyl cellulose；CNS号 20.003；INS号 466；功能 增稠剂、稳定剂；各类食品（表 A.2 中编号为 1~4、6~68 的食品类别除外）按生产需要适量使用。'
  }),
  ...officialUsageRows({
    ingredientId: 'calcium-silicate',
    additiveNameCn: '硅酸钙',
    additiveNameEn: 'calcium silicate',
    cnsNumber: '02.009',
    insNumber: '552',
    functionText: '抗结剂',
    pdfPage: 45,
    standardPage: 42,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-calcium-silicate-milk-powder-products',
      foodCategoryCode: '01.03',
      foodCategoryName: '乳粉和奶油粉及其调制产品（01.03.01 乳粉和奶油粉除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-cheese-products',
      foodCategoryCode: '01.06',
      foodCategoryName: '干酪、再制干酪、干酪制品及干酪类似品',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-cocoa-products',
      foodCategoryCode: '05.01.01',
      foodCategoryName: '可可制品（包括以可可为主要原料的脂、粉、浆、酱、馅等）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-starch-products',
      foodCategoryCode: '06.05',
      foodCategoryName: '淀粉及淀粉类制品',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-sugar',
      foodCategoryCode: '11.01',
      foodCategoryName: '食糖',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-tabletop-sweeteners',
      foodCategoryCode: '11.04',
      foodCategoryName: '餐桌甜味料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-salt-substitutes',
      foodCategoryCode: '12.01',
      foodCategoryName: '盐及代盐制品',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-spices-powder',
      foodCategoryCode: '12.09.01',
      foodCategoryName: '香辛料及粉',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-solid-beverage',
      foodCategoryCode: '14.06',
      foodCategoryName: '固体饮料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-silicate-yeast-products',
      foodCategoryCode: '16.04',
      foodCategoryName: '酵母及酵母类制品',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'gellan-gum',
    additiveNameCn: '结冷胶',
    additiveNameEn: 'gellan gum',
    cnsNumber: '20.027',
    insNumber: '418',
    functionText: '增稠剂',
    pdfPage: 60,
    standardPage: 57,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-gellan-gum-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'magnesium-carbonate',
    additiveNameCn: '碳酸镁（包括轻质碳酸镁，重质碳酸镁）',
    additiveNameEn: 'magnesium carbonate',
    cnsNumber: '13.005',
    insNumber: '504(i)',
    functionText: '面粉处理剂、膨松剂、稳定剂、抗结剂',
    pdfPage: 113,
    standardPage: 110,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-magnesium-carbonate-wheat-flour',
      foodCategoryCode: '06.03.01',
      foodCategoryName: '小麦粉',
      maxUseLevel: '1.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-magnesium-carbonate-solid-beverage',
      foodCategoryCode: '14.06',
      foodCategoryName: '固体饮料',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'propylene-glycol-alginate',
    additiveNameCn: '海藻酸丙二醇酯',
    additiveNameEn: 'propylene glycol alginate',
    cnsNumber: '20.010',
    insNumber: '405',
    functionText: '增稠剂、乳化剂、稳定剂',
    pdfPage: 46,
    standardPage: 43,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-milk-products',
      foodCategoryCode: '01.0',
      foodCategoryName: '乳及乳制品（13.0 特殊膳食用食品涉及品种除外，且 01.01.01、01.01.02、01.02.01、01.03.01、01.05.01 除外）',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '4.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '4.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-evaporated-milk',
      foodCategoryCode: '01.04.01',
      foodCategoryName: '淡炼乳（原味）',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-hydrogenated-oil',
      foodCategoryCode: '02.01.01.02',
      foodCategoryName: '氢化植物油',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-fat-emulsion',
      foodCategoryCode: '02.02',
      foodCategoryName: '水油状脂肪乳化制品（02.02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-other-fat-emulsion',
      foodCategoryCode: '02.03',
      foodCategoryName: '02.02 类以外的脂肪乳化制品，包括混合的和（或）调味的脂肪乳化制品',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-ice-cream',
      foodCategoryCode: '03.01',
      foodCategoryName: '冰淇淋、雪糕类',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-cocoa-products',
      foodCategoryCode: '05.01',
      foodCategoryName: '可可制品、巧克力和巧克力制品，包括代可可脂巧克力及制品',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-chewing-gum',
      foodCategoryCode: '05.02.01',
      foodCategoryName: '胶基糖果',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-decorative-candy',
      foodCategoryCode: '05.04',
      foodCategoryName: '装饰糖果、顶饰（非水果材料）和甜汁',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-wet-noodles',
      foodCategoryCode: '06.03.02.01',
      foodCategoryName: '生湿面制品（如面条、饺子皮、馄饨皮、烧麦皮）',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-dry-noodles',
      foodCategoryCode: '06.03.02.02',
      foodCategoryName: '生干面制品',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-fermented-flour-products',
      foodCategoryCode: '06.03.02.03',
      foodCategoryName: '发酵面制品',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-instant-rice-noodle',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-frozen-rice-noodle',
      foodCategoryCode: '06.08',
      foodCategoryName: '冷冻米面制品',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-bread',
      foodCategoryCode: '07.01',
      foodCategoryName: '面包',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-pastry',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-bakery-filling',
      foodCategoryCode: '07.04',
      foodCategoryName: '焙烤食品馅料及表面用挂浆',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'propylene-glycol-alginate',
    additiveNameCn: '海藻酸丙二醇酯',
    additiveNameEn: 'propylene glycol alginate',
    cnsNumber: '20.010',
    insNumber: '405',
    functionText: '增稠剂、乳化剂、稳定剂',
    pdfPage: 47,
    standardPage: 44,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-other-bakery',
      foodCategoryCode: '07.05',
      foodCategoryName: '其他焙烤食品',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-flavored-syrup',
      foodCategoryCode: '11.05',
      foodCategoryName: '调味糖浆',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-semisolid-seasoning',
      foodCategoryCode: '12.10.02',
      foodCategoryName: '半固体复合调味料',
      maxUseLevel: '8.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-beverages',
      foodCategoryCode: '14.0',
      foodCategoryName: '饮料类（14.01 包装饮用水、14.02.01 果蔬汁（浆）、14.02.02 浓缩果蔬汁（浆）除外）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-fruit-vegetable-juice-beverage',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-milk-beverage',
      foodCategoryCode: '14.03.01',
      foodCategoryName: '含乳饮料',
      maxUseLevel: '4.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-plant-protein-beverage',
      foodCategoryCode: '14.03.02',
      foodCategoryName: '植物蛋白饮料',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-coffee-beverage',
      foodCategoryCode: '14.05.02',
      foodCategoryName: '咖啡（类）饮料',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-alginate-beer-malt-beverage',
      foodCategoryCode: '15.03.05',
      foodCategoryName: '啤酒和麦芽饮料',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sodium-alginate',
    additiveNameCn: '海藻酸钠（又名褐藻酸钠）',
    additiveNameEn: 'sodium alginate',
    cnsNumber: '20.004',
    insNumber: '401',
    functionText: '增稠剂、稳定剂',
    pdfPage: 48,
    standardPage: 45,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sodium-alginate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~4、6~9、11~30、33~49、54~61、63~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-alginate-syrup',
      foodCategoryCode: '11.01.02',
      foodCategoryName: '赤砂糖、原糖、其他糖和糖浆',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-alginate-medical-formula-toddler',
      foodCategoryCode: '13.03',
      foodCategoryName: '其他特殊膳食用食品（仅限 13 月龄~10 岁特殊医学用途配方食品中氨基酸代谢障碍配方产品）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '适用于 13 月龄~36 月龄幼儿的产品'
    },
    {
      id: 'gb2760-2024-a1-sodium-alginate-medical-formula-child',
      foodCategoryCode: '13.03',
      foodCategoryName: '其他特殊膳食用食品（仅限 13 月龄~10 岁特殊医学用途配方食品中氨基酸代谢障碍配方产品）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: '适用于 37 月龄~10 岁人群的产品'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'carrageenan',
    additiveNameCn: '卡拉胶',
    additiveNameEn: 'carrageenan',
    cnsNumber: '20.007',
    insNumber: '407',
    functionText: '乳化剂、稳定剂、增稠剂',
    pdfPage: 65,
    standardPage: 62,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-carrageenan-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~4、6~9、11~30、32~49、54~61、63~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-carrageenan-dry-noodles',
      foodCategoryCode: '06.03.02.02',
      foodCategoryName: '生干面制品',
      maxUseLevel: '8.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-carrageenan-syrup',
      foodCategoryCode: '11.01.02',
      foodCategoryName: '赤砂糖、原糖、其他糖和糖浆',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-carrageenan-infant-formula',
      foodCategoryCode: '13.01',
      foodCategoryName: '婴幼儿配方食品',
      maxUseLevel: '0.3',
      unit: 'g/L',
      note: '以即食状态计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'calcium-chloride',
    additiveNameCn: '氯化钙',
    additiveNameEn: 'calcium chloride',
    cnsNumber: '18.002',
    insNumber: '509',
    functionText: '稳定剂和凝固剂、增稠剂、其他',
    pdfPage: 82,
    standardPage: 79,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-calcium-chloride-cream',
      foodCategoryCode: '01.05.01',
      foodCategoryName: '稀奶油',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-chloride-modified-cream',
      foodCategoryCode: '01.05.03',
      foodCategoryName: '调制稀奶油',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-chloride-canned-fruit',
      foodCategoryCode: '04.01.02.04',
      foodCategoryName: '水果罐头',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-chloride-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-chloride-canned-vegetable',
      foodCategoryCode: '04.02.02.04',
      foodCategoryName: '蔬菜罐头',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-chloride-legume-products',
      foodCategoryCode: '04.04',
      foodCategoryName: '豆类制品',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-chloride-decorative-candy',
      foodCategoryCode: '05.04',
      foodCategoryName: '装饰糖果（如工艺造型，或用于蛋糕装饰）、顶饰（非水果材料）和甜汁',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-chloride-flavored-syrup',
      foodCategoryCode: '11.05',
      foodCategoryName: '调味糖浆',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-chloride-other-drinking-water',
      foodCategoryCode: '14.01.03',
      foodCategoryName: '其他类饮用水（自然来源饮用水除外）',
      maxUseLevel: '0.1',
      unit: 'g/L',
      note: '以 Ca 计 36 mg/L'
    },
    {
      id: 'gb2760-2024-a1-calcium-chloride-livestock-blood-products',
      foodCategoryCode: '16.07',
      foodCategoryName: '其他（仅限畜禽血制品）',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'natamycin',
    additiveNameCn: '纳他霉素',
    additiveNameEn: 'natamycin',
    cnsNumber: '17.030',
    insNumber: '235',
    functionText: '防腐剂',
    pdfPage: 86,
    standardPage: 83,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-natamycin-cheese-products',
      foodCategoryCode: '01.06',
      foodCategoryName: '干酪、再制干酪、干酪制品及干酪类似品',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '表面使用，残留量<10 mg/kg'
    },
    {
      id: 'gb2760-2024-a1-natamycin-pastry',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '表面使用，混悬液喷雾或浸泡，残留量<10 mg/kg'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'natamycin',
    additiveNameCn: '纳他霉素',
    additiveNameEn: 'natamycin',
    cnsNumber: '17.030',
    insNumber: '235',
    functionText: '防腐剂',
    pdfPage: 87,
    standardPage: 84,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-natamycin-sauced-braised-meat',
      foodCategoryCode: '08.03.01',
      foodCategoryName: '酱卤肉制品类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '表面使用，混悬液喷雾或浸泡，残留量<10 mg/kg'
    },
    {
      id: 'gb2760-2024-a1-natamycin-smoked-roasted-meat',
      foodCategoryCode: '08.03.02',
      foodCategoryName: '熏、烧、烤肉类（熏肉、叉烧肉、烤鸭、肉脯等）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '表面使用，混悬液喷雾或浸泡，残留量<10 mg/kg'
    },
    {
      id: 'gb2760-2024-a1-natamycin-fried-meat',
      foodCategoryCode: '08.03.03',
      foodCategoryName: '油炸肉类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '表面使用，混悬液喷雾或浸泡，残留量<10 mg/kg'
    },
    {
      id: 'gb2760-2024-a1-natamycin-western-ham',
      foodCategoryCode: '08.03.04',
      foodCategoryName: '西式火腿（熏烤、烟熏、蒸煮火腿）类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '表面使用，混悬液喷雾或浸泡，残留量<10 mg/kg'
    },
    {
      id: 'gb2760-2024-a1-natamycin-meat-sausage',
      foodCategoryCode: '08.03.05',
      foodCategoryName: '肉灌肠类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '表面使用，混悬液喷雾或浸泡，残留量<10 mg/kg'
    },
    {
      id: 'gb2760-2024-a1-natamycin-fermented-meat',
      foodCategoryCode: '08.03.06',
      foodCategoryName: '发酵肉制品类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '表面使用，混悬液喷雾或浸泡，残留量<10 mg/kg'
    },
    {
      id: 'gb2760-2024-a1-natamycin-mayonnaise-salad-dressing',
      foodCategoryCode: '12.10.02.01',
      foodCategoryName: '蛋黄酱、沙拉酱',
      maxUseLevel: '0.02',
      unit: 'g/kg',
      note: '残留量≤10 mg/kg'
    },
    {
      id: 'gb2760-2024-a1-natamycin-fermented-wine',
      foodCategoryCode: '15.03',
      foodCategoryName: '发酵酒（15.03.01 葡萄酒除外）',
      maxUseLevel: '0.01',
      unit: 'g/L',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'agar',
    additiveNameCn: '琼脂',
    additiveNameEn: 'agar',
    cnsNumber: '20.001',
    insNumber: '406',
    functionText: '增稠剂',
    pdfPage: 96,
    standardPage: 93,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-agar-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'lactic-acid',
    additiveNameCn: '乳酸',
    additiveNameEn: 'lactic acid',
    cnsNumber: '01.102',
    insNumber: '270',
    functionText: '酸度调节剂',
    pdfPage: 98,
    standardPage: 95,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-lactic-acid-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~4、6~53、57~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'calcium-lactate',
    additiveNameCn: '乳酸钙',
    additiveNameEn: 'calcium lactate',
    cnsNumber: '01.310',
    insNumber: '327',
    functionText: '酸度调节剂、抗氧化剂、乳化剂、稳定剂和凝固剂、增稠剂',
    pdfPage: 98,
    standardPage: 95,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-calcium-lactate-processed-fruit',
      foodCategoryCode: '04.01.02',
      foodCategoryName: '加工水果',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-lactate-pickled-cucumber',
      foodCategoryCode: '04.02.02.04',
      foodCategoryName: '蔬菜罐头（仅限酸黄瓜产品）',
      maxUseLevel: '1.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-lactate-candy',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-lactate-fried-potato-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料（仅限油炸薯类调味料）',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-lactate-solid-beverage',
      foodCategoryCode: '14.06',
      foodCategoryName: '固体饮料',
      maxUseLevel: '21.6',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-calcium-lactate-jelly',
      foodCategoryCode: '16.01',
      foodCategoryName: '果冻',
      maxUseLevel: '6.0',
      unit: 'g/kg',
      note: '如用于果冻粉，按冲调倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-calcium-lactate-puffed-food',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'nisin',
    additiveNameCn: '乳酸链球菌素',
    additiveNameEn: 'nisin',
    cnsNumber: '17.019',
    insNumber: '234',
    functionText: '防腐剂',
    pdfPage: 98,
    standardPage: 95,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-nisin-milk-products',
      foodCategoryCode: '01.0',
      foodCategoryName: '乳及乳制品（13.0 特殊膳食用食品涉及品种除外，且 01.01.01 巴氏杀菌乳、01.01.02 灭菌乳和高温杀菌乳、01.02.01 发酵乳、01.03.01 乳粉和奶油粉和 01.05.01 稀奶油除外）',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'nisin',
    additiveNameCn: '乳酸链球菌素',
    additiveNameEn: 'nisin',
    cnsNumber: '17.019',
    insNumber: '234',
    functionText: '防腐剂',
    pdfPage: 99,
    standardPage: 96,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-nisin-pickled-vegetable',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-processed-mushroom-algae',
      foodCategoryCode: '04.03.02',
      foodCategoryName: '加工食用菌和藻类（04.03.02.04 食用菌和藻类罐头除外）',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-braised-dried-tofu',
      foodCategoryCode: '04.04.01.03.02',
      foodCategoryName: '卤制豆干',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-multigrain-sausage',
      foodCategoryCode: '06.04.02.02',
      foodCategoryName: '其他杂粮制品（仅限杂粮灌肠制品）',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-instant-wet-noodle',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品（仅限方便湿面制品）',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-rice-noodle-sausage',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品（仅限米面灌肠制品）',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-bread',
      foodCategoryCode: '07.01',
      foodCategoryName: '面包',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-pastry',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-prepared-meat',
      foodCategoryCode: '08.02',
      foodCategoryName: '预制肉制品',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-cooked-meat',
      foodCategoryCode: '08.03',
      foodCategoryName: '熟肉制品（08.03.08 肉罐头类除外）',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-cooked-aquatic-product',
      foodCategoryCode: '09.04',
      foodCategoryName: '熟制水产品（可直接食用）',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-physically-modified-egg-products',
      foodCategoryCode: '10.03',
      foodCategoryName: '蛋制品（改变其物理性状）[10.03.01 脱水蛋制品（如蛋白粉、蛋黄粉、蛋白片）、10.03.03 蛋液与液态蛋除外]',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-vinegar',
      foodCategoryCode: '12.03',
      foodCategoryName: '食醋',
      maxUseLevel: '0.15',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-soy-sauce',
      foodCategoryCode: '12.04',
      foodCategoryName: '酱油',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-fermented-sauce',
      foodCategoryCode: '12.05',
      foodCategoryName: '酿造酱',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nisin-beverages',
      foodCategoryCode: '14.0',
      foodCategoryName: '饮料类（14.01 包装饮用水、14.02.01 果蔬汁（浆）、14.02.02 浓缩果蔬汁（浆）除外）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'calcium-disodium-edta',
    additiveNameCn: '乙二胺四乙酸二钠钙',
    additiveNameEn: 'calcium disodium ethylene-diamine-tetra-acetate',
    cnsNumber: '04.020',
    insNumber: '385',
    functionText: '抗氧化剂',
    pdfPage: 134,
    standardPage: 131,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-calcium-disodium-edta-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '0.075',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sodium-acetate',
    additiveNameCn: '乙酸钠（又名醋酸钠）',
    additiveNameEn: 'sodium acetate',
    cnsNumber: '00.013',
    insNumber: '262(i)',
    functionText: '酸度调节剂、防腐剂',
    pdfPage: 134,
    standardPage: 131,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sodium-acetate-cured-meat',
      foodCategoryCode: '08.02.02',
      foodCategoryName: '腌腊肉制品类（如咸肉、腊肉、板鸭、中式火腿、腊肠）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-acetate-smoked-roasted-meat',
      foodCategoryCode: '08.03.02',
      foodCategoryName: '熏、烧、烤肉类（熏肉、叉烧肉、烤鸭、肉脯等）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-acetate-fried-meat',
      foodCategoryCode: '08.03.03',
      foodCategoryName: '油炸肉类',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-acetate-meat-sausage',
      foodCategoryCode: '08.03.05',
      foodCategoryName: '肉灌肠类',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-acetate-frozen-battered-product',
      foodCategoryCode: '09.02.02',
      foodCategoryName: '冷冻挂浆制品',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sodium-acetate',
    additiveNameCn: '乙酸钠（又名醋酸钠）',
    additiveNameEn: 'sodium acetate',
    cnsNumber: '00.013',
    insNumber: '262(i)',
    functionText: '酸度调节剂、防腐剂',
    pdfPage: 135,
    standardPage: 132,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sodium-acetate-cooked-fried-aquatic-product',
      foodCategoryCode: '09.04.02',
      foodCategoryName: '经烹调或油炸的水产品',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-acetate-smoked-roasted-aquatic-product',
      foodCategoryCode: '09.04.03',
      foodCategoryName: '熏、烤水产品',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-acetate-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-acetate-puffed-food',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    }
  ])
];

export function getGb2760OfficialStagingSummary(records = gb2760OfficialStagingRecords) {
  const statusCounts = records.reduce((counts, record) => {
    counts[record.reviewStatus] = (counts[record.reviewStatus] || 0) + 1;
    return counts;
  }, {});
  const ingredientIds = new Set(records.map((record) => record.ingredientId).filter(Boolean));
  const sourceNames = new Set(records.map((record) => record.sourceName));

  return {
    totalCount: records.length,
    ingredientCount: ingredientIds.size,
    statusCounts,
    sourceNames: [...sourceNames].sort()
  };
}
