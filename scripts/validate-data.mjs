import { fileURLToPath } from 'node:url';
import { foodAdditives } from '../src/data/foodAdditives.js';
import { standardAllergenTypes } from '../src/data/allergens.js';

const riskLevels = new Set(['low', 'medium', 'high', 'unknown']);
const gbStatuses = new Set(['permitted', 'restricted', 'prohibited', 'unknown']);
const reviewStatuses = new Set(['draft', 'reviewed', 'verified']);
const sourceTypes = new Set(['official_standard', 'regulation', 'public_database', 'manual_verified', 'unknown']);
const confidenceLevels = new Set(['high', 'medium', 'low', 'unverified']);
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

export function validateFoodAdditives(items = foodAdditives) {
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

    if (item?.kind !== 'food-additive') {
      errors.push(`${label}.kind must be "food-additive"`);
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

    if (!sourceTypes.has(item?.sourceType)) {
      errors.push(`${label}.sourceType must be one of ${formatAllowed(sourceTypes)}`);
    }

    if (!confidenceLevels.has(item?.confidenceLevel)) {
      errors.push(`${label}.confidenceLevel must be one of ${formatAllowed(confidenceLevels)}`);
    }

    if (typeof item?.isVerified !== 'boolean') {
      errors.push(`${label}.isVerified must be a boolean`);
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
  const errors = validateFoodAdditives();
  if (errors.length) {
    console.error(`Data validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Data validation passed: ${foodAdditives.length} food additive records checked.`);
}
