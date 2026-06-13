import {
  gb2760OfficialGeneratedA1Coverage,
  gb2760OfficialGeneratedA1StagingRecords
} from './gb2760OfficialGeneratedA1Staging.js';
import { foodAdditives } from './foodAdditives.js';

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

const gb2760SeedIngredientMatchIndex = buildGb2760SeedIngredientMatchIndex(foodAdditives);

const aspartameFootnote = '添加该添加剂的食品应标明含苯丙氨酸；混合使用时最大使用量不能超过标准规定的阿斯巴甜最大使用量';
const aspartameBeverageNote = `${aspartameFootnote}；以即饮状态计，相应的固体饮料按稀释倍数增加使用量`;
const aspartameJellyNote = `${aspartameFootnote}；如用于果冻粉，按冲调倍数增加使用量`;
const acesulfameMixNote = '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量';
const acesulfameBeverageNote = `${acesulfameMixNote}；以即饮状态计，相应的固体饮料按稀释倍数增加使用量`;
const acesulfameJellyNote = `${acesulfameMixNote}；如用于果冻粉，按冲调倍数增加使用量`;
const benzoicAcidNote = '以苯甲酸计';
const benzoicAcidBeverageNote = `${benzoicAcidNote}，以即饮状态计，相应的固体饮料按稀释倍数增加使用量`;
const teaPolyphenolsCatechinNote = '以儿茶素计';
const teaPolyphenolsOilCatechinNote = '以油脂中儿茶素计';
const erythrosineNote = '以赤藓红计';
const erythrosineBeverageNote = `${erythrosineNote}，以即饮状态计，相应的固体饮料按稀释倍数增加使用量`;

