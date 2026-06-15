import { Hono } from 'hono';
import type { ReportBuildInput, ReportLabelType, ReportService } from '../services/reportService.js';

type ReportLabelPayload = {
  productName?: unknown;
  rawText?: unknown;
  ingredients?: unknown;
  matches?: unknown;
  nutrition?: unknown;
  attention?: unknown;
  labelType?: unknown;
  frontClaimsText?: unknown;
  ocr?: unknown;
};

const validLabelTypes = ['ingredient_list', 'nutrition_facts', 'front_claims', 'barcode_or_product', 'unknown_label'] as const;

export function createReportsRoute(reportService: ReportService) {
  const route = new Hono();

  route.post('/reports/label', async (context) => {
    const parsed = await parseReportLabelBody(context);
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const ingredients = parsed.value.ingredients ?? [];
    const nutrition = parsed.value.nutrition ?? [];
    if (!parsed.value.rawText && !ingredients.length && !nutrition.length && !parsed.value.frontClaimsText) {
      return context.json({
        error: 'insufficient_label_data',
        message: 'Need at least raw text, ingredients, nutrition, or front-claims text to generate a report.'
      }, 422);
    }

    const report = await reportService.buildLabelReport(parsed.value);
    return context.json(report);
  });

  return route;
}

async function parseReportLabelBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidParameter('body', 'request body must be an object');
    }

    const parsed = parseReportLabelInput(body as ReportLabelPayload);
    if (!parsed.ok) return parsed;

    return {
      ok: true as const,
      value: parsed.value
    };
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

function parseReportLabelInput(body: ReportLabelPayload) {
  const productName = parseOptionalString(body.productName, 'productName', 200);
  if (!productName.ok) return productName;

  const rawText = parseOptionalString(body.rawText, 'rawText', 12000);
  if (!rawText.ok) return rawText;

  const frontClaimsText = parseOptionalString(body.frontClaimsText, 'frontClaimsText', 4000);
  if (!frontClaimsText.ok) return frontClaimsText;

  const ingredients = parseObjectArray(body.ingredients, 'ingredients', 300);
  if (!ingredients.ok) return ingredients;
  const normalizedIngredients = [];
  for (let index = 0; index < ingredients.value.length; index++) {
    const ingredient = ingredients.value[index];
    const parsedIngredient = parseIngredient(ingredient, index);
    if (!parsedIngredient.ok) return parsedIngredient;
    normalizedIngredients.push(parsedIngredient.value);
  }

  const matches = parseObjectArray(body.matches, 'matches', 300);
  if (!matches.ok) return matches;
  const normalizedMatches = [];
  for (let index = 0; index < matches.value.length; index++) {
    const match = matches.value[index];
    const parsedMatch = parseMatch(match, index);
    if (!parsedMatch.ok) return parsedMatch;
    normalizedMatches.push(parsedMatch.value);
  }

  const nutrition = parseObjectArray(body.nutrition, 'nutrition', 50);
  if (!nutrition.ok) return nutrition;
  const normalizedNutrition = [];
  for (let index = 0; index < nutrition.value.length; index++) {
    const nutrient = nutrition.value[index];
    const parsedNutrition = parseNutritionField(nutrient, index);
    if (!parsedNutrition.ok) return parsedNutrition;
    normalizedNutrition.push(parsedNutrition.value);
  }

  const attention = parseAttention(body.attention);
  if (!attention.ok) return attention;

  const ocr = parseOcr(body.ocr);
  if (!ocr.ok) return ocr;

  const labelType = parseLabelType(body.labelType);
  if (!labelType.ok) return labelType;

  return {
    ok: true as const,
    value: {
      productName: productName.value,
      rawText: rawText.value,
      ingredients: normalizedIngredients,
      matches: normalizedMatches,
      nutrition: normalizedNutrition,
      attention: attention.value,
      labelType: labelType.value,
      frontClaimsText: frontClaimsText.value,
      ocr: ocr.value
    } as ReportBuildInput
    };
}

function parseLabelType(value: unknown) {
  if (value === undefined || value === null) {
    return {
      ok: true as const,
      value: undefined
    };
  }

  if (typeof value !== 'string' || !isLabelType(value)) {
    return invalidParameter('labelType', `labelType must be one of ${validLabelTypes.join(', ')}`);
  }

  return {
    ok: true as const,
    value: value as ReportLabelType
  };
}

function parseAttention(value: unknown) {
  if (value === undefined || value === null) {
    return {
      ok: true as const,
      value: {
        goals: ['sugar_control', 'low_sodium', 'fewer_additives'],
        detailTerms: [],
        customTerms: []
      }
    };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return invalidParameter('attention', 'attention must be an object');
  }

  const input = value as Record<string, unknown>;

  const goalsParsed = parseStringArray(input.goals, 'attention.goals');
  if (!goalsParsed.ok) return goalsParsed;

  const detailTermsParsed = parseStringArray(input.detailTerms, 'attention.detailTerms');
  if (!detailTermsParsed.ok) return detailTermsParsed;

  const customTermsParsed = parseStringArray(input.customTerms, 'attention.customTerms');
  if (!customTermsParsed.ok) return customTermsParsed;

  return {
    ok: true as const,
    value: {
      goals: dedupeStringList(goalsParsed.value),
      detailTerms: dedupeStringList(detailTermsParsed.value),
      customTerms: dedupeStringList(customTermsParsed.value)
    }
  };
}

