/**
 * @typedef {'low' | 'medium' | 'high' | 'unknown'} RiskLevel
 * @typedef {'food' | 'cosmetics'} DataCategory
 * @typedef {'cosmetic' | 'food-additive'} IngredientKind
 * @typedef {'permitted' | 'restricted' | 'prohibited' | 'unknown'} GBStatus
 * @typedef {'draft' | 'reviewed' | 'verified'} DataReviewStatus
 * @typedef {'pregnant' | 'infant' | 'child' | 'diabetic' | 'renal' | 'sensitive'} ConsumerGroup
 * @typedef {'celery' | 'cereals-gluten' | 'crustaceans' | 'eggs' | 'fish' | 'lupin' | 'milk' | 'molluscs' | 'mustard' | 'peanuts' | 'sesame' | 'soybeans' | 'sulphites' | 'tree-nuts'} AllergenType
 *
 * @typedef {Object} SourceReference
 * @property {string} title
 * @property {string} standard
 * @property {string=} region
 * @property {string=} url
 * @property {string=} publishedAt
 * @property {string=} retrievedAt
 *
 * @typedef {Object} UsageLimit
 * @property {string} foodCategory
 * @property {string} limit
 * @property {string=} note
 *
 * @typedef {Object} Ingredient
 * @property {string} id
 * @property {IngredientKind=} kind
 * @property {string} nameCn
 * @property {string=} nameEn
 * @property {string[]=} aliases
 * @property {string=} category
 * @property {string[]=} functions
 * @property {string} description
 * @property {RiskLevel} riskLevel
 * @property {string=} riskSummary
 * @property {string[]=} suitableFor
 * @property {string[]=} cautionFor
 * @property {string=} sourceNote
 * @property {SourceReference[]=} sourceReferences
 * @property {DataReviewStatus=} reviewStatus
 * @property {string=} dataVersion
 * @property {string=} updatedAt
 *
 * @typedef {Ingredient & {
 *   kind: 'food-additive',
 *   dataCategory: 'food',
 *   gbCode: string,
 *   gbStatus: GBStatus,
 *   eNumber?: string,
 *   adi?: string,
 *   usageLimits: UsageLimit[],
 *   foodCategories: string[],
 *   allergenTypes: AllergenType[],
 *   cautionGroups: ConsumerGroup[],
 *   sourceNote: string,
 *   sourceReferences: SourceReference[],
 *   reviewStatus: DataReviewStatus,
 *   dataVersion: string,
 *   updatedAt: string
 * }} FoodAdditive
 *
 * @typedef {Object} SearchResult
 * @property {string} id
 * @property {string} nameCn
 * @property {string=} nameEn
 * @property {string} description
 * @property {RiskLevel} riskLevel
 * @property {string=} category
 * @property {AllergenType[]=} allergenTypes
 *
 * @typedef {SearchResult & {
 *   matchedText?: string,
 *   matchLabel?: string
 * }} SearchSuggestion
 *
 * @typedef {Object} AnalysisResult
 * @property {Ingredient[]} ingredients
 * @property {number} matchedCount
 * @property {string[]} unknownItems
 * @property {Ingredient[]} highlights
 * @property {string} summary
 *
 * @typedef {Object} AnalysisReportAllergenHit
 * @property {string} id
 * @property {AllergenType[]} allergenIds
 *
 * @typedef {Object} AnalysisReportTextAllergenHit
 * @property {string} item
 * @property {AllergenType[]} allergenIds
 *
 * @typedef {Object} AnalysisReport
 * @property {string} id
 * @property {DataCategory} category
 * @property {string} title
 * @property {string} input
 * @property {string} createdAt
 * @property {number} matchedCount
 * @property {string} summary
 * @property {string[]} matchedIngredientIds
 * @property {string[]} highlightIngredientIds
 * @property {string[]} unknownItems
 * @property {Record<RiskLevel, number>} riskCounts
 * @property {AllergenType[]} userAllergenIds
 * @property {AnalysisReportAllergenHit[]} ingredientAllergenHits
 * @property {AnalysisReportTextAllergenHit[]} textAllergenHits
 * @property {number} schemaVersion
 */

export {};