function officialRecord(record) {
  return {
    ...sourceFields,
    ...record,
    ingredientId: record.ingredientId || findGb2760SeedIngredientId(record) || ''
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

function officialGroupedUsageRows(common, ingredientVariants, rows) {
  return ingredientVariants.flatMap((variant) => officialUsageRows({
    ...common,
    ...variant
  }, rows.map((row) => ({
    ...row,
    id: row.id.replace('{ingredientId}', variant.ingredientId)
  }))));
}

const gb2760OfficialManualStagingRecords = [
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
  ...officialUsageRows({
    additiveNameCn: '铵磷脂',
    additiveNameEn: 'ammonium phosphatide',
    cnsNumber: '10.033',
    insNumber: '442',
    functionText: '乳化剂',
    pdfPage: 23,
    standardPage: 20,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-ammonium-phosphatide-cocoa-products',
      foodCategoryCode: '05.01.02',
      foodCategoryName: '巧克力和巧克力制品、除 05.01.01 以外的可可制品',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '巴西棕榈蜡',
    additiveNameEn: 'carnauba wax',
    cnsNumber: '14.008',
    insNumber: '903',
    functionText: '被膜剂、抗结剂',
    pdfPage: 23,
    standardPage: 20,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-carnauba-wax-fresh-fruit',
      foodCategoryCode: '04.01.01',
      foodCategoryName: '新鲜水果',
      maxUseLevel: '0.0004',
      unit: 'g/kg',
      note: '以残留量计'
    },
    {
      id: 'gb2760-2024-a1-carnauba-wax-cocoa-chocolate-candy',
      foodCategoryCode: '05.0',
      foodCategoryName: '可可制品、巧克力和巧克力制品（包括代可可脂巧克力及制品）以及糖果',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '白油（又名液体石蜡）',
    additiveNameEn: 'mineral oil, white (liquid paraffin)',
    cnsNumber: '14.003',
    insNumber: '905a',
    functionText: '被膜剂',
    pdfPage: 23,
    standardPage: 20,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-mineral-oil-white-candy-except-gum',
      foodCategoryCode: '05.02.02',
      foodCategoryName: '除胶基糖果以外的其他糖果',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-mineral-oil-white-fresh-eggs',
      foodCategoryCode: '10.01',
      foodCategoryName: '鲜蛋',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '半乳甘露聚糖',
    additiveNameEn: 'galactomannan',
    cnsNumber: '00.014',
    insNumber: '—',
    functionText: '其他',
    pdfPage: 23,
    standardPage: 20,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-galactomannan-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: '苯甲酸及其钠盐（包括苯甲酸，苯甲酸钠）',
    additiveNameEn: 'benzoic acid, sodium benzoate',
    cnsNumber: '17.001, 17.002',
    insNumber: '210, 211',
    functionText: '防腐剂',
    pdfPage: 23,
    standardPage: 20,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'benzoic-acid' },
    { ingredientId: 'sodium-benzoate' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-ice-pops',
      foodCategoryCode: '03.03',
      foodCategoryName: '风味冰、冰棍类',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以苯甲酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱（罐头除外）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以苯甲酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-preserved-fruit',
      foodCategoryCode: '04.01.02.08',
      foodCategoryName: '蜜饯',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以苯甲酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-pickled-vegetable',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以苯甲酸计'
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: '苯甲酸及其钠盐（包括苯甲酸，苯甲酸钠）',
    additiveNameEn: 'benzoic acid, sodium benzoate',
    cnsNumber: '17.001, 17.002',
    insNumber: '210, 211',
    functionText: '防腐剂',
    pdfPage: 24,
    standardPage: 21,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'benzoic-acid' },
    { ingredientId: 'sodium-benzoate' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-chewing-gum',
      foodCategoryCode: '05.02.01',
      foodCategoryName: '胶基糖果',
      maxUseLevel: '1.5',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-candy-except-gum',
      foodCategoryCode: '05.02.02',
      foodCategoryName: '除胶基糖果以外的其他糖果',
      maxUseLevel: '0.8',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-flavored-syrups',
      foodCategoryCode: '11.05',
      foodCategoryName: '调味糖浆',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-vinegar',
      foodCategoryCode: '12.03',
      foodCategoryName: '食醋',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-soy-sauce',
      foodCategoryCode: '12.04',
      foodCategoryName: '酱油',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-fermented-sauce',
      foodCategoryCode: '12.05',
      foodCategoryName: '酿造酱',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-semisolid-compound-seasoning',
      foodCategoryCode: '12.10.02',
      foodCategoryName: '半固体复合调味料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-liquid-compound-seasoning',
      foodCategoryCode: '12.10.03',
      foodCategoryName: '液体复合调味料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-concentrated-juice-industrial',
      foodCategoryCode: '14.02.02',
      foodCategoryName: '浓缩果蔬汁（浆）（仅限食品工业用）',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-fruit-vegetable-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidBeverageNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-protein-beverages',
      foodCategoryCode: '14.03',
      foodCategoryName: '蛋白饮料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidBeverageNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: benzoicAcidBeverageNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-tea-coffee-plant-beverages',
      foodCategoryCode: '14.05',
      foodCategoryName: '茶、咖啡、植物（类）饮料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidBeverageNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-special-purpose-beverages',
      foodCategoryCode: '14.07',
      foodCategoryName: '特殊用途饮料',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: benzoicAcidBeverageNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-flavored-beverages',
      foodCategoryCode: '14.08',
      foodCategoryName: '风味饮料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: benzoicAcidBeverageNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-mixed-alcoholic-beverages',
      foodCategoryCode: '15.02',
      foodCategoryName: '配制酒',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: benzoicAcidNote
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-fruit-wine',
      foodCategoryCode: '15.03.03',
      foodCategoryName: '果酒',
      maxUseLevel: '0.8',
      unit: 'g/kg',
      note: benzoicAcidNote
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '阿拉伯胶',
    additiveNameEn: 'arabic gum',
    cnsNumber: '20.008',
    insNumber: '414',
    functionText: '增稠剂、其他',
    pdfPage: 17,
    standardPage: 14,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-arabic-gum-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~48、50~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '阿力甜（又名 L-α-天冬氨酰-N-(2,2,4,4-四甲基-3-硫化三亚甲基)-D-丙氨酰胺）',
    additiveNameEn: 'alitame',
    cnsNumber: '19.013',
    insNumber: '956',
    functionText: '甜味剂',
    pdfPage: 17,
    standardPage: 14,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-alitame-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-alitame-preserved-plum-products',
      foodCategoryCode: '04.01.02.08.04',
      foodCategoryName: '话化类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-alitame-gum-based-candy',
      foodCategoryCode: '05.02.01',
      foodCategoryName: '胶基糖果',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-alitame-tabletop-sweeteners',
      foodCategoryCode: '11.04',
      foodCategoryName: '餐桌甜味料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-alitame-beverages',
      foodCategoryCode: '14.0',
      foodCategoryName: '饮料类[14.01 包装饮用水、14.02.01 果蔬汁（浆）、14.02.02 浓缩果蔬汁（浆）除外]',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-alitame-jelly',
      foodCategoryCode: '16.01',
      foodCategoryName: '果冻',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '如用于果冻粉，按冲调倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'aspartame',
    additiveNameCn: '阿斯巴甜（又名天门冬酰苯丙氨酸甲酯）',
    additiveNameEn: 'aspartame',
    cnsNumber: '19.004',
    insNumber: '951',
    functionText: '甜味剂',
    pdfPage: 17,
    standardPage: 14,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-aspartame-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-modified-milk-powder',
      foodCategoryCode: '01.03.02',
      foodCategoryName: '调制乳粉和调制奶油粉',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-cream-products',
      foodCategoryCode: '01.05',
      foodCategoryName: '稀奶油（淡奶油）及其类似品（01.05.01 稀奶油除外）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'aspartame',
    additiveNameCn: '阿斯巴甜（又名天门冬酰苯丙氨酸甲酯）',
    additiveNameEn: 'aspartame',
    cnsNumber: '19.004',
    insNumber: '951',
    functionText: '甜味剂',
    pdfPage: 18,
    standardPage: 15,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-aspartame-unripened-cheese',
      foodCategoryCode: '01.06.01',
      foodCategoryName: '非熟化干酪',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-cheese-analogs',
      foodCategoryCode: '01.06.05',
      foodCategoryName: '干酪类似品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-milk-flavored-ready-foods',
      foodCategoryCode: '01.07',
      foodCategoryName: '以乳为主要配料的即食风味食品或其预制产品（不包括冰淇淋和风味发酵乳）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-fat-emulsions',
      foodCategoryCode: '02.03',
      foodCategoryName: '02.02 类以外的脂肪乳化制品，包括混合的和（或）调味的脂肪乳化制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-fat-desserts',
      foodCategoryCode: '02.04',
      foodCategoryName: '脂肪类甜品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-frozen-fruit',
      foodCategoryCode: '04.01.02.01',
      foodCategoryName: '冷冻水果',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-dried-fruit',
      foodCategoryCode: '04.01.02.02',
      foodCategoryName: '水果干类',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-pickled-fruit',
      foodCategoryCode: '04.01.02.03',
      foodCategoryName: '醋、油或盐渍水果',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-canned-fruit',
      foodCategoryCode: '04.01.02.04',
      foodCategoryName: '水果罐头',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-fruit-puree',
      foodCategoryCode: '04.01.02.06',
      foodCategoryName: '果泥',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-other-jam',
      foodCategoryCode: '04.01.02.07',
      foodCategoryName: '除 04.01.02.05 以外的果酱（如印度酸辣酱）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-preserved-fruit',
      foodCategoryCode: '04.01.02.08',
      foodCategoryName: '蜜饯',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-decorative-fruit-vegetable',
      foodCategoryCode: '04.01.02.09',
      foodCategoryName: '装饰性果蔬',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-fruit-desserts',
      foodCategoryCode: '04.01.02.10',
      foodCategoryName: '水果甜品，包括果味液体甜品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-fermented-fruit',
      foodCategoryCode: '04.01.02.11',
      foodCategoryName: '发酵的水果制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-cooked-fried-fruit',
      foodCategoryCode: '04.01.02.12',
      foodCategoryName: '煮熟的或油炸的水果',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-frozen-vegetables',
      foodCategoryCode: '04.02.02.01',
      foodCategoryName: '冷冻蔬菜',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-dried-vegetables',
      foodCategoryCode: '04.02.02.02',
      foodCategoryName: '干制蔬菜',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-pickled-vegetables',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-canned-vegetables',
      foodCategoryCode: '04.02.02.04',
      foodCategoryName: '蔬菜罐头',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-vegetable-puree',
      foodCategoryCode: '04.02.02.05',
      foodCategoryName: '蔬菜泥（酱），番茄沙司除外',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-fermented-vegetables',
      foodCategoryCode: '04.02.02.06',
      foodCategoryName: '发酵蔬菜制品',
      maxUseLevel: '2.5',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-cooked-fried-vegetables',
      foodCategoryCode: '04.02.02.07',
      foodCategoryName: '经水煮或油炸的蔬菜',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-other-processed-vegetables',
      foodCategoryCode: '04.02.02.08',
      foodCategoryName: '其他加工蔬菜',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'aspartame',
    additiveNameCn: '阿斯巴甜（又名天门冬酰苯丙氨酸甲酯）',
    additiveNameEn: 'aspartame',
    cnsNumber: '19.004',
    insNumber: '951',
    functionText: '甜味剂',
    pdfPage: 19,
    standardPage: 16,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-aspartame-pickled-fungi-algae',
      foodCategoryCode: '04.03.02.03',
      foodCategoryName: '腌渍的食用菌和藻类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-canned-fungi-algae',
      foodCategoryCode: '04.03.02.04',
      foodCategoryName: '食用菌和藻类罐头',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-cooked-fried-algae',
      foodCategoryCode: '04.03.02.05',
      foodCategoryName: '经水煮或油炸的藻类',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-other-processed-fungi-algae',
      foodCategoryCode: '04.03.02.06',
      foodCategoryName: '其他加工食用菌和藻类',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-processed-nuts-seeds',
      foodCategoryCode: '04.05.02',
      foodCategoryName: '加工坚果与籽类',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-cocoa-chocolate',
      foodCategoryCode: '05.01',
      foodCategoryName: '可可制品、巧克力和巧克力制品，包括代可可脂巧克力及制品',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-chewing-gum',
      foodCategoryCode: '05.02.01',
      foodCategoryName: '胶基糖果',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-candy-except-gum',
      foodCategoryCode: '05.02.02',
      foodCategoryName: '除胶基糖果以外的其他糖果',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-decorative-candy',
      foodCategoryCode: '05.04',
      foodCategoryName: '装饰糖果（如工艺造型，或用于蛋糕装饰）、顶饰（非水果材料）和甜汁',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-ready-to-eat-cereals',
      foodCategoryCode: '06.06',
      foodCategoryName: '即食谷物，包括碾轧燕麦（片）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-cereal-starch-desserts',
      foodCategoryCode: '06.09',
      foodCategoryName: '谷类和淀粉类甜品（如米布丁、木薯布丁）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-bread',
      foodCategoryCode: '07.01',
      foodCategoryName: '面包',
      maxUseLevel: '4.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-pastries',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '1.7',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-biscuits',
      foodCategoryCode: '07.03',
      foodCategoryName: '饼干',
      maxUseLevel: '1.7',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-bakery-fillings',
      foodCategoryCode: '07.04',
      foodCategoryName: '焙烤食品馅料及表面用挂浆',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-other-bakery',
      foodCategoryCode: '07.05',
      foodCategoryName: '其他焙烤食品',
      maxUseLevel: '1.7',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-frozen-battered-aquatic',
      foodCategoryCode: '09.02.02',
      foodCategoryName: '冷冻挂浆制品',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-frozen-surimi',
      foodCategoryCode: '09.02.03',
      foodCategoryName: '冷冻水产糜及其制品（包括冷冻丸类产品等）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-prepared-aquatic',
      foodCategoryCode: '09.03',
      foodCategoryName: '预制水产品（半成品）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-cooked-aquatic',
      foodCategoryCode: '09.04',
      foodCategoryName: '熟制水产品（可直接食用）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-canned-aquatic',
      foodCategoryCode: '09.05',
      foodCategoryName: '水产品罐头',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-other-egg-products',
      foodCategoryCode: '10.04',
      foodCategoryName: '其他蛋制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-tabletop-sweeteners',
      foodCategoryCode: '11.04',
      foodCategoryName: '餐桌甜味料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-flavored-syrups',
      foodCategoryCode: '11.05',
      foodCategoryName: '调味糖浆',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-vinegar',
      foodCategoryCode: '12.03',
      foodCategoryName: '食醋',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-solid-compound-seasoning',
      foodCategoryCode: '12.10.01',
      foodCategoryName: '固体复合调味料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: aspartameFootnote
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'aspartame',
    additiveNameCn: '阿斯巴甜（又名天门冬酰苯丙氨酸甲酯）',
    additiveNameEn: 'aspartame',
    cnsNumber: '19.004',
    insNumber: '951',
    functionText: '甜味剂',
    pdfPage: 20,
    standardPage: 17,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-aspartame-semisolid-compound-seasoning',
      foodCategoryCode: '12.10.02',
      foodCategoryName: '半固体复合调味料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-liquid-compound-seasoning',
      foodCategoryCode: '12.10.03',
      foodCategoryName: '液体复合调味料',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: aspartameFootnote
    },
    {
      id: 'gb2760-2024-a1-aspartame-fruit-vegetable-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: aspartameBeverageNote
    },
    {
      id: 'gb2760-2024-a1-aspartame-protein-beverages',
      foodCategoryCode: '14.03',
      foodCategoryName: '蛋白饮料',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: aspartameBeverageNote
    },
    {
      id: 'gb2760-2024-a1-aspartame-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: aspartameBeverageNote
    },
    {
      id: 'gb2760-2024-a1-aspartame-tea-coffee-plant-beverages',
      foodCategoryCode: '14.05',
      foodCategoryName: '茶、咖啡、植物（类）饮料',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: aspartameBeverageNote
    },
    {
      id: 'gb2760-2024-a1-aspartame-special-purpose-beverages',
      foodCategoryCode: '14.07',
      foodCategoryName: '特殊用途饮料',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: aspartameBeverageNote
    },
    {
      id: 'gb2760-2024-a1-aspartame-flavored-beverages',
      foodCategoryCode: '14.08',
      foodCategoryName: '风味饮料',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: aspartameBeverageNote
    },
    {
      id: 'gb2760-2024-a1-aspartame-jelly',
      foodCategoryCode: '16.01',
      foodCategoryName: '果冻',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: aspartameJellyNote
    },
    {
      id: 'gb2760-2024-a1-aspartame-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: aspartameFootnote
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '爱德万甜（又名 N-{N-[3-(3-羟基-4-甲氧基苯基)丙基]-L-α-天冬氨酰}-L-苯丙氨酸-1-甲酯）',
    additiveNameEn: 'advantame',
    cnsNumber: '19.026',
    insNumber: '969',
    functionText: '甜味剂',
    pdfPage: 20,
    standardPage: 17,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-advantame-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '0.006',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.0005',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-processed-fruit',
      foodCategoryCode: '04.01.02',
      foodCategoryName: '加工水果',
      maxUseLevel: '0.12',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-cocoa-chocolate-candy',
      foodCategoryCode: '05.0',
      foodCategoryName: '可可制品、巧克力和巧克力制品（包括代可可脂巧克力及制品）以及糖果',
      maxUseLevel: '0.0005',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-egg-products',
      foodCategoryCode: '10.03',
      foodCategoryName: '蛋制品（改变其物理性状）[10.03.01 脱水蛋制品（如蛋白粉、蛋黄粉、蛋白片）、10.03.03 蛋液与液态蛋除外]',
      maxUseLevel: '0.0004',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-tabletop-sweeteners',
      foodCategoryCode: '11.04',
      foodCategoryName: '餐桌甜味料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-flavored-syrups',
      foodCategoryCode: '11.05',
      foodCategoryName: '调味糖浆',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '爱德万甜（又名 N-{N-[3-(3-羟基-4-甲氧基苯基)丙基]-L-α-天冬氨酰}-L-苯丙氨酸-1-甲酯）',
    additiveNameEn: 'advantame',
    cnsNumber: '19.026',
    insNumber: '969',
    functionText: '甜味剂',
    pdfPage: 21,
    standardPage: 18,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-advantame-other-sweeteners',
      foodCategoryCode: '11.06',
      foodCategoryName: '其他甜味料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '0.0005',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '0.006',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-tea-coffee-plant-beverages',
      foodCategoryCode: '14.05',
      foodCategoryName: '茶、咖啡、植物（类）饮料',
      maxUseLevel: '0.003',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-solid-beverages',
      foodCategoryCode: '14.06',
      foodCategoryName: '固体饮料',
      maxUseLevel: '0.004',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-advantame-jelly',
      foodCategoryCode: '16.01',
      foodCategoryName: '果冻',
      maxUseLevel: '0.0004',
      unit: 'g/kg',
      note: '如用于果冻粉，按冲调倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'tartrazine',
    additiveNameCn: '柠檬黄及其铝色淀（包括柠檬黄，柠檬黄铝色淀）',
    additiveNameEn: 'tartrazine, tartrazine aluminum lake',
    cnsNumber: '08.005',
    insNumber: '102',
    functionText: '着色剂',
    pdfPage: 87,
    standardPage: 84,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-tartrazine-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以柠檬黄计'
    },
    {
      id: 'gb2760-2024-a1-tartrazine-condensed-milk',
      foodCategoryCode: '01.04.02',
      foodCategoryName: '调制炼乳（包括加糖炼乳及使用了非乳原料的调制炼乳等）',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以柠檬黄计'
    },
    {
      id: 'gb2760-2024-a1-tartrazine-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以柠檬黄计'
    },
    {
      id: 'gb2760-2024-a1-tartrazine-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以柠檬黄计'
    },
    {
      id: 'gb2760-2024-a1-tartrazine-preserved-fruit',
      foodCategoryCode: '04.01.02.08',
      foodCategoryName: '蜜饯',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以柠檬黄计'
    },
    {
      id: 'gb2760-2024-a1-tartrazine-decorative-fruit-vegetable',
      foodCategoryCode: '04.01.02.09',
      foodCategoryName: '装饰性果蔬',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以柠檬黄计'
    },
    {
      id: 'gb2760-2024-a1-tartrazine-pickled-vegetable',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以柠檬黄计'
    },
    {
      id: 'gb2760-2024-a1-tartrazine-pickled-mushroom-algae',
      foodCategoryCode: '04.03.02.03',
      foodCategoryName: '腌渍的食用菌和藻类',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以柠檬黄计'
    },
    {
      id: 'gb2760-2024-a1-tartrazine-cooked-beans',
      foodCategoryCode: '04.04.01.06',
      foodCategoryName: '熟制豆类',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以柠檬黄计'
    },
    {
      id: 'gb2760-2024-a1-tartrazine-processed-nuts-seeds',
      foodCategoryCode: '04.05.02',
      foodCategoryName: '加工坚果与籽类',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以柠檬黄计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'acesulfame-potassium',
    additiveNameCn: '安赛蜜（又名乙酰磺胺酸钾）',
    additiveNameEn: 'acesulfame potassium',
    cnsNumber: '19.011',
    insNumber: '950',
    functionText: '甜味剂',
    pdfPage: 22,
    standardPage: 19,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-ready-to-eat-cereals',
      foodCategoryCode: '06.06',
      foodCategoryName: '即食谷物，包括碾轧燕麦（片）',
      maxUseLevel: '0.8',
      unit: 'g/kg',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-cereal-dessert-canned',
      foodCategoryCode: '06.09',
      foodCategoryName: '谷类和淀粉类甜品（仅限谷类甜品罐头）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-bakery',
      foodCategoryCode: '07.0',
      foodCategoryName: '焙烤食品',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-pastries',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-biscuits',
      foodCategoryCode: '07.03',
      foodCategoryName: '饼干',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-tabletop-sweeteners',
      foodCategoryCode: '11.04',
      foodCategoryName: '餐桌甜味料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-condiments',
      foodCategoryCode: '12.0',
      foodCategoryName: '调味品（12.01 盐及代盐制品、12.09 香辛料类除外）',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-soy-sauce',
      foodCategoryCode: '12.04',
      foodCategoryName: '酱油',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-liquid-compound-seasoning',
      foodCategoryCode: '12.10.03',
      foodCategoryName: '液体复合调味料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-beverages',
      foodCategoryCode: '14.0',
      foodCategoryName: '饮料类[14.01 包装饮用水、14.02.01 果蔬汁（浆）、14.02.02 浓缩果蔬汁（浆）除外]',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: acesulfameBeverageNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-tea-beverages',
      foodCategoryCode: '14.05.01',
      foodCategoryName: '茶（类）饮料',
      maxUseLevel: '0.58',
      unit: 'g/kg',
      note: acesulfameBeverageNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-mixed-alcoholic-beverages',
      foodCategoryCode: '15.02',
      foodCategoryName: '配制酒',
      maxUseLevel: '0.35',
      unit: 'g/kg',
      note: acesulfameMixNote
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-jelly',
      foodCategoryCode: '16.01',
      foodCategoryName: '果冻',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: acesulfameJellyNote
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '氨基乙酸（又名甘氨酸）',
    additiveNameEn: 'glycine',
    cnsNumber: '12.007',
    insNumber: '640',
    functionText: '增味剂',
    pdfPage: 22,
    standardPage: 19,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-glycine-prepared-meat',
      foodCategoryCode: '08.02',
      foodCategoryName: '预制肉制品',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: '包括氨基乙酸（羟基乙腈法）'
    },
    {
      id: 'gb2760-2024-a1-glycine-cooked-meat',
      foodCategoryCode: '08.03',
      foodCategoryName: '熟肉制品',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: '包括氨基乙酸（羟基乙腈法）'
    },
    {
      id: 'gb2760-2024-a1-glycine-condiments',
      foodCategoryCode: '12.0',
      foodCategoryName: '调味品（12.01 盐及代盐制品、12.09 香辛料类除外）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '包括氨基乙酸（羟基乙腈法）'
    },
    {
      id: 'gb2760-2024-a1-glycine-fruit-vegetable-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '包括氨基乙酸（羟基乙腈法）；以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-glycine-plant-protein-beverages',
      foodCategoryCode: '14.03.02',
      foodCategoryName: '植物蛋白饮料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '包括氨基乙酸（羟基乙腈法）；以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: '山梨酸及其钾盐（包括山梨酸，山梨酸钾）',
    additiveNameEn: 'sorbic acid, potassium sorbate',
    cnsNumber: '17.003, 17.004',
    insNumber: '200, 202',
    functionText: '防腐剂、抗氧化剂',
    pdfPage: 103,
    standardPage: 100,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'sorbic-acid' },
    { ingredientId: 'potassium-sorbate' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-cheese-products',
      foodCategoryCode: '01.06',
      foodCategoryName: '干酪、再制干酪、干酪制品及干酪类似品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以山梨酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-hydrogenated-oil',
      foodCategoryCode: '02.01.01.02',
      foodCategoryName: '氢化植物油',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以山梨酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-margarine-products',
      foodCategoryCode: '02.02.01.02',
      foodCategoryName: '人造黄油（人造奶油）及其类似制品（如黄油和人造黄油混合品）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以山梨酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-fat-emulsion-under-80',
      foodCategoryCode: '02.02.02',
      foodCategoryName: '脂肪含量 80% 以下的乳化制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以山梨酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-ice-pops',
      foodCategoryCode: '03.03',
      foodCategoryName: '风味冰、冰棍类',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以山梨酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-surface-treated-fresh-fruit',
      foodCategoryCode: '04.01.01.02',
      foodCategoryName: '经表面处理的鲜水果',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以山梨酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱（罐头除外）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以山梨酸计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'acesulfame-potassium',
    additiveNameCn: '安赛蜜（又名乙酰磺胺酸钾）',
    additiveNameEn: 'acesulfame potassium',
    cnsNumber: '19.011',
    insNumber: '950',
    functionText: '甜味剂',
    pdfPage: 21,
    standardPage: 18,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '0.35',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-milk-based-dessert-canned',
      foodCategoryCode: '01.07',
      foodCategoryName: '以乳为主要配料的即食风味食品或其预制产品（不包括冰淇淋和风味发酵乳，仅限乳基甜品罐头）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-canned-fruit',
      foodCategoryCode: '04.01.02.04',
      foodCategoryName: '水果罐头',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-candied-fruit',
      foodCategoryCode: '04.01.02.08.01',
      foodCategoryName: '蜜饯类、凉果类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-pickled-vegetable',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-processed-mushroom-algae',
      foodCategoryCode: '04.03.02',
      foodCategoryName: '加工食用菌和藻类（04.03.02.01 冷冻食用菌和藻类除外）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-dried-tofu',
      foodCategoryCode: '04.04.01.02',
      foodCategoryName: '豆干类',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-cooked-nuts-seeds',
      foodCategoryCode: '04.05.02.01',
      foodCategoryName: '熟制坚果与籽类',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-candy',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-chewing-gum',
      foodCategoryCode: '05.02.01',
      foodCategoryName: '胶基糖果',
      maxUseLevel: '4.0',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-canned-grains',
      foodCategoryCode: '06.04.02.01',
      foodCategoryName: '杂粮罐头',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    },
    {
      id: 'gb2760-2024-a1-acesulfame-potassium-black-sesame-paste',
      foodCategoryCode: '06.04.02.02',
      foodCategoryName: '其他杂粮制品（仅限黑芝麻糊）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '混合使用时最大使用量不能超过标准规定的安赛蜜最大使用量'
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: '二氧化硫及亚硫酸盐（包括二氧化硫，焦亚硫酸钾，焦亚硫酸钠，亚硫酸钠，亚硫酸氢钠，低亚硫酸钠）',
    additiveNameEn: 'sulfur dioxide, potassium metabisulphite, sodium metabisulphite, sodium sulfite, sodium hydrogen sulfite, sodium hyposulfite',
    cnsNumber: '05.001, 05.002, 05.003, 05.004, 05.005, 05.006',
    insNumber: '220, 224, 223, 221, 222, —',
    functionText: '漂白剂、防腐剂、抗氧化剂',
    pdfPage: 36,
    standardPage: 33,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'sulfur-dioxide' },
    { ingredientId: 'potassium-metabisulfite' },
    { ingredientId: 'sodium-metabisulfite' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-surface-treated-fresh-fruit',
      foodCategoryCode: '04.01.01.02',
      foodCategoryName: '经表面处理的鲜水果',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '最大使用量以二氧化硫残留量计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-dried-fruit',
      foodCategoryCode: '04.01.02.02',
      foodCategoryName: '水果干类',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '最大使用量以二氧化硫残留量计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '最大使用量以二氧化硫残留量计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-preserved-fruit',
      foodCategoryCode: '04.01.02.08',
      foodCategoryName: '蜜饯',
      maxUseLevel: '0.35',
      unit: 'g/kg',
      note: '最大使用量以二氧化硫残留量计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'monosodium-glutamate',
    additiveNameCn: '谷氨酸钠',
    additiveNameEn: 'monosodium glutamate',
    cnsNumber: '12.001',
    insNumber: '621',
    functionText: '增味剂',
    pdfPage: 44,
    standardPage: 41,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-monosodium-glutamate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'ascorbic-acid',
    additiveNameCn: '抗坏血酸（又名维生素 C）',
    additiveNameEn: 'ascorbic acid (vitamin C)',
    cnsNumber: '04.014',
    insNumber: '300',
    functionText: '面粉处理剂、抗氧化剂',
    pdfPage: 65,
    standardPage: 62,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-ascorbic-acid-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~5、10~62、68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-ascorbic-acid-peeled-cut-fruit',
      foodCategoryCode: '04.01.01.03',
      foodCategoryName: '去皮或预切的鲜水果',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-ascorbic-acid-peeled-cut-vegetable',
      foodCategoryCode: '04.02.01.03',
      foodCategoryName: '去皮、切块或切丝的蔬菜',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-ascorbic-acid-wheat-flour',
      foodCategoryCode: '06.03.01',
      foodCategoryName: '小麦粉',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-ascorbic-acid-fruit-vegetable-juice',
      foodCategoryCode: '14.02.01',
      foodCategoryName: '果蔬汁（浆）',
      maxUseLevel: '1.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sodium-ascorbate',
    additiveNameCn: '抗坏血酸钠',
    additiveNameEn: 'sodium ascorbate',
    cnsNumber: '04.015',
    insNumber: '301',
    functionText: '抗氧化剂',
    pdfPage: 66,
    standardPage: 63,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sodium-ascorbate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~62、68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sunset-yellow-fcf',
    additiveNameCn: '日落黄及其铝色淀（包括日落黄，日落黄铝色淀）',
    additiveNameEn: 'sunset yellow, sunset yellow aluminum lake',
    cnsNumber: '08.006',
    insNumber: '110',
    functionText: '着色剂',
    pdfPage: 96,
    standardPage: 93,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以日落黄计'
    },
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以日落黄计'
    },
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-condensed-milk',
      foodCategoryCode: '01.04.02',
      foodCategoryName: '调制炼乳（包括加糖炼乳及使用了非乳原料的调制炼乳等）',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以日落黄计'
    },
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.09',
      unit: 'g/kg',
      note: '以日落黄计'
    },
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-watermelon-sauce',
      foodCategoryCode: '04.01.02.04',
      foodCategoryName: '水果罐头（仅限西瓜酱罐头）',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以日落黄计'
    },
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以日落黄计'
    },
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-preserved-fruit',
      foodCategoryCode: '04.01.02.08',
      foodCategoryName: '蜜饯',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以日落黄计'
    },
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-decorative-fruit-vegetable',
      foodCategoryCode: '04.01.02.09',
      foodCategoryName: '装饰性果蔬',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以日落黄计'
    },
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-cooked-beans',
      foodCategoryCode: '04.04.01.06',
      foodCategoryName: '熟制豆类',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以日落黄计'
    },
    {
      id: 'gb2760-2024-a1-sunset-yellow-fcf-processed-nuts-seeds',
      foodCategoryCode: '04.05.02',
      foodCategoryName: '加工坚果与籽类',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以日落黄计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'allura-red-ac',
    additiveNameCn: '诱惑红及其铝色淀（包括诱惑红，诱惑红铝色淀）',
    additiveNameEn: 'allura red, allura aluminum lake',
    cnsNumber: '08.012',
    insNumber: '129',
    functionText: '着色剂',
    pdfPage: 139,
    standardPage: 136,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-allura-red-ac-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.07',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-decorative-fruit-vegetable',
      foodCategoryCode: '04.01.02.09',
      foodCategoryName: '装饰性果蔬',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-cooked-beans',
      foodCategoryCode: '04.04.01.06',
      foodCategoryName: '熟制豆类',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-processed-nuts-seeds',
      foodCategoryCode: '04.05.02',
      foodCategoryName: '加工坚果与籽类',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-cocoa-chocolate-candy',
      foodCategoryCode: '05.0',
      foodCategoryName: '可可制品、巧克力和巧克力制品（包括代可可脂巧克力及制品）以及糖果',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-tapioca-pearls',
      foodCategoryCode: '06.05.02.04',
      foodCategoryName: '粉圆',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-ready-to-eat-cereal',
      foodCategoryCode: '06.06',
      foodCategoryName: '即食谷物，包括碾轧燕麦（片）（仅限可可玉米片）',
      maxUseLevel: '0.07',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-pastry-decoration',
      foodCategoryCode: '07.02.04',
      foodCategoryName: '糕点上彩装',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-bakery-filling',
      foodCategoryCode: '07.04',
      foodCategoryName: '焙烤食品馅料及表面用挂浆（仅限饼干夹心）',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-western-ham',
      foodCategoryCode: '08.03.04',
      foodCategoryName: '西式火腿（熏烤、烟熏、蒸煮火腿）类',
      maxUseLevel: '0.025',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-meat-sausage',
      foodCategoryCode: '08.03.05',
      foodCategoryName: '肉灌肠类',
      maxUseLevel: '0.015',
      unit: 'g/kg',
      note: '以诱惑红计'
    },
    {
      id: 'gb2760-2024-a1-allura-red-ac-edible-casing',
      foodCategoryCode: '08.04',
      foodCategoryName: '肉制品的可食用动物肠衣类',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以诱惑红计'
    }
  ]),
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
  ]),
  ...officialUsageRows({
    ingredientId: 'sucralose',
    additiveNameCn: '三氯蔗糖（又名蔗糖素）',
    additiveNameEn: 'sucralose',
    cnsNumber: '19.016',
    insNumber: '955',
    functionText: '甜味剂',
    pdfPage: 100,
    standardPage: 97,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sucralose-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-modified-milk-powder',
      foodCategoryCode: '01.03.02',
      foodCategoryName: '调制乳粉和调制奶油粉',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sucralose',
    additiveNameCn: '三氯蔗糖（又名蔗糖素）',
    additiveNameEn: 'sucralose',
    cnsNumber: '19.016',
    insNumber: '955',
    functionText: '甜味剂',
    pdfPage: 101,
    standardPage: 98,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sucralose-processed-cheese',
      foodCategoryCode: '01.06.04',
      foodCategoryName: '再制干酪及干酪制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-dried-fruit',
      foodCategoryCode: '04.01.02.02',
      foodCategoryName: '水果干类',
      maxUseLevel: '0.15',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-canned-fruit',
      foodCategoryCode: '04.01.02.04',
      foodCategoryName: '水果罐头',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.45',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-preserved-fruit',
      foodCategoryCode: '04.01.02.08',
      foodCategoryName: '蜜饯',
      maxUseLevel: '1.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-cooked-fried-fruit',
      foodCategoryCode: '04.01.02.12',
      foodCategoryName: '煮熟的或油炸的水果',
      maxUseLevel: '0.15',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-pickled-vegetable',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-processed-mushroom-algae',
      foodCategoryCode: '04.03.02',
      foodCategoryName: '加工食用菌和藻类（04.03.02.01 冷冻食用菌和藻类除外）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-new-soy-protein-product',
      foodCategoryCode: '04.04.01.05',
      foodCategoryName: '新型豆制品（大豆蛋白及其膨化食品、大豆素肉等）',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-fermented-bean-curd',
      foodCategoryCode: '04.04.02.01',
      foodCategoryName: '腐乳类',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-processed-nuts-seeds',
      foodCategoryCode: '04.05.02',
      foodCategoryName: '加工坚果与籽类',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-candy',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '1.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-canned-grains',
      foodCategoryCode: '06.04.02.01',
      foodCategoryName: '杂粮罐头',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-microwave-popcorn',
      foodCategoryCode: '06.04.02.02',
      foodCategoryName: '其他杂粮制品（仅限微波爆米花）',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-ready-to-eat-cereal',
      foodCategoryCode: '06.06',
      foodCategoryName: '即食谷物，包括碾轧燕麦（片）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-instant-rice-noodle',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-bakery',
      foodCategoryCode: '07.0',
      foodCategoryName: '焙烤食品',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-meat-sausage',
      foodCategoryCode: '08.03.05',
      foodCategoryName: '肉灌肠类',
      maxUseLevel: '0.35',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-tabletop-sweeteners',
      foodCategoryCode: '11.04',
      foodCategoryName: '餐桌甜味料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-vinegar',
      foodCategoryCode: '12.03',
      foodCategoryName: '食醋',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-soy-sauce',
      foodCategoryCode: '12.04',
      foodCategoryName: '酱油',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-fermented-sauce',
      foodCategoryCode: '12.05',
      foodCategoryName: '酿造酱',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-spice-sauce',
      foodCategoryCode: '12.09.03',
      foodCategoryName: '香辛料酱（如芥末酱、青芥酱）',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-mayonnaise-salad-dressing',
      foodCategoryCode: '12.10.02.01',
      foodCategoryName: '蛋黄酱、沙拉酱',
      maxUseLevel: '1.25',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sucralose',
    additiveNameCn: '三氯蔗糖（又名蔗糖素）',
    additiveNameEn: 'sucralose',
    cnsNumber: '19.016',
    insNumber: '955',
    functionText: '甜味剂',
    pdfPage: 102,
    standardPage: 99,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sucralose-beverages',
      foodCategoryCode: '14.0',
      foodCategoryName: '饮料类（14.01 包装饮用水、14.02.01 果蔬汁（浆）、14.02.02 浓缩果蔬汁（浆）除外）',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-sucralose-prepared-wine',
      foodCategoryCode: '15.02',
      foodCategoryName: '配制酒',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-fermented-wine',
      foodCategoryCode: '15.03',
      foodCategoryName: '发酵酒（15.03.01 葡萄酒除外）',
      maxUseLevel: '0.65',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sucralose-jelly',
      foodCategoryCode: '16.01',
      foodCategoryName: '果冻',
      maxUseLevel: '0.45',
      unit: 'g/kg',
      note: '如用于果冻粉，按冲调倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '4-己基间苯二酚',
    additiveNameEn: '4-hexylresorcinol',
    cnsNumber: '04.013',
    insNumber: '586',
    functionText: '抗氧化剂',
    pdfPage: 8,
    standardPage: 5,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-4-hexylresorcinol-fresh-aquatic-shrimp',
      foodCategoryCode: '09.01',
      foodCategoryName: '鲜水产（仅限虾类）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: '残留量 ≤1 mg/kg'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'disodium-ribonucleotides',
    additiveNameCn: "5'-呈味核苷酸二钠（又名呈味核苷酸二钠）",
    additiveNameEn: "disodium 5'-ribonucleotide",
    cnsNumber: '12.004',
    insNumber: '635',
    functionText: '增味剂',
    pdfPage: 8,
    standardPage: 5,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-disodium-ribonucleotides-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: "5'-肌苷酸二钠",
    additiveNameEn: "disodium 5'-inosinate",
    cnsNumber: '12.003',
    insNumber: '631',
    functionText: '增味剂',
    pdfPage: 8,
    standardPage: 5,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-disodium-inosinate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: "5'-鸟苷酸二钠",
    additiveNameEn: "disodium 5'-guanylate",
    cnsNumber: '12.002',
    insNumber: '627',
    functionText: '增味剂',
    pdfPage: 8,
    standardPage: 5,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-disodium-guanylate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'D-甘露糖醇',
    additiveNameEn: 'D-mannitol',
    cnsNumber: '19.017',
    insNumber: '421',
    functionText: '甜味剂、乳化剂、膨松剂、稳定剂、增稠剂',
    pdfPage: 8,
    standardPage: 5,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-d-mannitol-candy',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: 'D-异抗坏血酸及其钠盐（包括 D-异抗坏血酸，D-异抗坏血酸钠）',
    additiveNameEn: 'D-isoascorbic acid (erythorbic acid), sodium D-isoascorbate',
    cnsNumber: '04.004, 04.018',
    insNumber: '315, 316',
    functionText: '抗氧化剂、护色剂',
    pdfPage: 9,
    standardPage: 6,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'erythorbic-acid' },
    { ingredientId: 'sodium-erythorbate' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~62、64~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-wine',
      foodCategoryCode: '15.03.01',
      foodCategoryName: '葡萄酒',
      maxUseLevel: '0.15',
      unit: 'g/kg',
      note: '以抗坏血酸计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'malic-acid',
    additiveNameCn: 'DL-苹果酸',
    additiveNameEn: 'DL-malic acid',
    cnsNumber: '01.309',
    insNumber: '296',
    functionText: '酸度调节剂',
    pdfPage: 9,
    standardPage: 6,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-malic-acid-dl-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'DL-苹果酸钠',
    additiveNameEn: 'sodium DL-malate',
    cnsNumber: '01.314',
    insNumber: '350(ii)',
    functionText: '酸度调节剂',
    pdfPage: 9,
    standardPage: 6,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sodium-dl-malate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'L-半胱氨酸盐酸盐',
    additiveNameEn: 'L-cysteine hydrochloride',
    cnsNumber: '13.003',
    insNumber: '920',
    functionText: '面粉处理剂',
    pdfPage: 9,
    standardPage: 6,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-l-cysteine-hydrochloride-wet-noodles-ramen',
      foodCategoryCode: '06.03.02.01',
      foodCategoryName: '生湿面制品（如面条、饺子皮、馄饨皮、烧麦皮）（仅限拉面）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-l-cysteine-hydrochloride-fermented-flour-products',
      foodCategoryCode: '06.03.02.03',
      foodCategoryName: '发酵面制品',
      maxUseLevel: '0.06',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-l-cysteine-hydrochloride-frozen-rice-flour-products',
      foodCategoryCode: '06.08',
      foodCategoryName: '冷冻米面制品',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'L-丙氨酸',
    additiveNameEn: 'L-alanine',
    cnsNumber: '12.006',
    insNumber: '—',
    functionText: '增味剂',
    pdfPage: 9,
    standardPage: 6,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-l-alanine-condiments',
      foodCategoryCode: '12.0',
      foodCategoryName: '调味品（12.01 盐及代盐制品、12.09 香辛料类除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'L(+)-酒石酸，dl-酒石酸',
    additiveNameEn: 'L(+)-tartaric acid, dl-tartaric acid',
    cnsNumber: '01.111, 01.313',
    insNumber: '334, —',
    functionText: '酸度调节剂',
    pdfPage: 10,
    standardPage: 7,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-tartaric-acids-pickled-vegetables',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: '以酒石酸计'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-candy',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '30.0',
      unit: 'g/kg',
      note: '以酒石酸计'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-fried-flour-products',
      foodCategoryCode: '06.03.02.05',
      foodCategoryName: '油炸面制品',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: '以酒石酸计'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-vermicelli',
      foodCategoryCode: '06.05.02.01',
      foodCategoryName: '粉丝、粉条',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: '以酒石酸计'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-batter-breading-frying-powder',
      foodCategoryCode: '06.11',
      foodCategoryName: '面糊（如用于鱼和禽肉的拖面糊）、裹粉、煎炸粉',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: '以酒石酸计'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-solid-compound-seasoning',
      foodCategoryCode: '12.10.01',
      foodCategoryName: '固体复合调味料',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: '以酒石酸计'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '以酒石酸计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-plant-protein-beverages',
      foodCategoryCode: '14.03.02',
      foodCategoryName: '植物蛋白饮料',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '以酒石酸计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-compound-protein-beverages',
      foodCategoryCode: '14.03.03',
      foodCategoryName: '复合蛋白饮料',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '以酒石酸计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '以酒石酸计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-tea-coffee-plant-beverages',
      foodCategoryCode: '14.05',
      foodCategoryName: '茶、咖啡、植物（类）饮料',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '以酒石酸计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-special-purpose-beverages',
      foodCategoryCode: '14.07',
      foodCategoryName: '特殊用途饮料',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '以酒石酸计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-flavored-beverages',
      foodCategoryCode: '14.08',
      foodCategoryName: '风味饮料',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '以酒石酸计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-tartaric-acids-wine',
      foodCategoryCode: '15.03.01',
      foodCategoryName: '葡萄酒',
      maxUseLevel: '4.0',
      unit: 'g/L',
      note: '以酒石酸计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'malic-acid',
    additiveNameCn: 'L-苹果酸',
    additiveNameEn: 'L-malic acid',
    cnsNumber: '01.104',
    insNumber: '—',
    functionText: '酸度调节剂',
    pdfPage: 11,
    standardPage: 8,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-malic-acid-l-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'L-苹果酸钠',
    additiveNameEn: 'L-(-)-malic acid disodium salt',
    cnsNumber: '01.315',
    insNumber: '—',
    functionText: '酸度调节剂',
    pdfPage: 11,
    standardPage: 8,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sodium-l-malate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'α-环状糊精',
    additiveNameEn: 'alpha-cyclodextrin',
    cnsNumber: '18.011',
    insNumber: '457',
    functionText: '稳定剂、增稠剂',
    pdfPage: 11,
    standardPage: 8,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-alpha-cyclodextrin-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'β-环状糊精',
    additiveNameEn: 'beta-cyclodextrin',
    cnsNumber: '20.024',
    insNumber: '459',
    functionText: '增稠剂、其他',
    pdfPage: 15,
    standardPage: 12,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-pickled-vegetables',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-gum-based-candy',
      foodCategoryCode: '05.02.01',
      foodCategoryName: '胶基糖果',
      maxUseLevel: '20.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-other-candy-tablet-candy',
      foodCategoryCode: '05.02.02',
      foodCategoryName: '除胶基糖果以外的其他糖果（仅限压片糖果）',
      maxUseLevel: '15.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-instant-rice-noodle-products',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-prepared-meat',
      foodCategoryCode: '08.02',
      foodCategoryName: '预制肉制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-cooked-meat',
      foodCategoryCode: '08.03',
      foodCategoryName: '熟肉制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-plant-protein-beverages',
      foodCategoryCode: '14.03.02',
      foodCategoryName: '植物蛋白饮料',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-compound-protein-beverages',
      foodCategoryCode: '14.03.03',
      foodCategoryName: '复合蛋白饮料',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-other-protein-beverages',
      foodCategoryCode: '14.03.04',
      foodCategoryName: '其他蛋白饮料',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-tea-coffee-plant-beverages',
      foodCategoryCode: '14.05',
      foodCategoryName: '茶、咖啡、植物（类）饮料',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-special-purpose-beverages',
      foodCategoryCode: '14.07',
      foodCategoryName: '特殊用途饮料',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-flavored-beverages',
      foodCategoryCode: '14.08',
      foodCategoryName: '风味饮料',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-cyclodextrin-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'γ-环状糊精',
    additiveNameEn: 'gamma-cyclodextrin',
    cnsNumber: '18.012',
    insNumber: '458',
    functionText: '稳定剂、增稠剂',
    pdfPage: 15,
    standardPage: 12,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-gamma-cyclodextrin-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'ε-聚赖氨酸',
    additiveNameEn: 'epsilon-polylysine',
    cnsNumber: '17.037',
    insNumber: '—',
    functionText: '防腐剂',
    pdfPage: 16,
    standardPage: 13,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-baked-foods',
      foodCategoryCode: '07.0',
      foodCategoryName: '焙烤食品',
      maxUseLevel: '0.15',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-cooked-meat',
      foodCategoryCode: '08.03',
      foodCategoryName: '熟肉制品',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '0.2',
      unit: 'g/L',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: 'ε-聚赖氨酸盐酸盐',
    additiveNameEn: 'epsilon-polylysine hydrochloride',
    cnsNumber: '17.038',
    insNumber: '—',
    functionText: '防腐剂',
    pdfPage: 16,
    standardPage: 13,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-hydrochloride-fruit-vegetable-legume-fungi-algae-nuts-seeds',
      foodCategoryCode: '04.0',
      foodCategoryName: '水果、蔬菜（包括块根类）、豆类、食用菌、藻类、坚果以及籽类等（04.01.01 新鲜水果、04.01.02.04 水果罐头、04.02.01 新鲜蔬菜、04.02.02.01 冷冻蔬菜、04.02.02.04 蔬菜罐头、04.02.02.06 发酵蔬菜制品、04.03.01 新鲜食用菌和藻类、04.03.02.01 冷冻食用菌和藻类、04.03.02.04 食用菌和藻类罐头、04.05.02.03 坚果与籽类罐头除外）',
      maxUseLevel: '0.30',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-hydrochloride-rice-products',
      foodCategoryCode: '06.02',
      foodCategoryName: '大米及其制品',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-hydrochloride-wheat-flour-products',
      foodCategoryCode: '06.03',
      foodCategoryName: '小麦粉及其制品 [06.03.01 小麦粉、06.03.02.01 生湿面制品（如面条、饺子皮、馄饨皮、烧麦皮）、06.03.02.02 生干面制品除外]',
      maxUseLevel: '0.30',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-hydrochloride-coarse-grain-products',
      foodCategoryCode: '06.04.02',
      foodCategoryName: '杂粮制品（06.04.02.01 杂粮罐头除外）',
      maxUseLevel: '0.40',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-hydrochloride-meat-products',
      foodCategoryCode: '08.0',
      foodCategoryName: '肉及肉制品（08.01 生、鲜肉、08.03.08 肉罐头类除外）',
      maxUseLevel: '0.30',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-hydrochloride-marinated-eggs',
      foodCategoryCode: '10.02.01',
      foodCategoryName: '卤蛋',
      maxUseLevel: '0.50',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-hydrochloride-condiments',
      foodCategoryCode: '12.0',
      foodCategoryName: '调味品（12.01 盐及代盐制品、12.09 香辛料类除外）',
      maxUseLevel: '0.50',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-epsilon-polylysine-hydrochloride-beverages',
      foodCategoryCode: '14.0',
      foodCategoryName: '饮料类[14.01 包装饮用水、14.02.01 果蔬汁（浆）、14.02.02 浓缩果蔬汁（浆）除外]',
      maxUseLevel: '0.20',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: "β-阿朴-8'-胡萝卜素醛",
    additiveNameEn: "beta-apo-8'-carotenal",
    cnsNumber: '08.018',
    insNumber: '160e',
    functionText: '着色剂',
    pdfPage: 11,
    standardPage: 8,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-beta-apo-8-carotenal-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '0.015',
      unit: 'g/kg',
      note: "以β-阿朴-8'-胡萝卜素醛计"
    },
    {
      id: 'gb2760-2024-a1-beta-apo-8-carotenal-processed-cheese-products',
      foodCategoryCode: '01.06.04',
      foodCategoryName: '再制干酪及干酪制品',
      maxUseLevel: '0.018',
      unit: 'g/kg',
      note: "以β-阿朴-8'-胡萝卜素醛计"
    },
    {
      id: 'gb2760-2024-a1-beta-apo-8-carotenal-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.020',
      unit: 'g/kg',
      note: "以β-阿朴-8'-胡萝卜素醛计"
    },
    {
      id: 'gb2760-2024-a1-beta-apo-8-carotenal-candy',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '0.015',
      unit: 'g/kg',
      note: "以β-阿朴-8'-胡萝卜素醛计"
    },
    {
      id: 'gb2760-2024-a1-beta-apo-8-carotenal-baked-foods',
      foodCategoryCode: '07.0',
      foodCategoryName: '焙烤食品',
      maxUseLevel: '0.015',
      unit: 'g/kg',
      note: "以β-阿朴-8'-胡萝卜素醛计"
    },
    {
      id: 'gb2760-2024-a1-beta-apo-8-carotenal-semi-solid-compound-seasoning',
      foodCategoryCode: '12.10.02',
      foodCategoryName: '半固体复合调味料',
      maxUseLevel: '0.005',
      unit: 'g/kg',
      note: "以β-阿朴-8'-胡萝卜素醛计"
    },
    {
      id: 'gb2760-2024-a1-beta-apo-8-carotenal-beverages',
      foodCategoryCode: '14.0',
      foodCategoryName: '饮料类（14.01 包装饮用水、14.02.01 果蔬汁（浆）、14.02.02 浓缩果蔬汁（浆）除外）',
      maxUseLevel: '0.010',
      unit: 'g/kg',
      note: "以β-阿朴-8'-胡萝卜素醛计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量"
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '冰结构蛋白',
    additiveNameEn: 'ice structuring protein',
    cnsNumber: '00.020',
    insNumber: '—',
    functionText: '其他',
    pdfPage: 25,
    standardPage: 22,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-ice-structuring-protein-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '冰乙酸（低压羰基化法）',
    additiveNameEn: 'acetic acid',
    cnsNumber: '01.112',
    insNumber: '—',
    functionText: '酸度调节剂',
    pdfPage: 25,
    standardPage: 22,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-acetic-acid-low-pressure-carbonylation-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品（12.03 食醋除外），表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'acetic-acid',
    additiveNameCn: '冰乙酸（又名冰醋酸）',
    additiveNameEn: 'acetic acid',
    cnsNumber: '01.107',
    insNumber: '260',
    functionText: '酸度调节剂',
    pdfPage: 25,
    standardPage: 22,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-acetic-acid-glacial-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品（12.03 食醋除外），表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '丙二醇',
    additiveNameEn: 'propylene glycol',
    cnsNumber: '18.004',
    insNumber: '1520',
    functionText: '稳定剂和凝固剂、抗结剂、乳化剂、水分保持剂、增稠剂',
    pdfPage: 25,
    standardPage: 22,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-propylene-glycol-wet-noodles',
      foodCategoryCode: '06.03.02.01',
      foodCategoryName: '生湿面制品（如面条、饺子皮、馄饨皮、烧麦皮）',
      maxUseLevel: '1.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-pastries',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '丙二醇脂肪酸酯',
    additiveNameEn: 'propylene glycol esters of fatty acids',
    cnsNumber: '10.020',
    insNumber: '477',
    functionText: '乳化剂、稳定剂',
    pdfPage: 25,
    standardPage: 22,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-propylene-glycol-esters-fatty-acids-milk-products',
      foodCategoryCode: '01.0',
      foodCategoryName: '乳及乳制品（13.0 特殊膳食用食品涉及品种除外）（01.01.01 巴氏杀菌乳、01.01.02 灭菌乳和高温杀菌乳、01.02.01 发酵乳、01.03.01 乳粉和奶油粉和 01.05.01 稀奶油除外）',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '丙二醇脂肪酸酯',
    additiveNameEn: 'propylene glycol esters of fatty acids',
    cnsNumber: '10.020',
    insNumber: '477',
    functionText: '乳化剂、稳定剂',
    pdfPage: 26,
    standardPage: 23,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-propylene-glycol-esters-fatty-acids-fat-oil-emulsions',
      foodCategoryCode: '02.0',
      foodCategoryName: '脂肪、油和乳化脂肪制品（02.01 基本不含水的脂肪和油、02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-esters-fatty-acids-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-esters-fatty-acids-fried-nuts-seeds',
      foodCategoryCode: '04.05.02.01',
      foodCategoryName: '熟制坚果与籽类（仅限油炸坚果与籽类）',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-esters-fatty-acids-fried-noodles',
      foodCategoryCode: '06.03.02.05',
      foodCategoryName: '油炸面制品',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-esters-fatty-acids-pastries',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-esters-fatty-acids-western-pastries',
      foodCategoryCode: '07.02.02',
      foodCategoryName: '西式糕点',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-esters-fatty-acids-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '20.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-propylene-glycol-esters-fatty-acids-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: '丙酸及其钠盐、钙盐（包括丙酸，丙酸钠，丙酸钙）',
    additiveNameEn: 'propionic acid, sodium propionate, calcium propionate',
    cnsNumber: '17.029, 17.006, 17.005',
    insNumber: '280, 281, 282',
    functionText: '防腐剂',
    pdfPage: 26,
    standardPage: 23,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'sodium-propionate' },
    { ingredientId: 'calcium-propionate' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-legume-products',
      foodCategoryCode: '04.04',
      foodCategoryName: '豆类制品',
      maxUseLevel: '2.5',
      unit: 'g/kg',
      note: '以丙酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-raw-grain',
      foodCategoryCode: '06.01',
      foodCategoryName: '原粮',
      maxUseLevel: '1.8',
      unit: 'g/kg',
      note: '以丙酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-wet-noodles',
      foodCategoryCode: '06.03.02.01',
      foodCategoryName: '生湿面制品（如面条、饺子皮、馄饨皮、烧麦皮）',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: '以丙酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-bread',
      foodCategoryCode: '07.01',
      foodCategoryName: '面包',
      maxUseLevel: '2.5',
      unit: 'g/kg',
      note: '以丙酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-pastry',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '2.5',
      unit: 'g/kg',
      note: '以丙酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-prepared-meat',
      foodCategoryCode: '08.02.01',
      foodCategoryName: '调理肉制品（生肉添加调理料）',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: '以丙酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-smoked-roasted-meat',
      foodCategoryCode: '08.03.02',
      foodCategoryName: '熏、烧、烤肉类',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: '以丙酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-vinegar',
      foodCategoryCode: '12.03',
      foodCategoryName: '食醋',
      maxUseLevel: '2.5',
      unit: 'g/kg',
      note: '以丙酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-soy-sauce',
      foodCategoryCode: '12.04',
      foodCategoryName: '酱油',
      maxUseLevel: '2.5',
      unit: 'g/kg',
      note: '以丙酸计'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-liquid-compound-seasoning',
      foodCategoryCode: '12.10.03',
      foodCategoryName: '液体复合调味料',
      maxUseLevel: '2.5',
      unit: 'g/kg',
      note: '以丙酸计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'mono-and-diglycerides-fatty-acids',
    additiveNameCn: '单，双甘油脂肪酸酯',
    additiveNameEn: 'mono- and diglycerides of fatty acids',
    cnsNumber: '10.006',
    insNumber: '471',
    functionText: '乳化剂、被膜剂',
    pdfPage: 31,
    standardPage: 28,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-mono-and-diglycerides-fatty-acids-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~4、6~11、13~14、16~30、32~53、59~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-mono-and-diglycerides-fatty-acids-butter-concentrated-butter',
      foodCategoryCode: '02.02.01.01',
      foodCategoryName: '黄油和浓缩黄油',
      maxUseLevel: '20.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-mono-and-diglycerides-fatty-acids-dry-noodles',
      foodCategoryCode: '06.03.02.02',
      foodCategoryName: '生干面制品',
      maxUseLevel: '30.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-mono-and-diglycerides-fatty-acids-syrup',
      foodCategoryCode: '11.01.02',
      foodCategoryName: '赤砂糖、原糖、其他糖和糖浆',
      maxUseLevel: '6.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-mono-and-diglycerides-fatty-acids-spices',
      foodCategoryCode: '12.09',
      foodCategoryName: '香辛料类',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '达瓦树胶',
    additiveNameEn: 'ghatti gum',
    cnsNumber: '10.043',
    insNumber: '419',
    functionText: '乳化剂',
    pdfPage: 31,
    standardPage: 28,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-ghatti-gum-special-dietary-foods',
      foodCategoryCode: '13.03',
      foodCategoryName: '其他特殊膳食用食品（特殊医学用途配方食品，仅限 10 岁以上人群）',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '单辛酸甘油酯',
    additiveNameEn: 'capryl monoglyceride',
    cnsNumber: '17.031',
    insNumber: '—',
    functionText: '防腐剂',
    pdfPage: 31,
    standardPage: 28,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-capryl-monoglyceride-wet-noodles',
      foodCategoryCode: '06.03.02.01',
      foodCategoryName: '生湿面制品（如面条、饺子皮、馄饨皮、烧麦皮）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-capryl-monoglyceride-pastries',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-capryl-monoglyceride-bakery-fillings-bean-paste',
      foodCategoryCode: '07.04',
      foodCategoryName: '焙烤食品馅料及表面用挂浆（仅限豆馅）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-capryl-monoglyceride-meat-sausage',
      foodCategoryCode: '08.03.05',
      foodCategoryName: '肉灌肠类',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '氮气（液氮）',
    additiveNameEn: 'nitrogen',
    cnsNumber: '00.024',
    insNumber: '—',
    functionText: '其他',
    pdfPage: 31,
    standardPage: 28,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-nitrogen-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nitrogen-protein-beverages',
      foodCategoryCode: '14.03',
      foodCategoryName: '蛋白饮料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-nitrogen-tea-coffee-plant-beverages',
      foodCategoryCode: '14.05',
      foodCategoryName: '茶、咖啡、植物（类）饮料',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '淀粉磷酸酯钠（又名淀粉磷酸酯，磷酸酯淀粉，单淀粉磷酸酯）',
    additiveNameEn: 'sodium starch phosphate (mono starch phosphate)',
    cnsNumber: '20.013',
    insNumber: '1410',
    functionText: '增稠剂',
    pdfPage: 32,
    standardPage: 29,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sodium-starch-phosphate-fat-emulsion',
      foodCategoryCode: '02.02.01',
      foodCategoryName: '脂肪含量 80% 以上的乳化制品（02.02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-starch-phosphate-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-starch-phosphate-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-starch-phosphate-condiments',
      foodCategoryCode: '12.0',
      foodCategoryName: '调味品（12.01 盐及代盐制品、12.09 香辛料类除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sodium-starch-phosphate-beverages',
      foodCategoryCode: '14.0',
      foodCategoryName: '饮料类[14.01 包装饮用水、14.02.01 果蔬汁（浆）、14.02.02 浓缩果蔬汁（浆）除外]',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '靛蓝及其铝色淀（包括靛蓝，靛蓝铝色淀）',
    additiveNameEn: 'indigotine, indigotine aluminum lake',
    cnsNumber: '08.008',
    insNumber: '132',
    functionText: '着色剂',
    pdfPage: 32,
    standardPage: 29,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-indigotine-candied-fruit',
      foodCategoryCode: '04.01.02.08.01',
      foodCategoryName: '蜜饯类、凉果类',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以靛蓝计'
    },
    {
      id: 'gb2760-2024-a1-indigotine-decorative-fruit-vegetable',
      foodCategoryCode: '04.01.02.09',
      foodCategoryName: '装饰性果蔬',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以靛蓝计'
    },
    {
      id: 'gb2760-2024-a1-indigotine-pickled-vegetables',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '0.01',
      unit: 'g/kg',
      note: '以靛蓝计'
    },
    {
      id: 'gb2760-2024-a1-indigotine-fried-nuts-seeds',
      foodCategoryCode: '04.05.02.01',
      foodCategoryName: '熟制坚果与籽类（仅限油炸坚果与籽类）',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以靛蓝计'
    },
    {
      id: 'gb2760-2024-a1-indigotine-cocoa-chocolate-candy',
      foodCategoryCode: '05.0',
      foodCategoryName: '可可制品、巧克力和巧克力制品（包括代可可脂巧克力及制品）以及糖果（05.01.01 可可制品除外）',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以靛蓝计'
    },
    {
      id: 'gb2760-2024-a1-indigotine-candy-except-gum',
      foodCategoryCode: '05.02.02',
      foodCategoryName: '除胶基糖果以外的其他糖果',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '以靛蓝计'
    },
    {
      id: 'gb2760-2024-a1-indigotine-cake-decorations',
      foodCategoryCode: '07.02.04',
      foodCategoryName: '糕点上彩装',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以靛蓝计'
    },
    {
      id: 'gb2760-2024-a1-indigotine-biscuit-fillings',
      foodCategoryCode: '07.04',
      foodCategoryName: '焙烤食品馅料及表面用挂浆（仅限饼干夹心）',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以靛蓝计'
    },
    {
      id: 'gb2760-2024-a1-indigotine-fruit-vegetable-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以靛蓝计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '靛蓝及其铝色淀（包括靛蓝，靛蓝铝色淀）',
    additiveNameEn: 'indigotine, indigotine aluminum lake',
    cnsNumber: '08.008',
    insNumber: '132',
    functionText: '着色剂',
    pdfPage: 33,
    standardPage: 30,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-indigotine-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以靛蓝计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-indigotine-fruit-flavored-beverages',
      foodCategoryCode: '14.08',
      foodCategoryName: '风味饮料（仅限果味饮料）',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以靛蓝计，以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-indigotine-mixed-alcoholic-beverages',
      foodCategoryCode: '15.02',
      foodCategoryName: '配制酒',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以靛蓝计'
    },
    {
      id: 'gb2760-2024-a1-indigotine-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '仅限使用靛蓝'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'silicon-dioxide',
    additiveNameCn: '二氧化硅',
    additiveNameEn: 'silicon dioxide',
    cnsNumber: '02.004',
    insNumber: '551',
    functionText: '抗结剂',
    pdfPage: 35,
    standardPage: 32,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-silicon-dioxide-milk-powder-products',
      foodCategoryCode: '01.03',
      foodCategoryName: '乳粉和奶油粉及其调制产品（01.03.01 乳粉和奶油粉除外）',
      maxUseLevel: '15.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-silicon-dioxide-milk-tablets',
      foodCategoryCode: '01.08',
      foodCategoryName: '其他乳制品（如乳清粉、酪蛋白粉等）（仅限奶片）',
      maxUseLevel: '15.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'glycerol',
    additiveNameCn: '甘油（又名丙三醇）',
    additiveNameEn: 'glycerine (glycerol)',
    cnsNumber: '15.014',
    insNumber: '422',
    functionText: '水分保持剂、乳化剂',
    pdfPage: 43,
    standardPage: 40,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-glycerol-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '茶多酚（又名维多酚，简称“TP”）',
    additiveNameEn: 'tea polyphenol (TP)',
    cnsNumber: '04.005',
    insNumber: '—',
    functionText: '抗氧化剂',
    pdfPage: 27,
    standardPage: 24,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-tea-polyphenols-anhydrous-fats-oils',
      foodCategoryCode: '02.01',
      foodCategoryName: '基本不含水的脂肪和油',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: teaPolyphenolsCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-fried-nuts-seeds',
      foodCategoryCode: '04.05.02.01',
      foodCategoryName: '熟制坚果与籽类（仅限油炸坚果与籽类）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-fried-noodles',
      foodCategoryCode: '06.03.02.05',
      foodCategoryName: '油炸面制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-ready-to-eat-cereals',
      foodCategoryCode: '06.06',
      foodCategoryName: '即食谷物，包括碾轧燕麦（片）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-instant-rice-noodles',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-pastries',
      foodCategoryCode: '07.02',
      foodCategoryName: '糕点',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-bakery-fillings-fat',
      foodCategoryCode: '07.04',
      foodCategoryName: '焙烤食品馅料及表面用挂浆（仅限含油脂馅料）',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-cured-meat',
      foodCategoryCode: '08.02.02',
      foodCategoryName: '腌腊肉制品类（如咸肉、腊肉、板鸭、中式火腿、腊肠）',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-sauced-braised-meat',
      foodCategoryCode: '08.03.01',
      foodCategoryName: '酱卤肉制品类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-smoked-roasted-meat',
      foodCategoryCode: '08.03.02',
      foodCategoryName: '熏、烧、烤肉类（熏肉、叉烧肉、烤鸭、肉脯等）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-fried-meat',
      foodCategoryCode: '08.03.03',
      foodCategoryName: '油炸肉类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-western-ham',
      foodCategoryCode: '08.03.04',
      foodCategoryName: '西式火腿（熏烤、烟熏、蒸煮火腿）类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-meat-sausage',
      foodCategoryCode: '08.03.05',
      foodCategoryName: '肉灌肠类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-fermented-meat',
      foodCategoryCode: '08.03.06',
      foodCategoryName: '发酵肉制品类',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-prepared-aquatic',
      foodCategoryCode: '09.03',
      foodCategoryName: '预制水产品（半成品）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-cooked-aquatic',
      foodCategoryCode: '09.04',
      foodCategoryName: '熟制水产品（可直接食用）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-canned-aquatic',
      foodCategoryCode: '09.05',
      foodCategoryName: '水产品罐头',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-fruit-flavored-syrup',
      foodCategoryCode: '11.05.01',
      foodCategoryName: '水果调味糖浆',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: teaPolyphenolsCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: teaPolyphenolsCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-plant-protein-beverages',
      foodCategoryCode: '14.03.02',
      foodCategoryName: '植物蛋白饮料',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: teaPolyphenolsCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-protein-solid-beverages',
      foodCategoryCode: '14.06.02',
      foodCategoryName: '蛋白固体饮料',
      maxUseLevel: '0.8',
      unit: 'g/kg',
      note: teaPolyphenolsCatechinNote
    },
    {
      id: 'gb2760-2024-a1-tea-polyphenols-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: teaPolyphenolsOilCatechinNote
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '茶多酚棕榈酸酯',
    additiveNameEn: 'tea polyphenol palmitate',
    cnsNumber: '04.021',
    insNumber: '—',
    functionText: '抗氧化剂',
    pdfPage: 28,
    standardPage: 25,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-tea-polyphenol-palmitate-anhydrous-fats-oils',
      foodCategoryCode: '02.01',
      foodCategoryName: '基本不含水的脂肪和油',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '茶黄素',
    additiveNameEn: 'theaflavins',
    cnsNumber: '04.023',
    insNumber: '—',
    functionText: '抗氧化剂',
    pdfPage: 28,
    standardPage: 25,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-theaflavins-fat-oil-emulsions',
      foodCategoryCode: '02.0',
      foodCategoryName: '脂肪、油和乳化脂肪制品（02.02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-fried-nuts-seeds',
      foodCategoryCode: '04.05.02.01',
      foodCategoryName: '熟制坚果与籽类（仅限油炸坚果与籽类）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-canned-nuts-seeds',
      foodCategoryCode: '04.05.02.03',
      foodCategoryName: '坚果与籽类罐头',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-chewing-gum',
      foodCategoryCode: '05.02.01',
      foodCategoryName: '胶基糖果',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-fried-noodles',
      foodCategoryCode: '06.03.02.05',
      foodCategoryName: '油炸面制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-ready-to-eat-cereals',
      foodCategoryCode: '06.06',
      foodCategoryName: '即食谷物，包括碾轧燕麦（片）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-instant-rice-noodles',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-bakery',
      foodCategoryCode: '07.0',
      foodCategoryName: '焙烤食品',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-prepared-meat',
      foodCategoryCode: '08.02',
      foodCategoryName: '预制肉制品',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-cooked-meat',
      foodCategoryCode: '08.03',
      foodCategoryName: '熟肉制品',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-aquatic-products',
      foodCategoryCode: '09.0',
      foodCategoryName: '水产及其制品（包括鱼类、甲壳类、贝类、软体类、棘皮类等水产及其加工制品等）（09.01 鲜水产除外）',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-plant-protein-beverages',
      foodCategoryCode: '14.03.02',
      foodCategoryName: '植物蛋白饮料',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-solid-beverages',
      foodCategoryCode: '14.06',
      foodCategoryName: '固体饮料',
      maxUseLevel: '0.8',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-special-purpose-beverages',
      foodCategoryCode: '14.07',
      foodCategoryName: '特殊用途饮料',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-flavored-beverages',
      foodCategoryCode: '14.08',
      foodCategoryName: '风味饮料',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-other-beverages',
      foodCategoryCode: '14.09',
      foodCategoryName: '其他类饮料',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '茶黄素',
    additiveNameEn: 'theaflavins',
    cnsNumber: '04.023',
    insNumber: '—',
    functionText: '抗氧化剂',
    pdfPage: 29,
    standardPage: 26,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-theaflavins-jelly',
      foodCategoryCode: '16.01',
      foodCategoryName: '果冻',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '如用于果冻粉，按冲调倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-theaflavins-tea-products',
      foodCategoryCode: '16.02.02',
      foodCategoryName: '茶制品（包括调味茶和代用茶）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-theaflavins-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '赤藓红及其铝色淀（包括赤藓红，赤藓红铝色淀）',
    additiveNameEn: 'erythrosine, erythrosine aluminum lake',
    cnsNumber: '08.003',
    insNumber: '127',
    functionText: '着色剂',
    pdfPage: 29,
    standardPage: 26,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-erythrosine-candied-fruit',
      foodCategoryCode: '04.01.02.08.01',
      foodCategoryName: '蜜饯类、凉果类',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-decorative-fruit-vegetable',
      foodCategoryCode: '04.01.02.09',
      foodCategoryName: '装饰性果蔬',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-fried-nuts-seeds',
      foodCategoryCode: '04.05.02.01',
      foodCategoryName: '熟制坚果与籽类（仅限油炸坚果与籽类）',
      maxUseLevel: '0.025',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-cocoa-chocolate-candy',
      foodCategoryCode: '05.0',
      foodCategoryName: '可可制品、巧克力和巧克力制品（包括代可可脂巧克力及制品）以及糖果（05.01.01 可可制品除外）',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-cake-decorations',
      foodCategoryCode: '07.02.04',
      foodCategoryName: '糕点上彩装',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-meat-sausage',
      foodCategoryCode: '08.03.05',
      foodCategoryName: '肉灌肠类',
      maxUseLevel: '0.015',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-canned-meat',
      foodCategoryCode: '08.03.08',
      foodCategoryName: '肉罐头类',
      maxUseLevel: '0.015',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-fermented-sauce',
      foodCategoryCode: '12.05',
      foodCategoryName: '酿造酱',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-compound-seasoning',
      foodCategoryCode: '12.10',
      foodCategoryName: '复合调味料',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-fruit-vegetable-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: erythrosineBeverageNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: erythrosineBeverageNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-fruit-flavored-beverages',
      foodCategoryCode: '14.08',
      foodCategoryName: '风味饮料（仅限果味饮料）',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: erythrosineBeverageNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-mixed-alcoholic-beverages',
      foodCategoryCode: '15.02',
      foodCategoryName: '配制酒',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: erythrosineNote
    },
    {
      id: 'gb2760-2024-a1-erythrosine-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '0.025',
      unit: 'g/kg',
      note: '仅限使用赤藓红'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'erythritol',
    additiveNameCn: '赤藓糖醇',
    additiveNameEn: 'erythritol',
    cnsNumber: '19.018',
    insNumber: '968',
    functionText: '甜味剂',
    pdfPage: 30,
    standardPage: 27,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-erythritol-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'maltitol',
    additiveNameCn: '麦芽糖醇，麦芽糖醇液',
    additiveNameEn: 'maltitol and maltitol syrup',
    cnsNumber: '19.005, 19.022',
    insNumber: '965(i), 965(ii)',
    functionText: '甜味剂、稳定剂、水分保持剂、乳化剂、膨松剂、增稠剂',
    pdfPage: 83,
    standardPage: 80,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-maltitol-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-maltitol-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-maltitol-frozen-surimi-products',
      foodCategoryCode: '09.02.03',
      foodCategoryName: '冷冻水产糜及其制品（包括冷冻丸类产品等）',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'xylitol',
    additiveNameCn: '木糖醇',
    additiveNameEn: 'xylitol',
    cnsNumber: '19.007',
    insNumber: '967',
    functionText: '甜味剂',
    pdfPage: 86,
    standardPage: 83,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-xylitol-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sorbitol',
    additiveNameCn: '山梨糖醇，山梨糖醇液',
    additiveNameEn: 'sorbitol and sorbitol syrup',
    cnsNumber: '19.006, 19.023',
    insNumber: '420(i), 420(ii)',
    functionText: '甜味剂、膨松剂、乳化剂、水分保持剂、稳定剂、增稠剂',
    pdfPage: 105,
    standardPage: 102,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sorbitol-condensed-milk',
      foodCategoryCode: '01.04',
      foodCategoryName: '炼乳及其调制产品',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sorbitol-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-sorbitol-candy',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'ammonium-carbonate',
    additiveNameCn: '碳酸铵',
    additiveNameEn: 'ammonium carbonate',
    cnsNumber: '06.009',
    insNumber: '503(i)',
    functionText: '膨松剂',
    pdfPage: 112,
    standardPage: 109,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-ammonium-carbonate-biscuit',
      foodCategoryCode: '07.03',
      foodCategoryName: '饼干',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'ammonium-bicarbonate',
    additiveNameCn: '碳酸氢铵',
    additiveNameEn: 'ammonium hydrogen carbonate',
    cnsNumber: '06.002',
    insNumber: '503(ii)',
    functionText: '膨松剂',
    pdfPage: 113,
    standardPage: 110,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-ammonium-bicarbonate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~56、58~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: '亚硝酸钠，亚硝酸钾',
    additiveNameEn: 'sodium nitrite, potassium nitrite',
    cnsNumber: '09.002, 09.004',
    insNumber: '250, 249',
    functionText: '护色剂、防腐剂',
    pdfPage: 126,
    standardPage: 123,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'sodium-nitrite' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-cured-meat',
      foodCategoryCode: '08.02.02',
      foodCategoryName: '腌腊肉制品类（如咸肉、腊肉、板鸭、中式火腿、腊肠等）',
      maxUseLevel: '0.15',
      unit: 'g/kg',
      note: '以亚硝酸钠计，残留量 ≤30 mg/kg'
    },
    {
      id: 'gb2760-2024-a1-{ingredientId}-sauced-braised-meat',
      foodCategoryCode: '08.03.01',
      foodCategoryName: '酱卤肉制品类',
      maxUseLevel: '0.15',
      unit: 'g/kg',
      note: '以亚硝酸钠计，残留量 ≤30 mg/kg'
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: '亚铁氰化钾，亚铁氰化钠',
    additiveNameEn: 'potassium ferrocyanide, sodium ferrocyanide',
    cnsNumber: '02.001, 02.008',
    insNumber: '536, 535',
    functionText: '抗结剂',
    pdfPage: 126,
    standardPage: 123,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'potassium-ferrocyanide' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-salt-substitutes',
      foodCategoryCode: '12.01',
      foodCategoryName: '盐及代盐制品',
      maxUseLevel: '0.01',
      unit: 'g/kg',
      note: '以亚铁氰根计'
    }
  ])
  ,
  ...officialUsageRows({
    ingredientId: 'lecithins',
    additiveNameCn: '磷脂',
    additiveNameEn: 'phospholipid',
    cnsNumber: '04.010',
    insNumber: '322',
    functionText: '抗氧化剂、乳化剂',
    pdfPage: 78,
    standardPage: 75,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-lecithins-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~4、6、8~53、59~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'beta-carotene',
    additiveNameCn: 'β-胡萝卜素',
    additiveNameEn: 'beta-carotene',
    cnsNumber: '08.010',
    insNumber: '160a(i), 160a(iii), 160a(iv)',
    functionText: '着色剂',
    pdfPage: 12,
    standardPage: 9,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-beta-carotene-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-modified-milk-powder-cream-powder',
      foodCategoryCode: '01.03.02',
      foodCategoryName: '调制乳粉和调制奶油粉',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-cream-analogues',
      foodCategoryCode: '01.05',
      foodCategoryName: '稀奶油（淡奶油）及其类似品（01.05.01 稀奶油除外）',
      maxUseLevel: '0.02',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-unripened-cheese',
      foodCategoryCode: '01.06.01',
      foodCategoryName: '非熟化干酪',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-ripened-cheese',
      foodCategoryCode: '01.06.02',
      foodCategoryName: '熟化干酪',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-processed-cheese-products',
      foodCategoryCode: '01.06.04',
      foodCategoryName: '再制干酪及干酪制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-cheese-analogues',
      foodCategoryCode: '01.06.05',
      foodCategoryName: '干酪类似品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-milk-based-ready-to-eat-flavored-foods',
      foodCategoryCode: '01.07',
      foodCategoryName: '以乳为主要配料的即食风味食品或其预制产品（不包括冰淇淋和风味发酵乳）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-water-oil-fat-emulsion',
      foodCategoryCode: '02.02',
      foodCategoryName: '水油状脂肪乳化制品（02.02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-other-fat-emulsion',
      foodCategoryCode: '02.03',
      foodCategoryName: '02.02 类以外的脂肪乳化制品，包括混合的和（或）调味的脂肪乳化制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-fat-based-desserts',
      foodCategoryCode: '02.04',
      foodCategoryName: '脂肪类甜品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-other-fats-non-dairy-creamer',
      foodCategoryCode: '02.05',
      foodCategoryName: '其他油脂或油脂制品（仅限植脂末）',
      maxUseLevel: '0.065',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-vinegar-oil-salted-fruit',
      foodCategoryCode: '04.01.02.03',
      foodCategoryName: '醋、油或盐渍水果',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-canned-fruit',
      foodCategoryCode: '04.01.02.04',
      foodCategoryName: '水果罐头',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-other-jam',
      foodCategoryCode: '04.01.02.07',
      foodCategoryName: '除 04.01.02.05 以外的果酱（如印度酸辣酱）',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-candied-fruit',
      foodCategoryCode: '04.01.02.08',
      foodCategoryName: '蜜饯',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-decorative-fruit-vegetables',
      foodCategoryCode: '04.01.02.09',
      foodCategoryName: '装饰性果蔬',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-fruit-desserts',
      foodCategoryCode: '04.01.02.10',
      foodCategoryName: '水果甜品，包括果味液体甜品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'beta-carotene',
    additiveNameCn: 'β-胡萝卜素',
    additiveNameEn: 'beta-carotene',
    cnsNumber: '08.010',
    insNumber: '160a(i), 160a(iii), 160a(iv)',
    functionText: '着色剂',
    pdfPage: 13,
    standardPage: 10,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-beta-carotene-fermented-fruit-products',
      foodCategoryCode: '04.01.02.11',
      foodCategoryName: '发酵的水果制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-dried-vegetables',
      foodCategoryCode: '04.02.02.02',
      foodCategoryName: '干制蔬菜',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-pickled-vegetables',
      foodCategoryCode: '04.02.02.03',
      foodCategoryName: '腌渍的蔬菜',
      maxUseLevel: '0.132',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-canned-vegetables',
      foodCategoryCode: '04.02.02.04',
      foodCategoryName: '蔬菜罐头',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-vegetable-puree',
      foodCategoryCode: '04.02.02.05',
      foodCategoryName: '蔬菜泥（酱），番茄沙司除外',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-other-processed-vegetables',
      foodCategoryCode: '04.02.02.08',
      foodCategoryName: '其他加工蔬菜',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-pickled-fungi-algae',
      foodCategoryCode: '04.03.02.03',
      foodCategoryName: '腌渍的食用菌和藻类',
      maxUseLevel: '0.132',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-canned-fungi-algae',
      foodCategoryCode: '04.03.02.04',
      foodCategoryName: '食用菌和藻类罐头',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-other-processed-fungi-algae',
      foodCategoryCode: '04.03.02.06',
      foodCategoryName: '其他加工食用菌和藻类',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-processed-nuts-seeds',
      foodCategoryCode: '04.05.02',
      foodCategoryName: '加工坚果与籽类',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-cocoa-chocolate-products',
      foodCategoryCode: '05.01',
      foodCategoryName: '可可制品、巧克力和巧克力制品包括代可可脂巧克力及制品',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-candy',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-candy-chocolate-coating',
      foodCategoryCode: '05.03',
      foodCategoryName: '糖果和巧克力制品包衣',
      maxUseLevel: '20.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-decorative-confectionery-toppings',
      foodCategoryCode: '05.04',
      foodCategoryName: '装饰糖果（如工艺造型，或用于蛋糕装饰）、顶饰（非水果材料）和甜汁',
      maxUseLevel: '20.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-fried-flour-products',
      foodCategoryCode: '06.03.02.05',
      foodCategoryName: '油炸面制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-canned-coarse-grains',
      foodCategoryCode: '06.04.02.01',
      foodCategoryName: '杂粮罐头',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-ready-to-eat-cereals',
      foodCategoryCode: '06.06',
      foodCategoryName: '即食谷物，包括碾轧燕麦（片）',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-instant-rice-noodle-products',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-frozen-rice-flour-products',
      foodCategoryCode: '06.08',
      foodCategoryName: '冷冻米面制品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-cereal-starch-desserts',
      foodCategoryCode: '06.09',
      foodCategoryName: '谷类和淀粉类甜品（如米布丁、木薯布丁）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-grain-product-fillings',
      foodCategoryCode: '06.10',
      foodCategoryName: '粮食制品馅料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-batter-breading-frying-powder',
      foodCategoryCode: '06.11',
      foodCategoryName: '面糊（如用于鱼和禽肉的拖面糊）、裹粉、煎炸粉',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-baked-foods',
      foodCategoryCode: '07.0',
      foodCategoryName: '焙烤食品',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-prepared-meat',
      foodCategoryCode: '08.02.01',
      foodCategoryName: '调理肉制品（生肉添加调理料）',
      maxUseLevel: '0.02',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-cooked-meat',
      foodCategoryCode: '08.03',
      foodCategoryName: '熟肉制品',
      maxUseLevel: '0.02',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-edible-animal-casing',
      foodCategoryCode: '08.04',
      foodCategoryName: '肉制品的可食用动物肠衣类',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'beta-carotene',
    additiveNameCn: 'β-胡萝卜素',
    additiveNameEn: 'beta-carotene',
    cnsNumber: '08.010',
    insNumber: '160a(i), 160a(iii), 160a(iv)',
    functionText: '着色剂',
    pdfPage: 14,
    standardPage: 11,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-beta-carotene-frozen-surimi-products',
      foodCategoryCode: '09.02.03',
      foodCategoryName: '冷冻水产糜及其制品（包括冷冻丸类产品等）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-prepared-aquatic-products',
      foodCategoryCode: '09.03',
      foodCategoryName: '预制水产品（半成品）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-cooked-aquatic-products',
      foodCategoryCode: '09.04',
      foodCategoryName: '熟制水产品（可直接食用）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-canned-aquatic-products',
      foodCategoryCode: '09.05',
      foodCategoryName: '水产品罐头',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-egg-products-physical-form-changed',
      foodCategoryCode: '10.03',
      foodCategoryName: '蛋制品（改变其物理性状）[10.03.01 脱水蛋制品（如蛋白粉、蛋黄粉、蛋白片）、10.03.03 蛋液与液态蛋除外]',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-other-egg-products',
      foodCategoryCode: '10.04',
      foodCategoryName: '其他蛋制品',
      maxUseLevel: '0.15',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-flavored-syrup',
      foodCategoryCode: '11.05',
      foodCategoryName: '调味糖浆',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-solid-compound-seasoning',
      foodCategoryCode: '12.10.01',
      foodCategoryName: '固体复合调味料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-semi-solid-compound-seasoning',
      foodCategoryCode: '12.10.02',
      foodCategoryName: '半固体复合调味料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-liquid-compound-seasoning',
      foodCategoryCode: '12.10.03',
      foodCategoryName: '液体复合调味料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-protein-beverages',
      foodCategoryCode: '14.03',
      foodCategoryName: '蛋白饮料类',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-tea-beverages',
      foodCategoryCode: '14.05.01',
      foodCategoryName: '茶（类）饮料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-coffee-beverages',
      foodCategoryCode: '14.05.02',
      foodCategoryName: '咖啡（类）饮料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-plant-beverages',
      foodCategoryCode: '14.05.03',
      foodCategoryName: '植物饮料',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-special-purpose-beverages',
      foodCategoryCode: '14.07',
      foodCategoryName: '特殊用途饮料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-flavored-beverages',
      foodCategoryCode: '14.08',
      foodCategoryName: '风味饮料',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-fermented-wine',
      foodCategoryCode: '15.03',
      foodCategoryName: '发酵酒（15.03.01 葡萄酒除外）',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-jelly',
      foodCategoryCode: '16.01',
      foodCategoryName: '果冻',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '如用于果冻粉，按冲调倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-beta-carotene-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'saccharins',
    additiveNameCn: '糖精钠',
    additiveNameEn: 'sodium saccharin',
    cnsNumber: '19.001',
    insNumber: '954(iv)',
    functionText: '甜味剂、增味剂',
    pdfPage: 114,
    standardPage: 111,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-saccharins-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.15',
      unit: 'g/kg',
      note: '以糖精计'
    },
    {
      id: 'gb2760-2024-a1-saccharins-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以糖精计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sodium-cyclamate',
    additiveNameCn: '甜蜜素（又名环己基氨基磺酸钠），环己基氨基磺酸钙',
    additiveNameEn: 'sodium cyclamate, calcium cyclamate',
    cnsNumber: '19.002, 19.024',
    insNumber: '952(iv), 952(ii)',
    functionText: '甜味剂',
    pdfPage: 119,
    standardPage: 116,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sodium-cyclamate-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.65',
      unit: 'g/kg',
      note: '以环己基氨基磺酸计'
    },
    {
      id: 'gb2760-2024-a1-sodium-cyclamate-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以环己基氨基磺酸计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'polysorbate-80',
    additiveNameCn: '吐温类（包括吐温 20，吐温 40，吐温 60，吐温 80）',
    additiveNameEn: 'polysorbates',
    cnsNumber: '10.025, 10.026, 10.015, 10.016',
    insNumber: '432, 434, 435, 433',
    functionText: '乳化剂、稳定剂',
    pdfPage: 120,
    standardPage: 117,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-polysorbate-80-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '1.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-polysorbate-80-cream',
      foodCategoryCode: '01.05.01',
      foodCategoryName: '稀奶油',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'potassium-nitrate',
    additiveNameCn: '硝酸钠，硝酸钾',
    additiveNameEn: 'sodium nitrate, potassium nitrate',
    cnsNumber: '09.001, 09.003',
    insNumber: '251, 252',
    functionText: '护色剂、防腐剂',
    pdfPage: 124,
    standardPage: 121,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-potassium-nitrate-cured-meat',
      foodCategoryCode: '08.02.02',
      foodCategoryName: '腌腊肉制品类（如咸肉、腊肉、板鸭、中式火腿、腊肠等）',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以亚硝酸钠（钾）计，残留量 ≤30 mg/kg'
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: '磷酸及磷酸盐类',
    additiveNameEn: 'phosphoric acid and phosphates',
    cnsNumber: '01.106, 15.008, 15.004, 15.007, 15.010, 06.008, 15.009, 06.006, 02.003, 01.308, 15.001, 15.002, 15.003, 15.005, 15.006, 15.017, 15.013, 15.015, 15.016',
    insNumber: '338, 450(i), 450(ii), 341(i), 340(i), 342(i), 340(ii), 341(ii), 340(iii), 339(ii), 452(i), 451(i), 339(i), 339(iii), 450(v), 450(iii), 452(ii), 450(vii)',
    functionText: '水分保持剂、膨松剂、酸度调节剂、稳定剂、凝固剂、抗结剂',
    pdfPage: 75,
    standardPage: 72,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'phosphoric-acid' },
    { ingredientId: 'sodium-pyrophosphate' },
    { ingredientId: 'monocalcium-phosphate' },
    { ingredientId: 'sodium-tripolyphosphate' },
    { ingredientId: 'sodium-hexametaphosphate' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-milk-products',
      foodCategoryCode: '01.0',
      foodCategoryName: '乳及乳制品（13.0 特殊膳食用食品涉及品种除外；01.01.01、01.01.02、01.02.01、01.03.01 除外）',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '可单独或混合使用，最大使用量以磷酸根（PO43-）计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'steviol-glycosides',
    additiveNameCn: '甜菊糖苷',
    additiveNameEn: 'steviol glycosides',
    cnsNumber: '19.008',
    insNumber: '960a',
    functionText: '甜味剂',
    pdfPage: 117,
    standardPage: 114,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-steviol-glycosides-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '0.18',
      unit: 'g/kg',
      note: '以甜菊醇当量计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'anthocyanins',
    additiveNameCn: '葡萄皮红',
    additiveNameEn: 'grape skin extract',
    cnsNumber: '08.135',
    insNumber: '163(ii)',
    functionText: '着色剂',
    pdfPage: 93,
    standardPage: 90,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-anthocyanins-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'curcumin',
    additiveNameCn: '姜黄素',
    additiveNameEn: 'curcumin',
    cnsNumber: '08.132',
    insNumber: '100(i)',
    functionText: '着色剂',
    pdfPage: 55,
    standardPage: 52,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-curcumin-modified-milk-powder',
      foodCategoryCode: '01.03.02',
      foodCategoryName: '调制乳粉和调制奶油粉',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: '以姜黄素计'
    },
    {
      id: 'gb2760-2024-a1-curcumin-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'paprika-extract',
    additiveNameCn: '辣椒红',
    additiveNameEn: 'paprika red',
    cnsNumber: '08.106',
    insNumber: '160c(ii)',
    functionText: '着色剂',
    pdfPage: 70,
    standardPage: 67,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-paprika-extract-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-paprika-extract-frozen-rice-noodle',
      foodCategoryCode: '06.08',
      foodCategoryName: '冷冻米面制品',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'amaranth',
    additiveNameCn: '苋菜红及其铝色淀（包括苋菜红，苋菜红铝色淀）',
    additiveNameEn: 'amaranth, amaranth aluminum lake',
    cnsNumber: '08.001',
    insNumber: '123',
    functionText: '着色剂',
    pdfPage: 123,
    standardPage: 120,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-amaranth-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '0.025',
      unit: 'g/kg',
      note: '以苋菜红计'
    },
    {
      id: 'gb2760-2024-a1-amaranth-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.3',
      unit: 'g/kg',
      note: '以苋菜红计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'brilliant-blue-fcf',
    additiveNameCn: '亮蓝及其铝色淀（包括亮蓝，亮蓝铝色淀）',
    additiveNameEn: 'brilliant blue, brilliant blue aluminum lake',
    cnsNumber: '08.007',
    insNumber: '133',
    functionText: '着色剂',
    pdfPage: 73,
    standardPage: 70,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-brilliant-blue-fcf-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '0.025',
      unit: 'g/kg',
      note: '以亮蓝计'
    },
    {
      id: 'gb2760-2024-a1-brilliant-blue-fcf-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.5',
      unit: 'g/kg',
      note: '以亮蓝计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'carmines',
    additiveNameCn: '胭脂虫红及其铝色淀（包括胭脂虫红，胭脂虫红铝色淀）',
    additiveNameEn: 'carmines, carmine cochineal aluminum lake',
    cnsNumber: '08.145',
    insNumber: '120',
    functionText: '着色剂',
    pdfPage: 127,
    standardPage: 124,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-carmines-flavored-fermented-milk',
      foodCategoryCode: '01.02.02',
      foodCategoryName: '风味发酵乳',
      maxUseLevel: '0.05',
      unit: 'g/kg',
      note: '以胭脂红酸计'
    },
    {
      id: 'gb2760-2024-a1-carmines-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '0.6',
      unit: 'g/kg',
      note: '以胭脂红酸计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'chlorophylls',
    additiveNameCn: '叶绿素铜',
    additiveNameEn: 'copper chlorophyll',
    cnsNumber: '08.153',
    insNumber: '141(i)',
    functionText: '着色剂',
    pdfPage: 133,
    standardPage: 130,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-chlorophylls-copper-cream',
      foodCategoryCode: '01.05.01',
      foodCategoryName: '稀奶油',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-chlorophylls-copper-candy',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'caramel-colours',
    additiveNameCn: '焦糖色（加氨生产）',
    additiveNameEn: 'caramel colour class III - ammonia process',
    cnsNumber: '08.110',
    insNumber: '150c',
    functionText: '着色剂',
    pdfPage: 56,
    standardPage: 53,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-caramel-colours-ammonia-condensed-milk',
      foodCategoryCode: '01.04.02',
      foodCategoryName: '调制炼乳（包括加糖炼乳及使用了非乳原料的调制炼乳等）',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-caramel-colours-ammonia-cocoa-chocolate-candy',
      foodCategoryCode: '05.0',
      foodCategoryName: '可可制品、巧克力和巧克力制品（包括代可可脂巧克力及制品）以及糖果',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'locust-bean-gum',
    additiveNameCn: '槐豆胶（又名刺槐豆胶）',
    additiveNameEn: 'carob bean gum',
    cnsNumber: '20.023',
    insNumber: '410',
    functionText: '增稠剂',
    pdfPage: 53,
    standardPage: 50,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-locust-bean-gum-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-locust-bean-gum-infant-formula',
      foodCategoryCode: '13.01',
      foodCategoryName: '婴幼儿配方食品',
      maxUseLevel: '7.0',
      unit: 'g/L',
      note: '以即食状态计'
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '刺梧桐胶',
    additiveNameEn: 'karaya gum',
    cnsNumber: '18.010',
    insNumber: '416',
    functionText: '稳定剂',
    pdfPage: 30,
    standardPage: 27,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-karaya-gum-fat-emulsion',
      foodCategoryCode: '02.02',
      foodCategoryName: '水油状脂肪乳化制品（02.02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'tara-gum',
    additiveNameCn: '刺云实胶',
    additiveNameEn: 'tara gum',
    cnsNumber: '20.041',
    insNumber: '417',
    functionText: '增稠剂',
    pdfPage: 30,
    standardPage: 27,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-tara-gum-cheese-products',
      foodCategoryCode: '01.06',
      foodCategoryName: '干酪、再制干酪、干酪制品及干酪类似品',
      maxUseLevel: '8.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-tara-gum-frozen-desserts',
      foodCategoryCode: '03.0',
      foodCategoryName: '冷冻饮品（03.04 食用冰除外）',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'tara-gum',
    additiveNameCn: '刺云实胶',
    additiveNameEn: 'tara gum',
    cnsNumber: '20.041',
    insNumber: '417',
    functionText: '增稠剂',
    pdfPage: 30,
    standardPage: 27,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-tara-gum-jam',
      foodCategoryCode: '04.01.02.05',
      foodCategoryName: '果酱',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-tara-gum-bakery',
      foodCategoryCode: '07.0',
      foodCategoryName: '焙烤食品',
      maxUseLevel: '1.5',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-tara-gum-prepared-meat',
      foodCategoryCode: '08.02',
      foodCategoryName: '预制肉制品',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-tara-gum-cooked-meat',
      foodCategoryCode: '08.03',
      foodCategoryName: '熟肉制品',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-tara-gum-beverages',
      foodCategoryCode: '14.0',
      foodCategoryName: '饮料类[14.01 包装饮用水、14.02.01 果蔬汁（浆）、14.02.02 浓缩果蔬汁（浆）除外]',
      maxUseLevel: '2.5',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-tara-gum-jelly',
      foodCategoryCode: '16.01',
      foodCategoryName: '果冻',
      maxUseLevel: '5.0',
      unit: 'g/kg',
      note: '如用于果冻粉，按冲调倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '醋酸酯淀粉',
    additiveNameEn: 'starch acetate',
    cnsNumber: '20.039',
    insNumber: '1420',
    functionText: '增稠剂',
    pdfPage: 30,
    standardPage: 27,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-starch-acetate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~30、32~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sucrose-esters-fatty-acids',
    additiveNameCn: '蔗糖脂肪酸酯',
    additiveNameEn: 'sucrose esters of fatty acids',
    cnsNumber: '10.001',
    insNumber: '473',
    functionText: '乳化剂',
    pdfPage: 142,
    standardPage: 139,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sucrose-esters-fatty-acids-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'sorbitan-monostearate',
    additiveNameCn: '司盘类（包括山梨醇酐单硬脂酸酯等）',
    additiveNameEn: 'sorbitan esters of fatty acids',
    cnsNumber: '10.024, 10.008, 10.003, 10.004, 10.005',
    insNumber: '493, 495, 491, 492, 494',
    functionText: '乳化剂',
    pdfPage: 110,
    standardPage: 107,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-sorbitan-monostearate-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'polyglycerol-esters-fatty-acids',
    additiveNameCn: '聚甘油脂肪酸酯',
    additiveNameEn: 'polyglycerol esters of fatty acids',
    cnsNumber: '10.022',
    insNumber: '475',
    functionText: '乳化剂、稳定剂、增稠剂、抗结剂',
    pdfPage: 62,
    standardPage: 59,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-polyglycerol-esters-fatty-acids-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '10.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialGroupedUsageRows({
    additiveNameCn: '硬脂酰乳酸钠，硬脂酰乳酸钙',
    additiveNameEn: 'sodium stearoyl lactylate, calcium stearoyl lactylate',
    cnsNumber: '10.011, 10.009',
    insNumber: '481(i), 482(i)',
    functionText: '乳化剂、稳定剂',
    pdfPage: 138,
    standardPage: 135,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    { ingredientId: 'sodium-stearoyl-lactylate' },
    { ingredientId: 'calcium-stearoyl-lactylate' }
  ], [
    {
      id: 'gb2760-2024-a1-{ingredientId}-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '2.0',
      unit: 'g/kg',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'potassium-bicarbonate',
    additiveNameCn: '碳酸氢钾',
    additiveNameEn: 'potassium hydrogen carbonate',
    cnsNumber: '01.307',
    insNumber: '501(ii)',
    functionText: '酸度调节剂',
    pdfPage: 113,
    standardPage: 110,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-potassium-bicarbonate-general',
      foodCategoryCode: '—',
      foodCategoryName: '各类食品，表 A.2 中编号为 1~53、57~68 的食品类别除外',
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: ''
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'mixed-tocopherols',
    additiveNameCn: '维生素 E（包括 dl-α-生育酚，d-α-生育酚，混合生育酚浓缩物）',
    additiveNameEn: 'vitamin E',
    cnsNumber: '04.016',
    insNumber: '307',
    functionText: '抗氧化剂',
    pdfPage: 121,
    standardPage: 118,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-mixed-tocopherols-modified-milk',
      foodCategoryCode: '01.01.03',
      foodCategoryName: '调制乳',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'propyl-gallate',
    additiveNameCn: '没食子酸丙酯（简称 PG）',
    additiveNameEn: 'propyl gallate',
    cnsNumber: '04.003',
    insNumber: '310',
    functionText: '抗氧化剂',
    pdfPage: 84,
    standardPage: 81,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-propyl-gallate-fat-emulsion',
      foodCategoryCode: '02.0',
      foodCategoryName: '脂肪、油和乳化脂肪制品（02.02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '0.1',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'tert-butylhydroquinone',
    additiveNameCn: '特丁基对苯二酚（简称 TBHQ）',
    additiveNameEn: 'tertiary butyl hydroquinone',
    cnsNumber: '04.007',
    insNumber: '319',
    functionText: '抗氧化剂',
    pdfPage: 115,
    standardPage: 112,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-tert-butylhydroquinone-fat-emulsion',
      foodCategoryCode: '02.0',
      foodCategoryName: '脂肪、油和乳化脂肪制品（02.02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'butylated-hydroxyanisole',
    additiveNameCn: '丁基羟基茴香醚（简称 BHA）',
    additiveNameEn: 'butylated hydroxyanisole',
    cnsNumber: '04.001',
    insNumber: '320',
    functionText: '抗氧化剂',
    pdfPage: 33,
    standardPage: 30,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-fat-emulsion',
      foodCategoryCode: '02.0',
      foodCategoryName: '脂肪、油和乳化脂肪制品（02.02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'butylated-hydroxyanisole',
    additiveNameCn: '丁基羟基茴香醚（简称 BHA）',
    additiveNameEn: 'butylated hydroxyanisole',
    cnsNumber: '04.001',
    insNumber: '320',
    functionText: '抗氧化剂',
    pdfPage: 33,
    standardPage: 30,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-fried-nuts-seeds',
      foodCategoryCode: '04.05.02.01',
      foodCategoryName: '熟制坚果与籽类（仅限油炸坚果与籽类）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-canned-nuts-seeds',
      foodCategoryCode: '04.05.02.03',
      foodCategoryName: '坚果与籽类罐头',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-chewing-gum',
      foodCategoryCode: '05.02.01',
      foodCategoryName: '胶基糖果',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-fried-noodles',
      foodCategoryCode: '06.03.02.05',
      foodCategoryName: '油炸面制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-coarse-grain-flour',
      foodCategoryCode: '06.04.01',
      foodCategoryName: '杂粮粉',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-ready-to-eat-cereals',
      foodCategoryCode: '06.06',
      foodCategoryName: '即食谷物，包括碾轧燕麦（片）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-instant-rice-noodles',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-biscuits',
      foodCategoryCode: '07.03',
      foodCategoryName: '饼干',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-cured-meat',
      foodCategoryCode: '08.02.02',
      foodCategoryName: '腌腊肉制品类（如咸肉、腊肉、板鸭、中式火腿、腊肠等）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-dried-aquatic',
      foodCategoryCode: '09.03.04',
      foodCategoryName: '风干、烘干、压干等水产品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-solid-chicken-seasoning',
      foodCategoryCode: '12.10.01',
      foodCategoryName: '固体复合调味料（仅限鸡肉粉）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxyanisole-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'butylated-hydroxytoluene',
    additiveNameCn: '二丁基羟基甲苯（简称 BHT）',
    additiveNameEn: 'butylated hydroxytoluene',
    cnsNumber: '04.002',
    insNumber: '321',
    functionText: '抗氧化剂',
    pdfPage: 34,
    standardPage: 31,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-fat-emulsion',
      foodCategoryCode: '02.0',
      foodCategoryName: '脂肪、油和乳化脂肪制品（02.02.01.01 黄油和浓缩黄油除外）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'butylated-hydroxytoluene',
    additiveNameCn: '二丁基羟基甲苯（简称 BHT）',
    additiveNameEn: 'butylated hydroxytoluene',
    cnsNumber: '04.002',
    insNumber: '321',
    functionText: '抗氧化剂',
    pdfPage: 34,
    standardPage: 31,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-fried-nuts-seeds',
      foodCategoryCode: '04.05.02.01',
      foodCategoryName: '熟制坚果与籽类（仅限油炸坚果与籽类）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-canned-nuts-seeds',
      foodCategoryCode: '04.05.02.03',
      foodCategoryName: '坚果与籽类罐头',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'butylated-hydroxytoluene',
    additiveNameCn: '二丁基羟基甲苯（简称 BHT）',
    additiveNameEn: 'butylated hydroxytoluene',
    cnsNumber: '04.002',
    insNumber: '321',
    functionText: '抗氧化剂',
    pdfPage: 35,
    standardPage: 32,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-chewing-gum',
      foodCategoryCode: '05.02.01',
      foodCategoryName: '胶基糖果',
      maxUseLevel: '0.4',
      unit: 'g/kg',
      note: ''
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-fried-noodles',
      foodCategoryCode: '06.03.02.05',
      foodCategoryName: '油炸面制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-dehydrated-potato-products',
      foodCategoryCode: '06.04.02.02',
      foodCategoryName: '其他杂粮制品（仅限脱水马铃薯制品）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-ready-to-eat-cereals',
      foodCategoryCode: '06.06',
      foodCategoryName: '即食谷物，包括碾轧燕麦（片）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-instant-rice-noodles',
      foodCategoryCode: '06.07',
      foodCategoryName: '方便米面制品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-biscuits',
      foodCategoryCode: '07.03',
      foodCategoryName: '饼干',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-cured-meat',
      foodCategoryCode: '08.02.02',
      foodCategoryName: '腌腊肉制品类（如咸肉、腊肉、板鸭、中式火腿、腊肠）',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-dried-aquatic',
      foodCategoryCode: '09.03.04',
      foodCategoryName: '风干、烘干、压干等水产品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    },
    {
      id: 'gb2760-2024-a1-butylated-hydroxytoluene-puffed-foods',
      foodCategoryCode: '16.06',
      foodCategoryName: '膨化食品',
      maxUseLevel: '0.2',
      unit: 'g/kg',
      note: '以油脂中的含量计'
    }
  ]),
  ...officialUsageRows({
    additiveNameCn: '二甲基二碳酸盐（又名维果灵）',
    additiveNameEn: 'dimethyl dicarbonate',
    cnsNumber: '17.033',
    insNumber: '242',
    functionText: '防腐剂',
    pdfPage: 35,
    standardPage: 32,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-dimethyl-dicarbonate-fruit-vegetable-juice-beverages',
      foodCategoryCode: '14.02.03',
      foodCategoryName: '果蔬汁（浆）类饮料',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-dimethyl-dicarbonate-carbonated-beverages',
      foodCategoryCode: '14.04',
      foodCategoryName: '碳酸饮料',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-dimethyl-dicarbonate-tea-beverages',
      foodCategoryCode: '14.05.01',
      foodCategoryName: '茶（类）饮料',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-dimethyl-dicarbonate-special-purpose-beverages',
      foodCategoryCode: '14.07',
      foodCategoryName: '特殊用途饮料',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-dimethyl-dicarbonate-flavored-beverages',
      foodCategoryCode: '14.08',
      foodCategoryName: '风味饮料',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    },
    {
      id: 'gb2760-2024-a1-dimethyl-dicarbonate-other-beverages',
      foodCategoryCode: '14.09',
      foodCategoryName: '其他饮料类（仅限麦芽汁发酵的非酒精饮料）',
      maxUseLevel: '0.25',
      unit: 'g/kg',
      note: '以即饮状态计，相应的固体饮料按稀释倍数增加使用量'
    }
  ]),
  ...officialUsageRows({
    ingredientId: 'dimethylpolysiloxane',
    additiveNameCn: '聚二甲基硅氧烷及其乳液（包括聚二甲基硅氧烷，聚二甲基硅氧烷乳液）',
    additiveNameEn: 'polydimethylsiloxane and emulsion',
    cnsNumber: '03.007',
    insNumber: '900a',
    functionText: '被膜剂',
    pdfPage: 61,
    standardPage: 58,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }, [
    {
      id: 'gb2760-2024-a1-dimethylpolysiloxane-surface-treated-fresh-fruit',
      foodCategoryCode: '04.01.01.02',
      foodCategoryName: '经表面处理的鲜水果',
      maxUseLevel: '0.0009',
      unit: 'g/kg',
      note: '以聚二甲基硅氧烷计'
    }
  ])
];

