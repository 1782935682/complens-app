import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { foodIngredients } from '../src/data/foodAdditives.js';
import { standardAllergenTypes } from '../src/data/allergens.js';
import { gb2760OfficialStagingRecords, gb2760OfficialStagingSource } from '../src/data/gb2760OfficialStaging.js';
import { gb2760OfficialFullTextPages, gb2760OfficialFullTextSource } from '../src/data/gb2760OfficialFullText.js';
import { gb2760OfficialA2ExceptionFoodCategories, gb2760OfficialB1Footnotes, gb2760OfficialB1NoFlavorFoodCategories, gb2760OfficialB2NaturalFlavorRows, gb2760OfficialB3SyntheticFlavorRows, gb2760OfficialC1ProcessingAidRows, gb2760OfficialC2ProcessingAidRows, gb2760OfficialC3EnzymePreparationRows, gb2760OfficialDFunctionCategoryRows, gb2760OfficialE1FoodCategoryRows, gb2760OfficialFAdditiveIndexRows, gb2760OfficialReferenceRows, gb2760OfficialReferenceTableSource } from '../src/data/gb2760OfficialReferenceTables.js';

const riskLevels = new Set(['low', 'medium', 'high', 'unknown']);
const gbStatuses = new Set(['permitted', 'restricted', 'prohibited', 'unknown']);
const reviewStatuses = new Set(['draft', 'reviewed', 'verified']);
const dataStatuses = new Set(['verified_regulation', 'verified_jecfa', 'pending_review', 'mapped_candidate', 'common_ingredient', 'unverified', 'unknown_from_ocr']);
const nonVerifiedDataStatuses = new Set(['pending_review', 'mapped_candidate', 'unverified', 'unknown_from_ocr']);
const sourceTypes = new Set(['official_standard', 'regulation', 'public_database', 'manual_verified', 'unknown']);
const sourceScopes = new Set(['gb_2760_regulation', 'jecfa_safety_evaluation', 'candidate_mapping', 'common_ingredient_lexicon', 'ocr_unmatched', 'seed_reference', 'unknown']);
const confidenceLevels = new Set(['high', 'medium', 'low', 'unverified']);
const gb2760StagingExtractionStatuses = new Set(['verified', 'extracted']);
const gb2760StagingReviewStatuses = new Set(['verified', 'needs_review']);
const gb2760ReferenceExtractionStatuses = new Set(['extracted']);
const gb2760ReferenceReviewStatuses = new Set(['needs_review']);
const c3OrphanContinuationFragments = [
  /-$/u,
  /^icticus/u,
  /^mosinBgene/u,
  /^lusnaganoensis/u,
  /^vart\.ubingensis/u,
  /vart\.ubingensis/u,
  /^tis/u,
  /misstearothermoph/u,
  /Pullulanibacil-$/u
];
const compactLatinReferenceNamePatterns = [
  /\bCloveleafoil\b/u,
  /\bEugeniaspp\b/u,
  /\bvegetableoilsextractionsolvent\b/u,
  /\bOleicacid\b/u,
  /\bQuininehydrochloride\b/u,
  /\bmedicavar\./iu,
  /\b(?:Pelargonlium|Zanthoxylum|Cinnamomaum)spp\b/u,
  /\bPyroligneousacid\b/u,
  /\bPyroligneousacidextract\b/u,
  /\bArtificialcognacoil\b/u,
  /\brythroandthreo\b/u,
  /\bTannicacid\b/u,
  /\bChinesedate\b/u,
  /\bElletariacardamomum\b/u,
  /\bPerillafrutescens\b/u,
  /\bZiziphusjujuba\b/u,
  /\bLimeoilterpene\b/u,
  /\bZingiberoffici-?nale\b/u,
  /\bexpressedterpeneless\b/u,
  /\bMedicagosativa\b/u,
  /\bClovertopsredextractsolid\b/u,
  /\bMountainmapleextractsolid\b/u,
  /\bLicoriceextractpowder\b/u,
  /\bViverracivetta\b/u,
  /\bsinensisor\b/u,
  /\bsinen-sis\b/u,
  /\bcarnaubawax\b/iu,
  /\binsolublepolyvinylpolypyrroli-done\b/iu,
  /\bsodiumpropio-nate\b/iu,
  /\bsodiumpropionate\b/u,
  /\bsilicagel\b/iu,
  /\bPolyoxypropyleneoxyethylene\b/u,
  /\bsorbi-tanmonolaurate\b/iu,
  /\bpolyoxyethylenepolyoxyprop-ylene(?:amineether)?\b/iu,
  /\bBfamily\b/u,
  /\bincludingmilkclottingenzymes\b/iu,
  /\bEndothiaparasitica\b/u,
  /\bCalfstomach\b/u,
  /\bAnoxybacilluscaldiproteolyticus\b/u,
  /\bAlkalihaloba-cillusclausii\b/u,
  /\bAlkalihalobacillusclausii\b/u,
  /\bMalbrancheasulfurea\b/u,
  /\blichenifor-mis\b/u,
  /\bpotassiumchloride\b/u,
  /\bsodiumdihydrogenphosphate\b/u,
  /\bAspergillusniger\b/u,
  /\bAspergillusoryzae\b/u,
  /\bBacillussubtilis\b/u,
  /\bCytophagasp\b/u,
  /\bRhizomucorpusillus\b/u,
  /\bAspergilluskawachii\b/u,
  /\bnigervar\.tubingensis\b/u,
  /\bsalivaryglandsorforestomach/iu,
  /\bhogorbovinepan-?creas\b/iu,
  /\bbovinepancreas\b/iu,
  /\bporcinepancreas\b/iu,
  /\bgoatgullets\b/iu,
  /\bpigor\b/iu,
  /\bhorseliver\b/iu,
  /\borlamb\b/iu,
  /\blambabomasum\b/iu,
  /\borpoultrystomach\b/iu,
  /\b[AB]gene\b/u,
  /\b\d,\s+\d/u,
  /\bCAG\s+55\b/u,
  /\bA2Phospholipase\b/u,
  /\bPhosphoinositidephospholipase\b/u,
  /\bPseudomonasfluorescens\b/u,
  /\bPseudomonassp\b/u,
  /\b(?:[A-Z]{1,3}|[A-Z][a-z]{2,}|[fF])\.(?:and|or|var|subsp)\b/u,
  /\bspp\.\./iu,
  /\bspp\.(?:and|or|of)[A-Za-z]*/iu,
  /\b(?:var|subsp)\.[A-Za-z]/u,
  /\b[A-Z]\.[a-z]{3,}\b/u,
  /\b(?:andotherkelps|An-gelicasinensis|ber-gamia|deal-bata)\b/iu,
  /\bpsicose3-epimerase\b/iu,
  /\bstearothe(?:ilusrmoph|\s+ilus\s+rmoph)\b/iu,
  /\d\s+\(\d/u,
  /\(\d+[A-Za-z]?\),\s+\d/u
];
const compactNaturalFlavorNamePatterns = [
  /\b[A-Za-z][A-Za-z.-]*\[[A-Za-z]/u,
  /\b[A-Za-z]{4,}(?:oil|oils|extract|tincture|concrete|absolute|oleoresin|resinoid|gum|balsam)\b/u,
  /\b[A-Za-z]{4,}(?:oil|extract|oleoresin|absolute|tincture|concrete)(?:terpene|terpeneless|powder|solid)\b/u,
  /\b(?:Luohanfruit|Orrisroot|Rueoil|Swallowroot)\b/u,
  /\b(?:Abies|Acacia|Acer|Aframomum|Aglaia|Allium|Alpinia|Amyris|Anethum|Aniba|Anogeissus|Anthemis|Apium|Armoracia|Artemisia|Asarum|Astragalus|Atractylodes|Barosma|Betula|Bixa|Boswellia|Boronia|Brassica|Bulnesia|Camellia|Canarium|Capsicum|Carum|Carya|Castanea|Ceratonia|Cichorium|Cinnamomum|Cinchona|Cistus|Citrus|Coffea|Commiphora|Copaifera|Coriandrum|Croton|Crocus|Cryptocarya|Cuminum|Cupressus|Curcuma|Daucus|Decalepis|Eriodictyon|Eucalyptus|Euphoria|Evernia|Ferula|Galbaniflua|Galipea|Gardenia|Gentiana|Helichrysum|Hibiscus|Humulus|Hyssopus|Ilex|Iris|Jasminum|Juglans|Juniperus|Kereocystis|Laminaria|Lavandula|Levisticum|Liquidambar|Lippia|Litsea|Majorana|Matricaria|Marrubium|Medicago|Melaleuca|Melissa|Mentha|Michelia|Myristica|Myroxylon|Ocimum|Origanum|Paullinia|Pelargonium|Petroselinum|Pimenta|Piper|Picrasma|Pinus|Polianthes|Prunus|Quassia|Quercus|Rabdosia|Rhamnus|Ribes|Ricinus|Rosa|Rosemarinus|Salvia|Sambucus|Santalum|Sarcodactylis|Satureja|Schinus|Siraitia|Smilax|Sophora|Spartium|Spilanthes|Sterculia|Styrax|Tamarindus|Taraxacum|Thea|Theobroma|Thaumatococcus|Thuja|Thymus|Torreya|Trigonella|Turnera|Valeriana|Vanilla|Vetiveria|Vicia|Viola|Viverra|Vitis|Zingiber)[a-z]{2,}\b/u
];
const compactSyntheticFlavorNamePatterns = [
  /\b(?:[A-Za-zα-ωΑ-Ω][A-Za-zα-ωΑ-Ω-]{2,}hydrochloride|[A-Za-zα-ωΑ-Ω][A-Za-zα-ωΑ-Ω-]{3,}(?:acid|oxide))\b/iu,
  findCompactSyntheticYlEsterName,
  /\b[A-Za-z0-9][A-Za-z0-9,()'.+-]*yl\d[A-Za-z0-9,()'.+-]*(?:phenylacetate|acetoacetate|isovalerate|tetradecanoate|methylbutyrate|methylbutanoate|hydroxybutyrate|hydroxyhexanoate|methylvalerate|methylthiopropionate|mercaptopropionate|phenylpropionate|methylpentanoate|phenylglycidate|furanacrylate|undecylenate|undecenoate|decatrienoate|decadienoate|thiofuroate|heptanoate|octanoate|decanoate|dodecanoate|butenoate|hexenoate|nonenoate|pentanoate|propanoate|malonate|succinate|caproate|caprylate|myristate|laurate|sorbate|lactate|tiglate|furoate|glycidate|carbonate|levulinate|fumarate|valerate|acetate|formate|propionate|butyrate|isobutyrate|benzoate|salicylate|cinnamate)\b/iu,
  /\b(?:Butyl|Isopropyl|Isobutyl|Amyl|Isoamyl|Hexyl|Heptyl|Octyl|Nonyl|Decyl|Undecyl|Lauryl|Dodecyl|Fenchyl|Leaf|Styralyl|Dimethylbenzyl|Isopropylbenzyl|Trimethylbenzyl|Methylbenzyl|Caryophyllene|Perilla|Benzyl|Phenethyl|Phenylpropyl|Anisyl|Cinnamic|Propyl|Furfuryl|Tetrahydrofurfuryl|Propylphenethyl|Hydratropyl|Amylcinnamyl|Vanillyl)alcohol\b/u,
  /\b(?:Pyruvic|Butyric|Isobutyric|Methylbutyric|Ethylbutyric|Valeric|Methylvaleric|Isovaleric|Hexanoic|Adipic|Hexenoic|Heptanoic|Octanoic|Nonoic|Decanoic|Dodecanoic|Tetradecanoic|Hexadecylic|Palmitic|Benzoic|Phenylacetic|Cinnamic|Fumaric|Levulinic|Oxobutyric|Methylhexanoic|Methyloenanthic|Methyloctanoic|Decenoic|Undecanoic|Undecenoic|Phenylpropionic|Methylcrotonic|Formic|Methylnonanoic|Isohexanoic|Hydroxybenzoic|Salicylic|Tiglic|Succinic|Stearic)acid\b/u,
  /\b(?:Methyl|Ethyl|Propyl|Isopropyl|Butyl|Isobutyl|Amyl|Isoamyl|Hexyl|Heptyl|Octyl|Nonyl|Benzyl|Phenethyl|Geranyl|Citronellyl|Linalyl|Neryl|Anisyl|Cinnamyl|Furfuryl|Allyl|Myrtenyl|Styrallyl|Carvyl|Eugenyl|Vanillyl)(?:acetate|formate|propionate|butyrate|isobutyrate|benzoate|salicylate|cinnamate)\b/u,
  /\b[A-Za-zα-ωΑ-Ω]*(?:cyclo|spiro|benzo|thieno)\s+\[/iu,
  /\b[A-Za-zα-ωΑ-Ω]*(?:cyclo|spiro|benzo|thieno)\[[^\]]+\]\s+(?=[A-Za-zα-ωΑ-Ω])/iu
];
const gb2760A1NoStagingRequiredSeedIds = new Set([
  'calcium-citrate',
  'citral',
  'ethyl-maltol',
  'ethyl-vanillin',
  'isomalt',
  'konjac-gum',
  'menthol',
  'potassium-benzoate',
  'vanillin'
]);
const consumerGroups = new Set(['pregnant', 'infant', 'child', 'diabetic', 'renal', 'sensitive']);
const allergenTypes = new Set(standardAllergenTypes);
const absoluteMedicalClaims = [
  '绝对安全',
  '绝对有害',
  '百分百安全',
  '100%安全',
  '完全无害',
  '完全有害',
  '治疗疾病',
  '治愈疾病'
];
const requiredSourceFields = [
  'sourceName',
  'sourceScope',
  'sourceVersion',
  'sourceUrl',
  'effectiveDate',
  'lastReviewedAt',
  'reviewNote',
  'regulatoryBasis',
  'rawSourceText'
];

export function validateFoodAdditives(items = foodIngredients) {
  const errors = [];
  const ids = new Set();
  const namePairs = new Set();

  if (!Array.isArray(items)) {
    return ['foodAdditives must be an array'];
  }

  items.forEach((item, index) => {
    const label = item?.id || `foodAdditives[${index}]`;

    requireString(item, 'id', label, errors);
    requireString(item, 'nameCn', label, errors);
    requireString(item, 'description', label, errors);
    requireString(item, 'category', label, errors);
    requireString(item, 'gbCode', label, errors);
    requireString(item, 'sourceNote', label, errors);
    requireString(item, 'dataVersion', label, errors);
    requireIsoDate(item, 'updatedAt', label, errors);
    requireString(item, 'sourceName', label, errors);
    requireString(item, 'reviewNote', label, errors);
    requireString(item, 'sourceVersion', label, errors);
    requireString(item, 'sourceUrl', label, errors);
    requireString(item, 'effectiveDate', label, errors);
    requireString(item, 'lastReviewedAt', label, errors);
    requireString(item, 'regulatoryBasis', label, errors);
    requireString(item, 'rawSourceText', label, errors);
    requireArray(item, 'aliases', label, errors);
    requireArray(item, 'functions', label, errors);
    requireArray(item, 'suitableFor', label, errors);
    requireArray(item, 'cautionFor', label, errors);
    requireArray(item, 'usageLimits', label, errors);
    requireArray(item, 'foodCategories', label, errors);
    requireArray(item, 'allergenTypes', label, errors);
    requireArray(item, 'cautionGroups', label, errors);
    requireArray(item, 'sourceReferences', label, errors);

    if (!['food-additive', 'common-food-ingredient'].includes(item?.kind)) {
      errors.push(`${label}.kind must be "food-additive" or "common-food-ingredient"`);
    }

    if (item?.dataCategory !== 'food') {
      errors.push(`${label}.dataCategory must be "food"`);
    }

    if (typeof item?.id === 'string') {
      if (ids.has(item.id)) errors.push(`Duplicate food additive id "${item.id}"`);
      ids.add(item.id);
    }

    if (typeof item?.nameCn === 'string' && typeof item?.nameEn === 'string') {
      const key = `${item.nameCn.trim().toLowerCase()}|${item.nameEn.trim().toLowerCase()}`;
      if (namePairs.has(key)) errors.push(`Duplicate food additive name pair "${item.nameCn}" + "${item.nameEn}"`);
      namePairs.add(key);
    }

    if (!riskLevels.has(item?.riskLevel)) {
      errors.push(`${label}.riskLevel must be one of ${formatAllowed(riskLevels)}`);
    }

    if (!gbStatuses.has(item?.gbStatus)) {
      errors.push(`${label}.gbStatus must be one of ${formatAllowed(gbStatuses)}`);
    }

    if (!reviewStatuses.has(item?.reviewStatus)) {
      errors.push(`${label}.reviewStatus must be one of ${formatAllowed(reviewStatuses)}`);
    }

    if (!dataStatuses.has(item?.dataStatus)) {
      errors.push(`${label}.dataStatus must be one of ${formatAllowed(dataStatuses)}`);
    }

    if (!sourceTypes.has(item?.sourceType)) {
      errors.push(`${label}.sourceType must be one of ${formatAllowed(sourceTypes)}`);
    }

    if (!sourceScopes.has(item?.sourceScope)) {
      errors.push(`${label}.sourceScope must be one of ${formatAllowed(sourceScopes)}`);
    }

    if (!confidenceLevels.has(item?.confidenceLevel)) {
      errors.push(`${label}.confidenceLevel must be one of ${formatAllowed(confidenceLevels)}`);
    }

    if (!confidenceLevels.has(item?.matchConfidence)) {
      errors.push(`${label}.matchConfidence must be one of ${formatAllowed(confidenceLevels)}`);
    }

    if (typeof item?.isVerified !== 'boolean') {
      errors.push(`${label}.isVerified must be a boolean`);
    }

    if (item?.dataStatus === 'verified_jecfa' && item?.sourceScope !== 'jecfa_safety_evaluation') {
      errors.push(`${label}.verified_jecfa data must use sourceScope "jecfa_safety_evaluation"`);
    }

    if (item?.dataStatus === 'verified_jecfa' && item?.isVerified === true) {
      errors.push(`${label}.verified_jecfa data must not set isVerified true until GB 2760 regulation limits are verified`);
    }

    if (nonVerifiedDataStatuses.has(item?.dataStatus) && item?.isVerified === true) {
      errors.push(`${label}.${item.dataStatus} data must not set isVerified true`);
    }

    if (item?.dataStatus === 'verified_regulation' && item?.sourceScope !== 'gb_2760_regulation') {
      errors.push(`${label}.verified_regulation data must use sourceScope "gb_2760_regulation"`);
    }

    if (item?.dataStatus === 'common_ingredient' && item?.kind !== 'common-food-ingredient') {
      errors.push(`${label}.common_ingredient data must use kind "common-food-ingredient"`);
    }

    if (item?.isVerified && !(hasText(item.sourceName) && hasText(item.sourceVersion) && hasText(item.sourceUrl) || hasText(item.regulatoryBasis))) {
      errors.push(`${label}.verified data must include sourceName/sourceVersion/sourceUrl or regulatoryBasis`);
    }

    validateNoAbsoluteMedicalClaims(item, label, errors);

    validateUsageLimits(item?.usageLimits, label, errors);
    validateSourceReferences(item?.sourceReferences, label, errors);
    validateAllowedValues(item?.allergenTypes, allergenTypes, `${label}.allergenTypes`, errors);
    validateAllowedValues(item?.cautionGroups, consumerGroups, `${label}.cautionGroups`, errors);
  });

  return errors;
}

export function getFoodAdditiveQualityReport(items = foodIngredients) {
  const safeItems = Array.isArray(items) ? items : [];
  const reviewStatusCounts = countBy(safeItems, (item) => item?.reviewStatus || 'missing');
  const dataStatusCounts = countBy(safeItems, (item) => item?.dataStatus || 'missing');
  const confidenceCounts = countBy(safeItems, (item) => item?.confidenceLevel || 'missing');
  const sourceVersionCounts = countBy(safeItems, (item) => item?.sourceVersion || 'missing');
  const missingSourceFieldCount = safeItems.reduce((count, item) => (
    count + requiredSourceFields.filter((field) => !hasText(item?.[field])).length
  ), 0);
  const missingUsageLimitsCount = safeItems.filter((item) => item?.kind === 'food-additive' && (!Array.isArray(item?.usageLimits) || item.usageLimits.length === 0)).length;
  const reviewQueue = safeItems
    .filter((item) => item?.dataStatus === 'unverified' || item?.dataStatus === 'pending_review' || item?.dataStatus === 'mapped_candidate' || item?.sourceScope === 'seed_reference')
    .map((item) => item.id)
    .filter(Boolean);

  return {
    totalCount: safeItems.length,
    reviewStatusCounts,
    dataStatusCounts,
    confidenceCounts,
    reviewedCount: reviewStatusCounts.reviewed || 0,
    verifiedCount: reviewStatusCounts.verified || 0,
    unverifiedCount: confidenceCounts.unverified || 0,
    missingSourceFieldCount,
    missingUsageLimitsCount,
    sourceVersionCounts,
    reviewQueue
  };
}

export function validateGb2760OfficialStaging(records = gb2760OfficialStagingRecords, ingredients = foodIngredients) {
  const errors = [];
  const ids = new Set();
  const rowKeys = new Set();
  const ingredientIds = new Set((Array.isArray(ingredients) ? ingredients : []).map((item) => item?.id).filter(Boolean));

  if (!Array.isArray(records)) {
    return ['gb2760OfficialStagingRecords must be an array'];
  }

  records.forEach((record, index) => {
    const label = record?.id || `gb2760OfficialStagingRecords[${index}]`;
    requireString(record, 'id', label, errors);
    requireString(record, 'standardCode', label, errors);
    requireString(record, 'standardTitle', label, errors);
    requireString(record, 'tableName', label, errors);
    requireString(record, 'additiveNameCn', label, errors);
    requireString(record, 'functionText', label, errors);
    requireString(record, 'foodCategoryCode', label, errors);
    requireString(record, 'foodCategoryName', label, errors);
    requireString(record, 'maxUseLevel', label, errors);
    requireString(record, 'rawSourceText', label, errors);
    requireString(record, 'sourceName', label, errors);
    requireString(record, 'sourceType', label, errors);
    requireString(record, 'sourceUrl', label, errors);
    requireString(record, 'downloadEndpoint', label, errors);
    requireString(record, 'platformRecordId', label, errors);
    requireString(record, 'announcementRecordId', label, errors);
    requireString(record, 'fileGuid', label, errors);
    requireString(record, 'factName', label, errors);
    requireString(record, 'pdfSha256', label, errors);
    requireIsoDate(record, 'retrievedAt', label, errors);

    if (typeof record?.id === 'string') {
      if (ids.has(record.id)) errors.push(`Duplicate GB 2760 staging id "${record.id}"`);
      ids.add(record.id);
    }

    if (hasText(record?.ingredientId) && !ingredientIds.has(record.ingredientId)) {
      errors.push(`${label}.ingredientId must reference an existing food ingredient or be empty while unmatched`);
    }

    if (record?.sourceName !== gb2760OfficialStagingSource.sourceName) {
      errors.push(`${label}.sourceName must be the official NHC/platform source`);
    }

    if (record?.sourceType !== 'official_standard') {
      errors.push(`${label}.sourceType must be official_standard`);
    }

    if (record?.sourceUrl !== gb2760OfficialStagingSource.sourceUrl) {
      errors.push(`${label}.sourceUrl must be the Food Safety National Standards Data Retrieval Platform search URL`);
    }

    if (record?.downloadEndpoint !== gb2760OfficialStagingSource.downloadEndpoint) {
      errors.push(`${label}.downloadEndpoint must be the official platform download endpoint`);
    }

    if (record?.platformRecordId !== gb2760OfficialStagingSource.platformRecordId) {
      errors.push(`${label}.platformRecordId must match the official GB 2760-2024 platform record`);
    }

    if (record?.announcementRecordId !== gb2760OfficialStagingSource.announcementRecordId) {
      errors.push(`${label}.announcementRecordId must match the official NHC announcement platform record`);
    }

    if (record?.fileGuid !== gb2760OfficialStagingSource.fileGuid) {
      errors.push(`${label}.fileGuid must match the official PDF attachment`);
    }

    if (record?.factName !== gb2760OfficialStagingSource.factName) {
      errors.push(`${label}.factName must match the official platform file name`);
    }

    if (record?.pdfSha256 !== gb2760OfficialStagingSource.pdfSha256) {
      errors.push(`${label}.pdfSha256 must match the local official PDF evidence`);
    }

    if (record?.standardCode !== 'GB 2760-2024') {
      errors.push(`${label}.standardCode must be GB 2760-2024`);
    }

    if (record?.tableName !== '表 A.1') {
      errors.push(`${label}.tableName must be 表 A.1`);
    }

    if (!Number.isInteger(record?.pdfPage) || record.pdfPage <= 0) {
      errors.push(`${label}.pdfPage must be a positive integer`);
    }

    if (!Number.isInteger(record?.standardPage) || record.standardPage <= 0) {
      errors.push(`${label}.standardPage must be a positive integer`);
    }

    if (!gb2760StagingExtractionStatuses.has(record?.extractionStatus)) {
      errors.push(`${label}.extractionStatus must be one of ${formatAllowed(gb2760StagingExtractionStatuses)}`);
    }

    if (!gb2760StagingReviewStatuses.has(record?.reviewStatus)) {
      errors.push(`${label}.reviewStatus must be one of ${formatAllowed(gb2760StagingReviewStatuses)}`);
    }

    if (record?.reviewStatus === 'verified' && record?.extractionStatus !== 'verified') {
      errors.push(`${label}.verified reviewStatus requires extractionStatus "verified"`);
    }

    if (record?.maxUseLevel !== '按生产需要适量使用' && !hasText(record?.unit)) {
      errors.push(`${label}.unit is required when maxUseLevel is numeric or residue-based`);
    }

    if (!String(record?.rawSourceText || '').includes('GB 2760-2024 表 A.1')) {
      errors.push(`${label}.rawSourceText must cite GB 2760-2024 表 A.1`);
    }

    const rowKey = [
      record?.ingredientId || '',
      record?.additiveNameCn || '',
      record?.foodCategoryCode || '',
      record?.foodCategoryName || '',
      record?.maxUseLevel || '',
      record?.unit || '',
      record?.note || ''
    ].join('|');
    if (rowKeys.has(rowKey)) {
      errors.push(`${label} duplicates another staging row for the same additive/category/limit`);
    }
    rowKeys.add(rowKey);
  });

  return errors;
}

export function validateGb2760OfficialSeedCoverage(records = gb2760OfficialStagingRecords, ingredients = foodIngredients) {
  const report = getGb2760OfficialSeedCoverageReport(records, ingredients);
  const errors = [];

  if (report.unexpectedUncoveredSeedIds.length) {
    errors.push(`GB 2760 staging is missing A.1 coverage for seed ids: ${report.unexpectedUncoveredSeedIds.join(', ')}`);
  }

  if (report.coveredNotApplicableSeedIds.length) {
    errors.push(`GB 2760 staging has records for seed ids marked no-A.1-evidence: ${report.coveredNotApplicableSeedIds.join(', ')}`);
  }

  return errors;
}

export function getGb2760OfficialStagingQualityReport(records = gb2760OfficialStagingRecords) {
  const safeRecords = Array.isArray(records) ? records : [];
  const reviewStatusCounts = countBy(safeRecords, (record) => record?.reviewStatus || 'missing');
  const extractionStatusCounts = countBy(safeRecords, (record) => record?.extractionStatus || 'missing');
  const linkedIngredientIds = new Set(safeRecords.map((record) => record?.ingredientId).filter(Boolean));
  const pdfPageCount = new Set(safeRecords.map((record) => record?.pdfPage).filter(Boolean)).size;
  const sourceNameCounts = countBy(safeRecords, (record) => record?.sourceName || 'missing');

  return {
    totalCount: safeRecords.length,
    linkedIngredientCount: linkedIngredientIds.size,
    unlinkedCount: safeRecords.filter((record) => !hasText(record?.ingredientId)).length,
    pdfPageCount,
    reviewStatusCounts,
    extractionStatusCounts,
    sourceNameCounts
  };
}

export function getGb2760OfficialSeedCoverageReport(records = gb2760OfficialStagingRecords, ingredients = foodIngredients) {
  const safeRecords = Array.isArray(records) ? records : [];
  const seedIds = (Array.isArray(ingredients) ? ingredients : [])
    .filter((item) => item?.kind === 'food-additive')
    .map((item) => item.id)
    .filter(Boolean)
    .sort();
  const coveredSeedIds = new Set(safeRecords.map((record) => record?.ingredientId).filter(Boolean));
  const notApplicableSeedIds = seedIds.filter((id) => gb2760A1NoStagingRequiredSeedIds.has(id));
  const coveredApplicableSeedIds = seedIds.filter((id) => coveredSeedIds.has(id) && !gb2760A1NoStagingRequiredSeedIds.has(id));
  const uncoveredSeedIds = seedIds.filter((id) => !coveredSeedIds.has(id));
  const unexpectedUncoveredSeedIds = uncoveredSeedIds.filter((id) => !gb2760A1NoStagingRequiredSeedIds.has(id));
  const coveredNotApplicableSeedIds = seedIds.filter((id) => coveredSeedIds.has(id) && gb2760A1NoStagingRequiredSeedIds.has(id));

  return {
    seedCount: seedIds.length,
    matchingSeedCount: seedIds.length - notApplicableSeedIds.length,
    matchingCoveredSeedCount: coveredApplicableSeedIds.length,
    notApplicableSeedCount: notApplicableSeedIds.length,
    coveredSeedCount: seedIds.filter((id) => coveredSeedIds.has(id)).length,
    uncoveredSeedIds,
    unexpectedUncoveredSeedIds,
    coveredNotApplicableSeedIds,
    notApplicableSeedIds
  };
}

export function validateGb2760OfficialFullText(pages = gb2760OfficialFullTextPages) {
  const errors = [];
  const ids = new Set();
  const pdfPages = new Set();

  if (!Array.isArray(pages)) {
    return ['gb2760OfficialFullTextPages must be an array'];
  }

  if (pages.length !== 264) {
    errors.push(`gb2760OfficialFullTextPages must contain 264 pages, got ${pages.length}`);
  }

  pages.forEach((page, index) => {
    const label = page?.id || `gb2760OfficialFullTextPages[${index}]`;
    requireString(page, 'id', label, errors);
    requireString(page, 'standardCode', label, errors);
    requireString(page, 'standardTitle', label, errors);
    requireString(page, 'text', label, errors);
    requireString(page, 'textSha256', label, errors);
    requireString(page, 'sourceName', label, errors);
    requireString(page, 'sourceType', label, errors);
    requireString(page, 'sourceUrl', label, errors);
    requireString(page, 'downloadEndpoint', label, errors);
    requireString(page, 'platformRecordId', label, errors);
    requireString(page, 'announcementRecordId', label, errors);
    requireString(page, 'fileGuid', label, errors);
    requireString(page, 'factName', label, errors);
    requireString(page, 'pdfSha256', label, errors);
    requireString(page, 'retrievedAt', label, errors);
    requireString(page, 'extractionTool', label, errors);
    requireString(page, 'extractionScope', label, errors);
    requireIsoDate(page, 'generatedAt', label, errors);

    if (typeof page?.id === 'string') {
      if (ids.has(page.id)) errors.push(`Duplicate GB 2760 full-text page id "${page.id}"`);
      ids.add(page.id);
    }

    if (!Number.isInteger(page?.pdfPage) || page.pdfPage <= 0) {
      errors.push(`${label}.pdfPage must be a positive integer`);
    } else {
      if (pdfPages.has(page.pdfPage)) errors.push(`Duplicate GB 2760 full-text pdfPage "${page.pdfPage}"`);
      pdfPages.add(page.pdfPage);
      if (page.pdfPage !== index + 1) errors.push(`${label}.pdfPage must be sequential, expected ${index + 1}`);
    }

    if (page?.sourceName !== gb2760OfficialFullTextSource.sourceName) {
      errors.push(`${label}.sourceName must be the official NHC/platform source`);
    }

    if (page?.sourceType !== 'official_standard') {
      errors.push(`${label}.sourceType must be official_standard`);
    }

    if (page?.pdfSha256 !== gb2760OfficialFullTextSource.pdfSha256) {
      errors.push(`${label}.pdfSha256 must match the official PDF SHA-256`);
    }

    const textHash = createHash('sha256').update(String(page?.text || ''), 'utf8').digest('hex');
    if (page?.textSha256 !== textHash) {
      errors.push(`${label}.textSha256 does not match page text`);
    }
  });

  return errors;
}

export function getGb2760OfficialFullTextQualityReport(pages = gb2760OfficialFullTextPages) {
  const safePages = Array.isArray(pages) ? pages : [];
  return {
    totalPages: safePages.length,
    standardPageLabelCount: new Set(safePages.map((page) => page?.standardPageLabel).filter(Boolean)).size,
    emptyTextPages: safePages.filter((page) => !hasText(page?.text)).map((page) => page.pdfPage),
    textSha256Count: new Set(safePages.map((page) => page?.textSha256).filter(Boolean)).size
  };
}

export function validateGb2760OfficialReferenceTables(
  rows = gb2760OfficialReferenceRows,
  a2Rows = gb2760OfficialA2ExceptionFoodCategories,
  b1Rows = gb2760OfficialB1NoFlavorFoodCategories,
  b2Rows = gb2760OfficialB2NaturalFlavorRows,
  b3Rows = gb2760OfficialB3SyntheticFlavorRows,
  c1Rows = gb2760OfficialC1ProcessingAidRows,
  c2Rows = gb2760OfficialC2ProcessingAidRows,
  c3Rows = gb2760OfficialC3EnzymePreparationRows,
  dRows = gb2760OfficialDFunctionCategoryRows,
  e1Rows = gb2760OfficialE1FoodCategoryRows,
  fRows = gb2760OfficialFAdditiveIndexRows
) {
  const errors = [];
  const ids = new Set();
  const a2Ids = new Set((Array.isArray(a2Rows) ? a2Rows : []).map((row) => row?.id).filter(Boolean));
  const b1Ids = new Set((Array.isArray(b1Rows) ? b1Rows : []).map((row) => row?.id).filter(Boolean));
  const b1RowsById = new Map((Array.isArray(b1Rows) ? b1Rows : []).map((row) => [row?.id, row]));
  const referenceSourceSpecs = [
    { rows: a2Rows, label: 'gb2760OfficialA2ExceptionFoodCategories', expectedCount: 68, tableName: '表 A.2' },
    { rows: b1Rows, label: 'gb2760OfficialB1NoFlavorFoodCategories', expectedCount: 29, tableName: '表 B.1' },
    { rows: b2Rows, label: 'gb2760OfficialB2NaturalFlavorRows', expectedCount: 388, tableName: '表 B.2' },
    { rows: b3Rows, label: 'gb2760OfficialB3SyntheticFlavorRows', expectedCount: 1504, tableName: '表 B.3' },
    { rows: c1Rows, label: 'gb2760OfficialC1ProcessingAidRows', expectedCount: 37, tableName: '表 C.1' },
    { rows: c2Rows, label: 'gb2760OfficialC2ProcessingAidRows', expectedCount: 80, tableName: '表 C.2' },
    { rows: c3Rows, label: 'gb2760OfficialC3EnzymePreparationRows', expectedCount: 66, tableName: '表 C.3' },
    { rows: dRows, label: 'gb2760OfficialDFunctionCategoryRows', expectedCount: 23, tableName: '附录 D' },
    { rows: e1Rows, label: 'gb2760OfficialE1FoodCategoryRows', expectedCount: 318, tableName: '表 E.1' },
    { rows: fRows, label: 'gb2760OfficialFAdditiveIndexRows', expectedCount: 287, tableName: '附录 F' }
  ];
  const sourceIdsByTableName = new Map(referenceSourceSpecs.map((spec) => [
    spec.tableName,
    new Set((Array.isArray(spec.rows) ? spec.rows : []).map((row) => row?.id).filter(Boolean))
  ]));

  if (!Array.isArray(rows)) {
    return ['gb2760OfficialReferenceRows must be an array'];
  }

  for (const spec of referenceSourceSpecs) {
    if (!Array.isArray(spec.rows)) {
      errors.push(`${spec.label} must be an array`);
    } else if (spec.rows.length !== spec.expectedCount) {
      errors.push(`${spec.label} must contain ${spec.expectedCount} rows, got ${spec.rows.length}`);
    }
  }

  const sourceRows = referenceSourceSpecs.flatMap((spec) => (Array.isArray(spec.rows) ? spec.rows : []));
  if (referenceSourceSpecs.every((spec) => Array.isArray(spec.rows)) && rows.length !== sourceRows.length) {
    errors.push(`gb2760OfficialReferenceRows must contain ${sourceRows.length} rows, got ${rows.length}`);
  }

  if (referenceSourceSpecs.some((spec) => Array.isArray(spec.rows))) {
    const rowIds = new Set(rows.map((row) => row?.id).filter(Boolean));
    for (const spec of referenceSourceSpecs) {
      const missingIds = (Array.isArray(spec.rows) ? spec.rows : [])
        .map((row) => row?.id)
        .filter((id) => id && !rowIds.has(id));
      if (missingIds.length > 0) {
        errors.push(`gb2760OfficialReferenceRows must cover all ${spec.tableName} rows; missing ids: ${missingIds.join(', ')}`);
      }
    }
  }

  rows.forEach((row, index) => {
    const label = row?.id || `gb2760OfficialReferenceRows[${index}]`;
    requireString(row, 'id', label, errors);
    requireString(row, 'standardCode', label, errors);
    requireString(row, 'standardTitle', label, errors);
    requireString(row, 'tableName', label, errors);
    requireString(row, 'tableTitle', label, errors);
    requireString(row, 'rowCode', label, errors);
    requireString(row, 'rowName', label, errors);
    requireString(row, 'rawSourceText', label, errors);
    requireString(row, 'sourceName', label, errors);
    requireString(row, 'sourceType', label, errors);
    requireString(row, 'sourceUrl', label, errors);
    requireString(row, 'downloadEndpoint', label, errors);
    requireString(row, 'platformRecordId', label, errors);
    requireString(row, 'announcementRecordId', label, errors);
    requireString(row, 'fileGuid', label, errors);
    requireString(row, 'factName', label, errors);
    requireString(row, 'pdfSha256', label, errors);
    requireString(row, 'retrievedAt', label, errors);
    requireString(row, 'extractionTool', label, errors);
    requireString(row, 'extractionScope', label, errors);
    requireIsoDate(row, 'generatedAt', label, errors);

    if (typeof row?.id === 'string') {
      if (ids.has(row.id)) errors.push(`Duplicate GB 2760 reference row id "${row.id}"`);
      ids.add(row.id);
    }

    if (row?.sourceName !== gb2760OfficialReferenceTableSource.sourceName) {
      errors.push(`${label}.sourceName must be the official NHC/platform source`);
    }

    if (row?.sourceType !== 'official_standard') {
      errors.push(`${label}.sourceType must be official_standard`);
    }

    if (row?.sourceUrl !== gb2760OfficialReferenceTableSource.sourceUrl) {
      errors.push(`${label}.sourceUrl must be the Food Safety National Standards Data Retrieval Platform search URL`);
    }

    if (row?.downloadEndpoint !== gb2760OfficialReferenceTableSource.downloadEndpoint) {
      errors.push(`${label}.downloadEndpoint must be the official platform download endpoint`);
    }

    if (row?.platformRecordId !== gb2760OfficialReferenceTableSource.platformRecordId) {
      errors.push(`${label}.platformRecordId must match the official GB 2760-2024 platform record`);
    }

    if (row?.announcementRecordId !== gb2760OfficialReferenceTableSource.announcementRecordId) {
      errors.push(`${label}.announcementRecordId must match the official NHC announcement platform record`);
    }

    if (row?.fileGuid !== gb2760OfficialReferenceTableSource.fileGuid) {
      errors.push(`${label}.fileGuid must match the official PDF attachment`);
    }

    if (row?.factName !== gb2760OfficialReferenceTableSource.factName) {
      errors.push(`${label}.factName must match the official platform file name`);
    }

    if (row?.pdfSha256 !== gb2760OfficialReferenceTableSource.pdfSha256) {
      errors.push(`${label}.pdfSha256 must match the local official PDF evidence`);
    }

    if (row?.standardCode !== 'GB 2760-2024') {
      errors.push(`${label}.standardCode must be GB 2760-2024`);
    }

    if (!Number.isInteger(row?.rowNumber) || row.rowNumber <= 0) {
      errors.push(`${label}.rowNumber must be a positive integer`);
    }

    if (!Number.isInteger(row?.pdfPage) || row.pdfPage <= 0) {
      errors.push(`${label}.pdfPage must be a positive integer`);
    }

    if (!Number.isInteger(row?.standardPage) || row.standardPage <= 0) {
      errors.push(`${label}.standardPage must be a positive integer`);
    }

    if (typeof row?.rowData !== 'object' || row.rowData === null || Array.isArray(row.rowData)) {
      errors.push(`${label}.rowData must be an object`);
    }

    if (!gb2760ReferenceExtractionStatuses.has(row?.extractionStatus)) {
      errors.push(`${label}.extractionStatus must be one of ${formatAllowed(gb2760ReferenceExtractionStatuses)}`);
    }

    if (!gb2760ReferenceReviewStatuses.has(row?.reviewStatus)) {
      errors.push(`${label}.reviewStatus must be one of ${formatAllowed(gb2760ReferenceReviewStatuses)}`);
    }

    if (row?.tableName === '表 A.2') {
      if (!a2Ids.has(row.id)) errors.push(`${label} must map to an A.2 exception food category row`);
      if (!String(row?.rawSourceText || '').includes('GB 2760-2024 表 A.2')) {
        errors.push(`${label}.rawSourceText must cite GB 2760-2024 表 A.2`);
      }
      if (!/^GB 2760-2024 表 A\.2：例外食品类别编号/u.test(row?.rawSourceText || '')) {
        errors.push(`${label}.rawSourceText must identify the A.2 exception number`);
      }
    } else if (row?.tableName === '表 B.1') {
      if (!b1Ids.has(row.id)) errors.push(`${label} must map to a B.1 no-flavor food category row`);
      const b1SourceRow = b1RowsById.get(row.id);
      const expectedFootnoteMarker = b1SourceRow?.footnoteMarker || '';
      if (!String(row?.rawSourceText || '').includes('GB 2760-2024 表 B.1')) {
        errors.push(`${label}.rawSourceText must cite GB 2760-2024 表 B.1`);
      }
      if (String(row?.rawSourceText || '').includes('。。')) {
        errors.push(`${label}.rawSourceText must not contain duplicate sentence punctuation`);
      }
      if (row?.rowData?.foodCategoryCode !== row?.rowCode) {
        errors.push(`${label}.rowData.foodCategoryCode must match rowCode`);
      }
      if (row?.rowData?.footnoteMarker !== expectedFootnoteMarker) {
        errors.push(`${label}.rowData.footnoteMarker must match the B.1 source footnote marker`);
      }
      if (expectedFootnoteMarker === 'a') {
        if (row?.rowData?.flavorUseRestriction !== 'no_added_food_flavor_with_footnote_exceptions') {
          errors.push(`${label}.rowData.flavorUseRestriction must preserve B.1 footnote exceptions`);
        }
        if (row?.rowData?.footnote?.text !== gb2760OfficialB1Footnotes.a.text) {
          errors.push(`${label}.rowData.footnote.text must preserve B.1 footnote a`);
        }
        if (!Array.isArray(row?.rowData?.footnote?.exceptionUses) || row.rowData.footnote.exceptionUses.length !== 4) {
          errors.push(`${label}.rowData.footnote.exceptionUses must preserve the four B.1 footnote a exception uses`);
        }
        if (!String(row?.rawSourceText || '').includes('5 mg/100 mL') || !String(row?.rawSourceText || '').includes('7 mg/100g')) {
          errors.push(`${label}.rawSourceText must preserve B.1 footnote a exception dosage text`);
        }
      } else if (row?.rowData?.flavorUseRestriction !== 'no_added_food_flavor') {
        errors.push(`${label}.rowData.flavorUseRestriction must be no_added_food_flavor`);
      }
    } else {
      const sourceIds = sourceIdsByTableName.get(row?.tableName);
      if (!sourceIds) {
        errors.push(`${label}.tableName must identify a supported GB 2760 reference table`);
      } else if (!sourceIds.has(row.id)) {
        errors.push(`${label} must map to a ${row.tableName} source row`);
      }
      if (!String(row?.rawSourceText || '').includes(`GB 2760-2024 ${row?.tableName || ''}`)) {
        errors.push(`${label}.rawSourceText must cite GB 2760-2024 ${row?.tableName || ''}`);
      }
      if (['表 B.2', '表 B.3'].includes(row?.tableName)) {
        if (row?.rowData?.flavorCode !== row?.rowCode) {
          errors.push(`${label}.rowData.flavorCode must match rowCode`);
        }
        requireString(row.rowData, 'flavorNameCn', `${label}.rowData`, errors);
        requireString(row.rowData, 'flavorNameEn', `${label}.rowData`, errors);
        validateNoCompactLatinReferenceNames(row.rowData, ['flavorNameEn'], `${label}.rowData`, errors, row.tableName);
        requireString(row.rowData, 'femaNumber', `${label}.rowData`, errors);
      } else if (['表 C.1', '表 C.2'].includes(row?.tableName)) {
        requireString(row.rowData, 'processingAidNameCn', `${label}.rowData`, errors);
        requireString(row.rowData, 'processingAidNameEn', `${label}.rowData`, errors);
        validateNoCompactLatinReferenceNames(row.rowData, ['processingAidNameEn'], `${label}.rowData`, errors, row.tableName);
      } else if (row?.tableName === '表 C.3') {
        requireString(row.rowData, 'enzymeName', `${label}.rowData`, errors);
        requireString(row.rowData, 'source', `${label}.rowData`, errors);
        validateNoC3OrphanContinuationFragments(row.rowData, ['source', 'donor'], `${label}.rowData`, errors);
        validateNoCompactLatinReferenceNames(row.rowData, ['enzymeName', 'source', 'donor'], `${label}.rowData`, errors, row.tableName);
      } else if (row?.tableName === '附录 D') {
        requireString(row.rowData, 'functionCategoryName', `${label}.rowData`, errors);
        requireString(row.rowData, 'definition', `${label}.rowData`, errors);
      } else if (row?.tableName === '表 E.1') {
        if (row?.rowData?.foodCategoryCode !== row?.rowCode) {
          errors.push(`${label}.rowData.foodCategoryCode must match rowCode`);
        }
        requireString(row.rowData, 'foodCategoryName', `${label}.rowData`, errors);
      } else if (row?.tableName === '附录 F') {
        requireString(row.rowData, 'additiveNameCn', `${label}.rowData`, errors);
        requireString(row.rowData, 'insNumber', `${label}.rowData`, errors);
        if (!Number.isInteger(row?.rowData?.a1PageNumber) || row.rowData.a1PageNumber <= 0) {
          errors.push(`${label}.rowData.a1PageNumber must be a positive integer`);
        }
      }
    }
  });

  if (Array.isArray(a2Rows)) {
    a2Rows.forEach((row, index) => {
      const label = row?.id || `gb2760OfficialA2ExceptionFoodCategories[${index}]`;
      if (row?.exceptionNumber !== index + 1) {
        errors.push(`${label}.exceptionNumber must be sequential, expected ${index + 1}`);
      }
      requireString(row, 'id', label, errors);
      requireString(row, 'foodCategoryCode', label, errors);
      requireString(row, 'foodCategoryName', label, errors);
      requireString(row, 'rawSourceText', label, errors);
      if (!/^\d{2}(?:\.\d{2})*$/u.test(row?.foodCategoryCode || '')) {
        errors.push(`${label}.foodCategoryCode must be a dotted GB 2760 food category code`);
      }
      if (![149, 150].includes(row?.pdfPage)) {
        errors.push(`${label}.pdfPage must point to the official A.2 PDF pages`);
      }
      if (![146, 147].includes(row?.standardPage)) {
        errors.push(`${label}.standardPage must point to the official A.2 standard pages`);
      }
    });
  }

  if (Array.isArray(b1Rows)) {
    b1Rows.forEach((row, index) => {
      const label = row?.id || `gb2760OfficialB1NoFlavorFoodCategories[${index}]`;
      if (row?.rowNumber !== index + 1) {
        errors.push(`${label}.rowNumber must be sequential, expected ${index + 1}`);
      }
      requireString(row, 'id', label, errors);
      requireString(row, 'foodCategoryCode', label, errors);
      requireString(row, 'foodCategoryName', label, errors);
      requireString(row, 'rawSourceText', label, errors);
      if (!/^\d{2}(?:\.\d{2})*$/u.test(row?.foodCategoryCode || '')) {
        errors.push(`${label}.foodCategoryCode must be a dotted GB 2760 food category code`);
      }
      if (![152].includes(row?.pdfPage)) {
        errors.push(`${label}.pdfPage must point to the official B.1 PDF page`);
      }
      if (![149].includes(row?.standardPage)) {
        errors.push(`${label}.standardPage must point to the official B.1 standard page`);
      }
      if (!['', 'a'].includes(row?.footnoteMarker)) {
        errors.push(`${label}.footnoteMarker must be blank or a`);
      }
      if (row?.footnoteMarker === 'a' && !['13.01', '13.02'].includes(row?.foodCategoryCode)) {
        errors.push(`${label}.footnoteMarker a is only expected on 13.01 and 13.02`);
      }
      if (row?.footnoteMarker === 'a') {
        if (String(row?.rawSourceText || '').includes('。。')) {
          errors.push(`${label}.rawSourceText must not contain duplicate sentence punctuation`);
        }
        if (!String(row?.rawSourceText || '').includes('5 mg/100 mL') || !String(row?.rawSourceText || '').includes('7 mg/100g')) {
          errors.push(`${label}.rawSourceText must preserve B.1 footnote a exception dosage text`);
        }
        if (!String(row?.rawSourceText || '').includes('0~6个月婴幼儿配方食品不得添加任何食用香料')) {
          errors.push(`${label}.rawSourceText must preserve B.1 footnote a residual prohibition`);
        }
      }
    });
  }

  validateGeneratedReferenceSourceRows(b2Rows, {
    label: 'gb2760OfficialB2NaturalFlavorRows',
    expectedCount: 388,
    tableName: '表 B.2',
    rowCodeField: 'flavorCode',
    rowCodePattern: /^N\d{3}$/u,
    requiredFields: ['flavorNameCn', 'flavorNameEn', 'femaNumber', 'rawRowText'],
    latinReferenceFields: ['flavorNameEn'],
    pdfPageMin: 153,
    pdfPageMax: 168
  }, errors);
  validateGeneratedReferenceSourceRows(b3Rows, {
    label: 'gb2760OfficialB3SyntheticFlavorRows',
    expectedCount: 1504,
    tableName: '表 B.3',
    rowCodeField: 'flavorCode',
    rowCodePattern: /^S\d{4}$/u,
    requiredFields: ['flavorNameCn', 'flavorNameEn', 'femaNumber', 'rawRowText'],
    latinReferenceFields: ['flavorNameEn'],
    pdfPageMin: 168,
    pdfPageMax: 225
  }, errors);
  validateGeneratedReferenceSourceRows(c1Rows, {
    label: 'gb2760OfficialC1ProcessingAidRows',
    expectedCount: 37,
    tableName: '表 C.1',
    requiredFields: ['processingAidNameCn', 'processingAidNameEn', 'rawRowText'],
    latinReferenceFields: ['processingAidNameEn'],
    pdfPageMin: 226,
    pdfPageMax: 227
  }, errors);
  validateGeneratedReferenceSourceRows(c2Rows, {
    label: 'gb2760OfficialC2ProcessingAidRows',
    expectedCount: 80,
    tableName: '表 C.2',
    requiredFields: ['processingAidNameCn', 'processingAidNameEn', 'functionText', 'useScope', 'rawRowText'],
    latinReferenceFields: ['processingAidNameEn'],
    pdfPageMin: 227,
    pdfPageMax: 233
  }, errors);
  validateGeneratedReferenceSourceRows(c3Rows, {
    label: 'gb2760OfficialC3EnzymePreparationRows',
    expectedCount: 66,
    tableName: '表 C.3',
    requiredFields: ['enzymeName', 'source', 'rawRowText'],
    latinReferenceFields: ['enzymeName', 'source', 'donor'],
    pdfPageMin: 233,
    pdfPageMax: 242
  }, errors);
  validateGeneratedReferenceSourceRows(dRows, {
    label: 'gb2760OfficialDFunctionCategoryRows',
    expectedCount: 23,
    tableName: '附录 D',
    rowCodePattern: /^D\.\d{1,2}$/u,
    requiredFields: ['functionCode', 'functionCategoryName', 'definition'],
    pdfPageMin: 243,
    pdfPageMax: 243
  }, errors);
  validateGeneratedReferenceSourceRows(e1Rows, {
    label: 'gb2760OfficialE1FoodCategoryRows',
    expectedCount: 318,
    tableName: '表 E.1',
    rowCodeField: 'foodCategoryCode',
    rowCodePattern: /^\d{2}(?:\.\d{1,2})*$/u,
    requiredFields: ['foodCategoryCode', 'foodCategoryName', 'rawRowText'],
    pdfPageMin: 244,
    pdfPageMax: 254
  }, errors);
  validateGeneratedReferenceSourceRows(fRows, {
    label: 'gb2760OfficialFAdditiveIndexRows',
    expectedCount: 287,
    tableName: '附录 F',
    requiredFields: ['additiveNameCn', 'insNumber', 'rawRowText'],
    pdfPageMin: 255,
    pdfPageMax: 264
  }, errors);

  return errors;
}

function validateGeneratedReferenceSourceRows(rows, options, errors) {
  if (!Array.isArray(rows)) return;

  rows.forEach((row, index) => {
    const label = row?.id || `${options.label}[${index}]`;
    if (row?.rowNumber !== index + 1) {
      errors.push(`${label}.rowNumber must be sequential, expected ${index + 1}`);
    }
    requireString(row, 'id', label, errors);
    requireString(row, 'rowCode', label, errors);
    requireString(row, 'rowName', label, errors);
    requireString(row, 'rawSourceText', label, errors);
    if (!Number.isInteger(row?.pdfPage) || row.pdfPage < options.pdfPageMin || row.pdfPage > options.pdfPageMax) {
      errors.push(`${label}.pdfPage must point to the official ${options.tableName} PDF pages`);
    }
    if (!Number.isInteger(row?.standardPage) || row.standardPage <= 0) {
      errors.push(`${label}.standardPage must be a positive integer`);
    }
    if (!String(row?.rawSourceText || '').includes(`GB 2760-2024 ${options.tableName}`)) {
      errors.push(`${label}.rawSourceText must cite GB 2760-2024 ${options.tableName}`);
    }
    for (const field of options.requiredFields || []) {
      requireString(row, field, label, errors);
    }
    const rowCodeValue = row?.[options.rowCodeField || 'rowCode'];
    if (options.rowCodePattern && !options.rowCodePattern.test(String(rowCodeValue || ''))) {
      errors.push(`${label}.${options.rowCodeField || 'rowCode'} must match ${options.rowCodePattern}`);
    }
    if (options.tableName === '附录 F' && (!Number.isInteger(row?.a1PageNumber) || row.a1PageNumber <= 0)) {
      errors.push(`${label}.a1PageNumber must be a positive integer`);
    }
    if (options.tableName === '表 C.3') {
      validateNoC3OrphanContinuationFragments(row, ['source', 'donor'], label, errors);
    }
    if (options.latinReferenceFields) {
      validateNoCompactLatinReferenceNames(row, options.latinReferenceFields, label, errors, options.tableName);
    }
  });
}

function validateNoCompactLatinReferenceNames(item, fields, label, errors, tableName = '') {
  for (const field of fields) {
    const value = item?.[field];
    if (typeof value !== 'string' || !value) continue;
    const patterns = [
      ...compactLatinReferenceNamePatterns,
      ...(tableName === '表 B.2' ? compactNaturalFlavorNamePatterns : []),
      ...(tableName === '表 B.3' ? compactSyntheticFlavorNamePatterns : [])
    ];
    const badPattern = findBadLatinReferencePattern(patterns, value);
    if (badPattern) {
      errors.push(`${label}.${field} must preserve Latin word spacing; found compact text ${badPattern}`);
    }
  }
}

function findBadLatinReferencePattern(patterns, value) {
  for (const pattern of patterns) {
    if (typeof pattern === 'function') {
      const result = pattern(value);
      if (result) return result;
      continue;
    }
    if (pattern.test(value)) return pattern;
  }
  return undefined;
}

function findCompactSyntheticYlEsterName(value) {
  const suffixPattern = 'phenylacetate|acetoacetate|isovalerate|tetradecanoate|methylbutyrate|methylbutanoate|hydroxybutyrate|hydroxyhexanoate|methylvalerate|methylthiopropionate|mercaptopropionate|phenylpropionate|methylpentanoate|phenylglycidate|furanacrylate|undecylenate|undecenoate|decatrienoate|decadienoate|thiofuroate|heptanoate|octanoate|decanoate|dodecanoate|butenoate|hexenoate|nonenoate|pentanoate|propanoate|malonate|succinate|caproate|caprylate|myristate|laurate|sorbate|lactate|tiglate|furoate|glycidate|carbonate|levulinate|fumarate|valerate|acetate|formate|propionate|butyrate|isobutyrate|benzoate|salicylate|cinnamate';
  const pattern = new RegExp(`(^|[^A-Za-z])([A-Za-z0-9][A-Za-z0-9,'.+-]*yl)(${suffixPattern})(?=$|[^A-Za-z])`, 'giu');
  for (const match of String(value).matchAll(pattern)) {
    const leading = match[1] || '';
    const prefix = match[2] || '';
    const suffix = (match[3] || '').toLowerCase();
    if (leading === '-' && /^[a-z]+yl$/u.test(prefix)) continue;
    if (/^\d+(?:,\d+)*-[a-z]{3,}yl$/u.test(prefix) && !['acetate', 'formate'].includes(suffix)) continue;
    if (prefix.toLowerCase().endsWith('phenyl') && suffix === 'acetate') continue;
    return `compact synthetic ester "${match[0].trim()}"`;
  }
  return undefined;
}

function validateNoC3OrphanContinuationFragments(item, fields, label, errors) {
  for (const field of fields) {
    const value = item?.[field];
    if (typeof value !== 'string' || !value) continue;
    const badFragment = c3OrphanContinuationFragments.find((pattern) => pattern.test(value));
    if (badFragment) {
      errors.push(`${label}.${field} must not contain orphan C.3 continuation fragment ${badFragment}`);
    }
  }
}

export function getGb2760OfficialReferenceTableQualityReport(rows = gb2760OfficialReferenceRows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return {
    totalRows: safeRows.length,
    tableCounts: countBy(safeRows, (row) => row?.tableName || 'missing'),
    pdfPageCount: new Set(safeRows.map((row) => row?.pdfPage).filter(Boolean)).size,
    a2ExceptionFoodCategoryCount: safeRows.filter((row) => row?.tableName === '表 A.2').length,
    b1NoFlavorFoodCategoryCount: safeRows.filter((row) => row?.tableName === '表 B.1').length,
    b2NaturalFlavorCount: safeRows.filter((row) => row?.tableName === '表 B.2').length,
    b3SyntheticFlavorCount: safeRows.filter((row) => row?.tableName === '表 B.3').length,
    c1ProcessingAidCount: safeRows.filter((row) => row?.tableName === '表 C.1').length,
    c2ProcessingAidCount: safeRows.filter((row) => row?.tableName === '表 C.2').length,
    c3EnzymePreparationCount: safeRows.filter((row) => row?.tableName === '表 C.3').length,
    dFunctionCategoryCount: safeRows.filter((row) => row?.tableName === '附录 D').length,
    e1FoodCategoryCount: safeRows.filter((row) => row?.tableName === '表 E.1').length,
    fAdditiveIndexCount: safeRows.filter((row) => row?.tableName === '附录 F').length
  };
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = String(getKey(item) || 'missing');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b, 'en')));
}

