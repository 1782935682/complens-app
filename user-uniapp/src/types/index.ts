export type LabelType = 'ingredient_list' | 'nutrition_facts' | 'front_claims' | 'unknown_label';

export type DataStatus =
  | 'verified_regulation'
  | 'verified_jecfa'
  | 'pending_review'
  | 'mapped_candidate'
  | 'common_ingredient'
  | 'unverified'
  | 'unknown_from_ocr';

export interface LocalImageAsset {
  id: string;
  tempFilePath: string;
  name: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  file?: File;
  storage: 'temp-file' | 'h5-file' | 'platform-file';
}

export interface OcrBlock {
  text: string;
  confidence: number;
}

export interface OcrResult {
  mode: 'real' | 'manual' | 'fallback' | 'mock';
  text: string;
  confidence: number;
  provider: 'manual' | 'mock' | 'aliyun' | 'paddleocr' | 'rapidocr' | 'none';
  blocks: OcrBlock[];
  errorCode?: string;
  errorMessage?: string;
  requiresUserConfirmation: true;
}

export interface LabelClassification {
  labelType: LabelType;
  confidence: number;
  requiresUserSelection: boolean;
  reasons: string[];
  mockOnly?: boolean;
}

export interface ParsedIngredient {
  id: string;
  rawText: string;
  normalizedText: string;
  isSubIngredient: boolean;
  parentLabel?: string;
  isUnknown: boolean;
  dataStatus?: DataStatus;
}

export interface IngredientMatch {
  id: string;
  term: string;
  normalizedText: string;
  dataStatus: DataStatus;
  dataStatusLabel: string;
  confidence: number;
  matchType: 'exact' | 'alias' | 'eNumber' | 'fuzzy' | 'none' | 'local_attention';
  sourceName?: string;
  sourceType?: string;
  sourceNote: string;
  ingredientId?: string;
  ingredientName?: string;
  isAdditive: boolean;
  decision: 'pending' | 'confirmed' | 'rejected';
}

export type NutritionKey =
  | 'energy'
  | 'protein'
  | 'fat'
  | 'saturatedFat'
  | 'transFat'
  | 'carbohydrate'
  | 'sugar'
  | 'sodium'
  | 'dietaryFiber'
  | 'servingSize'
  | 'perUnit'
  | 'nrvPercent';

export interface NutritionField {
  key: NutritionKey;
  label: string;
  value: string;
  unit: string;
  nrvPercent?: string;
  sourceText?: string;
  confidence: number;
}

export interface AttentionSettings {
  goals: string[];
  detailTerms: string[];
  customTerms: string[];
  updatedAt: string;
}

export interface AttentionHit {
  key: string;
  label: string;
  reason: string;
  terms: string[];
}

export interface ScanDraft {
  image?: LocalImageAsset;
  labelType: LabelType;
  classification?: LabelClassification;
  ocr?: OcrResult;
  confirmedText: string;
  productName: string;
  ingredients: ParsedIngredient[];
  nutrition: NutritionField[];
  matches: IngredientMatch[];
  frontClaimsText: string;
  updatedAt: string;
}

export interface ReportSource {
  label: string;
  detail: string;
  sourceType: 'ocr_input' | 'manual_input' | 'official_standard' | 'safety_evaluation' | 'manual_review' | 'common_ingredient' | 'mock_adapter';
}

export interface LabelReport {
  id: string;
  title: string;
  productName: string;
  createdAt: string;
  summarySentence: string;
  attentionHits: AttentionHit[];
  focusItems: string[];
  ingredientSection: {
    total: number;
    additiveCount: number;
    items: IngredientMatch[];
  };
  nutritionSection: {
    fields: NutritionField[];
    highlights: string[];
  };
  frontClaimsSection?: {
    text: string;
    highlights: string[];
  };
  additiveGroups: Array<{ label: string; items: IngredientMatch[] }>;
  allergenHints: string[];
  unknownItems: string[];
  sources: ReportSource[];
  rawText: string;
}
