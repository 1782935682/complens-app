export type LabelType = 'ingredient_list' | 'nutrition_facts' | 'front_claims' | 'barcode_or_product' | 'unknown_label';

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
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  confidence?: number;
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
  fallbackOnly?: boolean;
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
  matchedDataStatus?: DataStatus;
  matchedSourceType?: string;
  matchedSourceNote?: string;
  matchedIsAdditive?: boolean;
  webSearchUrl?: string;
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
  | 'salt'
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
  primaryGoal: 'daily' | 'sugar' | 'fatLoss' | 'lowSodium';
  isChildrenMode: boolean;
  allergens: string[];
  updatedAt: string;
}

export interface AttentionHit {
  key: string;
  label: string;
  reason: string;
  terms: string[];
}

export type NutritionIngredientCheckState = 'possible_issue' | 'no_obvious_issue' | 'insufficient_data';

export interface NutritionIngredientCheck {
  key: 'sugar' | 'sodium';
  title: string;
  nutritionValue: string;
  nutritionUnit: string;
  ingredientSignals: string[];
  state: NutritionIngredientCheckState;
  summary: string;
}

export type AdditiveCategory =
  | '防腐剂'
  | '甜味剂'
  | '色素'
  | '质地改良剂'
  | '香精香料'
  | '其他添加剂';

export interface AdditiveRecognition {
  id: string;
  name: string;
  category: AdditiveCategory;
  effect: string;
  reminder: string;
  displayLevel: 'normal' | 'watch' | 'focus';
  matchedTerms: string[];
  targetNotes: string[];
}

export interface AdditiveRecognitionSummary {
  total: number;
  categoryCount: number;
  items: AdditiveRecognition[];
}

export interface NutritionSnapshotItem {
  key: NutritionKey;
  label: string;
  valueText: string;
  level: '较低' | '中等' | '一般' | '较高' | '未识别';
  note: string;
  percent: number;
}

export type ConsumerDecisionLevel = 'daily_ok' | 'occasional' | 'caution' | 'alternative' | 'insufficient';

export interface ConsumerDecision {
  level: ConsumerDecisionLevel;
  label: string;
  summary: string;
  tags: string[];
  watchPoints: string[];
  allergyWarnings: string[];
  suitableFor: string[];
  lessSuitableFor: string[];
  reasons: string[];
  suggestions: string[];
  score: number;
}

export interface ScanDraft {
  image?: LocalImageAsset;
  labelType: LabelType;
  isFastScan?: boolean;
  scanSessionId?: string;
  classification?: LabelClassification;
  ocr?: OcrResult;
  confirmedText: string;
  productName: string;
  ingredients: ParsedIngredient[];
  nutrition: NutritionField[];
  matches: IngredientMatch[];
  frontClaimsText: string;
  sourceMeta?: ReportAnalysisSource;
  updatedAt: string;
}

export interface ReportSource {
  label: string;
  detail: string;
  sourceType: 'ocr_input' | 'manual_input' | 'official_standard' | 'safety_evaluation' | 'manual_review' | 'common_ingredient' | 'mock_adapter';
}

export type AnalysisSourceType =
  | 'captured_ingredient'
  | 'captured_nutrition'
  | 'captured_product'
  | 'manual_input'
  | 'demo_sample'
  | 'history';

export interface ReportAnalysisSource {
  sourceType: AnalysisSourceType;
  sourceLabel: string;
  description: string;
  fromUserCapture: boolean;
  fromManualInput: boolean;
  imagePath?: string;
  imageSummary?: string;
  ocrText?: string;
  ingredientText?: string;
  nutritionText?: string;
  allergenText?: string;
  frontClaimsText?: string;
  confidence?: 'high' | 'medium' | 'low';
  inputSourceType?: 'ocr' | 'manual' | 'demo';
  targetSnapshot: {
    primaryGoal: AttentionSettings['primaryGoal'];
    isChildrenMode: boolean;
    allergens: string[];
  };
}

export interface LabelReport {
  id: string;
  title: string;
  productName: string;
  createdAt: string;
  summarySentence: string;
  decision?: ConsumerDecision;
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
  additiveRecognition?: AdditiveRecognitionSummary;
  nutritionSnapshot?: NutritionSnapshotItem[];
  frontClaimsSection?: {
    text: string;
    highlights: string[];
  };
  nutritionIngredientChecks?: NutritionIngredientCheck[];
  additiveGroups: Array<{ label: string; items: IngredientMatch[] }>;
  allergenHints: string[];
  unknownItems: string[];
  analysisSource?: ReportAnalysisSource;
  sources: ReportSource[];
  rawText: string;
}