const manualStagingKeys = new Set(gb2760OfficialManualStagingRecords.map(getGeneratedDedupeKey));

const gb2760OfficialGeneratedStagingRecords = gb2760OfficialGeneratedA1StagingRecords
  .map((record) => officialRecord(record))
  .filter((record) => !manualStagingKeys.has(getGeneratedDedupeKey(record)));

export const gb2760OfficialStagingGenerationCoverage = gb2760OfficialGeneratedA1Coverage;

export const gb2760OfficialStagingRecords = [
  ...gb2760OfficialManualStagingRecords,
  ...gb2760OfficialGeneratedStagingRecords
];

function buildGb2760SeedIngredientMatchIndex(ingredients) {
  const nameMap = new Map();
  const insMap = new Map();
  const seedIngredients = Array.isArray(ingredients)
    ? ingredients.filter((ingredient) => ingredient?.kind === 'food-additive')
    : [];

  for (const ingredient of seedIngredients) {
    for (const value of [
      ingredient.nameCn,
      ingredient.nameEn,
      ...(Array.isArray(ingredient.aliases) ? ingredient.aliases : [])
    ]) {
      addMatchIndexValue(nameMap, normalizeDedupeText(value), ingredient.id);
      addMatchIndexValue(nameMap, normalizeAdditiveBaseName(value), ingredient.id);
    }

    for (const value of [
      ingredient.gbCode,
      ingredient.eNumber,
      ...(Array.isArray(ingredient.aliases) ? ingredient.aliases : [])
    ]) {
      for (const code of normalizeInsCodeVariants(value)) {
        addMatchIndexValue(insMap, code, ingredient.id);
      }
    }
  }

  return { nameMap, insMap };
}