function parseOcr(value: unknown) {
  if (value === undefined || value === null) {
    return {
      ok: true as const,
      value: undefined
    };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return invalidParameter('ocr', 'ocr must be an object');
  }

  const input = value as Record<string, unknown>;
  const mode = parseOptionalString(input.mode, 'ocr.mode', 20);
  if (!mode.ok) return mode;
  const provider = parseOptionalString(input.provider, 'ocr.provider', 30);
  if (!provider.ok) return provider;

  return {
    ok: true as const,
    value: {
      mode: mode.value,
      provider: provider.value
    }
  };
}

function parseObjectArray(value: unknown, field: string, maxItems: number) {
  if (value === undefined || value === null) {
    return {
      ok: true as const,
      value: [] as Record<string, unknown>[]
    };
  }

  if (!Array.isArray(value)) {
    return invalidParameter(field, `${field} must be an array`);
  }

  if (value.length > maxItems) {
    return invalidParameter(field, `${field} must include no more than ${maxItems} items`);
  }

  const normalized = value
    .map((item) => (item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : undefined))
    .filter(Boolean) as Record<string, unknown>[];

  if (normalized.length !== value.length) {
    return invalidParameter(field, `${field} must only contain object items`);
  }

  return {
    ok: true as const,
    value: normalized
  };
}

function parseIngredient(value: Record<string, unknown>, index: number) {
  const id = parseOptionalString(value.id, `ingredients[${index}].id`, 200);
  if (!id.ok) return id;

  const rawText = parseOptionalString(value.rawText, `ingredients[${index}].rawText`, 200);
  if (!rawText.ok) return rawText;

  const normalizedText = parseOptionalString(value.normalizedText, `ingredients[${index}].normalizedText`, 200);
  if (!normalizedText.ok) return normalizedText;

  const isSubIngredient = parseBoolean(value.isSubIngredient, `ingredients[${index}].isSubIngredient`);
  if (!isSubIngredient.ok) return isSubIngredient;

  const parentLabel = parseOptionalString(value.parentLabel, `ingredients[${index}].parentLabel`, 200);
  if (!parentLabel.ok) return parentLabel;

  const isUnknown = parseBoolean(value.isUnknown, `ingredients[${index}].isUnknown`);
  if (!isUnknown.ok) return isUnknown;

  return {
    ok: true as const,
    value: {
      id: id.value,
      rawText: rawText.value || '',
      normalizedText: normalizedText.value || '',
      isSubIngredient: isSubIngredient.value,
      parentLabel: parentLabel.value,
      isUnknown: isUnknown.value
    }
  };
}

function parseMatch(value: Record<string, unknown>, index: number) {
  const normalizedText = parseOptionalString(value.normalizedText, `matches[${index}].normalizedText`, 200);
  if (!normalizedText.ok) return normalizedText;

  const term = parseOptionalString(value.term, `matches[${index}].term`, 200);
  if (!term.ok) return term;

  const id = parseOptionalString(value.id, `matches[${index}].id`, 200);
  if (!id.ok) return id;

  const ingredientId = parseOptionalString(value.ingredientId, `matches[${index}].ingredientId`, 200);
  if (!ingredientId.ok) return ingredientId;

  const ingredientName = parseOptionalString(value.ingredientName, `matches[${index}].ingredientName`, 200);
  if (!ingredientName.ok) return ingredientName;

  const sourceName = parseOptionalString(value.sourceName, `matches[${index}].sourceName`, 200);
  if (!sourceName.ok) return sourceName;

  const sourceType = parseOptionalString(value.sourceType, `matches[${index}].sourceType`, 80);
  if (!sourceType.ok) return sourceType;

  const sourceNote = parseOptionalString(value.sourceNote, `matches[${index}].sourceNote`, 500);
  if (!sourceNote.ok) return sourceNote;

  const matchedSourceType = parseOptionalString(value.matchedSourceType, `matches[${index}].matchedSourceType`, 80);
  if (!matchedSourceType.ok) return matchedSourceType;

  const matchedSourceNote = parseOptionalString(value.matchedSourceNote, `matches[${index}].matchedSourceNote`, 500);
  if (!matchedSourceNote.ok) return matchedSourceNote;

  const dataStatus = parseOptionalString(value.dataStatus, `matches[${index}].dataStatus`, 40);
  if (!dataStatus.ok) return dataStatus;

  const dataStatusLabel = parseOptionalString(value.dataStatusLabel, `matches[${index}].dataStatusLabel`, 40);
  if (!dataStatusLabel.ok) return dataStatusLabel;

  const matchType = parseStringLiteral(
    value.matchType,
    `matches[${index}].matchType`,
    ['exact', 'alias', 'eNumber', 'fuzzy', 'none', 'local_attention'],
    20
  );
  if (!matchType.ok) return matchType;

  const decision = parseStringLiteral(
    value.decision,
    `matches[${index}].decision`,
    ['pending', 'confirmed', 'rejected'],
    20
  );
  if (!decision.ok) return decision;

  const isAdditive = parseBoolean(value.isAdditive, `matches[${index}].isAdditive`);
  if (!isAdditive.ok) return isAdditive;

  const matchedIsAdditive = parseBoolean(value.matchedIsAdditive, `matches[${index}].matchedIsAdditive`);
  if (!matchedIsAdditive.ok) return matchedIsAdditive;

  const matchedDataStatus = parseOptionalString(value.matchedDataStatus, `matches[${index}].matchedDataStatus`, 40);
  if (!matchedDataStatus.ok) return matchedDataStatus;

  const confidence = parseOptionalNumber(value.confidence, `matches[${index}].confidence`);
  if (!confidence.ok) return confidence;

  return {
    ok: true as const,
    value: {
      id: id.value,
      term: term.value || normalizedText.value || '',
      normalizedText: normalizedText.value || term.value || '',
      dataStatus: dataStatus.value,
      dataStatusLabel: dataStatusLabel.value,
      confidence: confidence.value,
      matchType: matchType.value,
      sourceName: sourceName.value,
      sourceType: sourceType.value,
      sourceNote: sourceNote.value,
      ingredientId: ingredientId.value,
      ingredientName: ingredientName.value,
      isAdditive: isAdditive.value,
      decision: decision.value,
      matchedDataStatus: matchedDataStatus.value,
      matchedSourceType: matchedSourceType.value,
      matchedSourceNote: matchedSourceNote.value,
      matchedIsAdditive: matchedIsAdditive.value
    }
  };
}

