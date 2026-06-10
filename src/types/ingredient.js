/**
 * @typedef {'low' | 'medium' | 'high' | 'unknown'} RiskLevel
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
 *   gbCode: string,
 *   gbStatus: GBStatus,
 *   eNumber?: string,
 *   adi?: string,
 *   usageLimits: UsageLimit[],
 *   foodCategories: string[],
 *   allergenTypes: AllergenType[],
 *   cautionGroups: ConsumerGroup[],
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
 *
 * @typedef {Object} AnalysisResult
 * @property {Ingredient[]} ingredients
 * @property {number} matchedCount
 * @property {string[]} unknownItems
 * @property {Ingredient[]} highlights
 * @property {string} summary
 */

export {};