function addMatchIndexValue(map, key, ingredientId) {
  if (!key || !ingredientId) return;
  const matches = map.get(key) || new Set();
  matches.add(ingredientId);
  map.set(key, matches);
}

function findGb2760SeedIngredientId(record) {
  const nameCandidates = new Set();
  for (const key of [
    normalizeDedupeText(record.additiveNameCn),
    normalizeAdditiveBaseName(record.additiveNameCn),
    normalizeDedupeText(record.additiveNameEn),
    normalizeAdditiveBaseName(record.additiveNameEn)
  ]) {
    addCandidateIds(nameCandidates, gb2760SeedIngredientMatchIndex.nameMap.get(key));
  }

  const candidates = new Set(nameCandidates);
  const insTokens = splitInsTokens(record.insNumber);
  if (!nameCandidates.size && insTokens.length === 1) {
    for (const code of normalizeInsCodeVariants(insTokens[0])) {
      addCandidateIds(candidates, gb2760SeedIngredientMatchIndex.insMap.get(code));
    }
  }

  return candidates.size === 1 ? [...candidates][0] : '';
}

function addCandidateIds(target, ids) {
  if (!ids) return;
  for (const id of ids) target.add(id);
}

function getGeneratedDedupeKey(record) {
  return [
    normalizeDedupeText(record?.additiveNameCn),
    normalizeDedupeText(record?.cnsNumber || record?.insNumber),
    record?.foodCategoryCode || '',
    normalizeDedupeText(record?.maxUseLevel),
    record?.unit || ''
  ].join('|');
}

function normalizeDedupeText(value) {
  return stripTrailingFootnoteMarkers(String(value || '')
    .replace(/\s+/g, '')
    .replace(/[，,]/g, ',')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[【\[]/g, '(')
    .replace(/[】\]]/g, ')')
    .replace(/[。；;]/g, '')
    .trim())
    .toLowerCase();
}

function normalizeAdditiveBaseName(value) {
  return normalizeDedupeText(value).replace(/[(（].*?[)）]/gu, '');
}

function splitInsTokens(value) {
  return String(value || '')
    .split(/[;,，、]/u)
    .map((token) => token.trim())
    .filter((token) => token && token !== '—');
}

function normalizeInsCodeVariants(value) {
  const code = String(value || '')
    .toLowerCase()
    .replace(/^ins\s*/u, '')
    .replace(/^e\s*/u, '')
    .replace(/[^0-9a-z()]+/gu, '');
  if (!code || code === '—') return [];
  return [...new Set([code, code.replace(/\(.+\)$/u, '')].filter(Boolean))];
}

function stripTrailingFootnoteMarkers(value) {
  return String(value || '').replace(/([^\d])\d+\)$/u, '$1');
}

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