function parseNutritionField(value: Record<string, unknown>, index: number) {
  const key = parseOptionalString(value.key, `nutrition[${index}].key`, 20);
  if (!key.ok) return key;
  const label = parseOptionalString(value.label, `nutrition[${index}].label`, 40);
  if (!label.ok) return label;
  const sourceText = parseOptionalString(value.sourceText, `nutrition[${index}].sourceText`, 300);
  if (!sourceText.ok) return sourceText;
  const unit = parseOptionalString(value.unit, `nutrition[${index}].unit`, 20);
  if (!unit.ok) return unit;
  const valueValue = parseOptionalString(value.value, `nutrition[${index}].value`, 80);
  if (!valueValue.ok) return valueValue;
  const nrvPercent = parseOptionalString(value.nrvPercent, `nutrition[${index}].nrvPercent`, 80);
  if (!nrvPercent.ok) return nrvPercent;
  const confidence = parseOptionalNumber(value.confidence, `nutrition[${index}].confidence`);
  if (!confidence.ok) return confidence;

  return {
    ok: true as const,
    value: {
      key: key.value,
      label: label.value,
      sourceText: sourceText.value,
      unit: unit.value,
      value: valueValue.value,
      nrvPercent: nrvPercent.value,
      confidence: confidence.value
    }
  };
}

function parseStringArray(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return {
      ok: true as const,
      value: [] as string[]
    };
  }

  if (!Array.isArray(value)) {
    return invalidParameter(field, `${field} must be an array`);
  }

  const normalized = value.map((item) => {
    if (typeof item !== 'string') return '';
    return item.trim();
  }).filter(Boolean);

  return {
    ok: true as const,
    value: normalized
  };
}

function parseOptionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return { ok: true as const, value: undefined as number | undefined };
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return invalidParameter(field, `${field} must be a number`);
  }

  return { ok: true as const, value: value };
}

function parseStringLiteral(value: unknown, field: string, allowed: string[], maxLength: number) {
  if (value === undefined || value === null) return { ok: true as const, value: undefined as string | undefined };
  if (typeof value !== 'string') return invalidParameter(field, `${field} must be a string`);
  if (!allowed.includes(value)) return invalidParameter(field, `${field} must be one of ${allowed.join(', ')}`);
  if (value.length > maxLength) return invalidParameter(field, `${field} must be no longer than ${maxLength} characters`);

  return { ok: true as const, value };
}

function parseBoolean(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return {
      ok: true as const,
      value: false
    };
  }

  if (typeof value === 'boolean') {
    return { ok: true as const, value: value };
  }

  return invalidParameter(field, `${field} must be a boolean`);
}

function parseOptionalString(value: unknown, field: string, maxLength: number) {
  if (value === undefined || value === null) {
    return { ok: true as const, value: undefined as string | undefined };
  }

  if (typeof value !== 'string') {
    return invalidParameter(field, `${field} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return invalidParameter(field, `${field} must be no longer than ${maxLength} characters`);
  }

  return {
    ok: true as const,
    value: trimmed
  };
}

function dedupeStringList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isLabelType(value: string): value is ReportLabelType {
  return validLabelTypes.includes(value as ReportLabelType);
}

function invalidParameter(field: string, message: string) {
  return {
    ok: false as const,
    error: {
      error: 'invalid_parameter',
      field,
      message
    }
  };
}