function requireString(item, field, label, errors) {
  if (typeof item?.[field] !== 'string' || !item[field].trim()) {
    errors.push(`${label}.${field} is required`);
  }
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireArray(item, field, label, errors) {
  if (!Array.isArray(item?.[field])) {
    errors.push(`${label}.${field} must be an array`);
  }
}

function requireIsoDate(item, field, label, errors) {
  const value = item?.[field];
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${label}.${field} must use YYYY-MM-DD`);
  }
}

function validateUsageLimits(usageLimits, label, errors) {
  if (!Array.isArray(usageLimits)) return;
  usageLimits.forEach((limit, index) => {
    const path = `${label}.usageLimits[${index}]`;
    requireString(limit, 'foodCategory', path, errors);
    requireString(limit, 'limit', path, errors);
  });
}

function validateSourceReferences(sourceReferences, label, errors) {
  if (!Array.isArray(sourceReferences)) return;
  if (!sourceReferences.length) {
    errors.push(`${label}.sourceReferences must include at least one source`);
  }
  sourceReferences.forEach((source, index) => {
    const path = `${label}.sourceReferences[${index}]`;
    requireString(source, 'title', path, errors);
    requireString(source, 'standard', path, errors);
    requireString(source, 'url', path, errors);
    requireIsoDate(source, 'retrievedAt', path, errors);
  });
}

function validateAllowedValues(values, allowed, label, errors) {
  if (!Array.isArray(values)) return;
  for (const value of values) {
    if (!allowed.has(value)) {
      errors.push(`${label} includes unsupported value "${value}"`);
    }
  }
}

function validateNoAbsoluteMedicalClaims(item, label, errors) {
  const fields = [
    ['description', item?.description],
    ['riskSummary', item?.riskSummary],
    ['sourceNote', item?.sourceNote],
    ['regulatoryBasis', item?.regulatoryBasis],
    ['rawSourceText', item?.rawSourceText],
    ...toFieldEntries('cautionFor', item?.cautionFor),
    ...toFieldEntries('suitableFor', item?.suitableFor)
  ];

  for (const [field, value] of fields) {
    const text = String(value || '');
    const claim = absoluteMedicalClaims.find((phrase) => text.includes(phrase));
    if (claim) {
      errors.push(`${label}.${field} contains absolute medical claim "${claim}"`);
    }
  }
}

function toFieldEntries(field, values) {
  if (!Array.isArray(values)) return [];
  return values.map((value, index) => [`${field}[${index}]`, value]);
}

function formatAllowed(values) {
  return [...values].join(', ');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = [
    ...validateFoodAdditives(),
    ...validateGb2760OfficialStaging(),
    ...validateGb2760OfficialSeedCoverage(),
    ...validateGb2760OfficialFullText(),
    ...validateGb2760OfficialReferenceTables()
  ];
  const report = getFoodAdditiveQualityReport();
  const stagingReport = getGb2760OfficialStagingQualityReport();
  const coverageReport = getGb2760OfficialSeedCoverageReport();
  const fullTextReport = getGb2760OfficialFullTextQualityReport();
  const referenceTableReport = getGb2760OfficialReferenceTableQualityReport();
  if (errors.length) {
    console.error(`Data validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Data validation passed: ${foodIngredients.length} food records checked.`);
  console.log(`Data quality report: reviewed=${report.reviewedCount}, verified=${report.verifiedCount}, dataStatus=${formatCounts(report.dataStatusCounts)}, confidenceUnverified=${report.unverifiedCount}, missingSourceFields=${report.missingSourceFieldCount}, missingUsageLimits=${report.missingUsageLimitsCount}.`);
  console.log(`GB 2760 staging report: rows=${stagingReport.totalCount}, linkedIngredients=${stagingReport.linkedIngredientCount}, unlinked=${stagingReport.unlinkedCount}, pdfPages=${stagingReport.pdfPageCount}, reviewStatus=${formatCounts(stagingReport.reviewStatusCounts)}, extractionStatus=${formatCounts(stagingReport.extractionStatusCounts)}.`);
  console.log(`GB 2760 seed coverage report: matchingCovered=${coverageReport.matchingCoveredSeedCount}/${coverageReport.matchingSeedCount}, noA1Evidence=${coverageReport.notApplicableSeedCount}, unexpectedUncovered=${coverageReport.unexpectedUncoveredSeedIds.join(', ') || 'none'}.`);
  console.log(`GB 2760 full-text report: pages=${fullTextReport.totalPages}, standardPageLabels=${fullTextReport.standardPageLabelCount}, textSha256=${fullTextReport.textSha256Count}, emptyTextPages=${fullTextReport.emptyTextPages.join(', ') || 'none'}.`);
  console.log(`GB 2760 reference table report: rows=${referenceTableReport.totalRows}, a2ExceptionFoodCategories=${referenceTableReport.a2ExceptionFoodCategoryCount}, b1NoFlavorFoodCategories=${referenceTableReport.b1NoFlavorFoodCategoryCount}, pdfPages=${referenceTableReport.pdfPageCount}, tables=${formatCounts(referenceTableReport.tableCounts)}.`);
  console.log(`Data source versions: ${formatCounts(report.sourceVersionCounts)}.`);
  console.log(`Review queue sample: ${report.reviewQueue.slice(0, 10).join(', ') || 'none'}.`);
}

function formatCounts(counts) {
  return Object.entries(counts)
    .map(([key, count]) => `${key}=${count}`)
    .join('; ');
}
