/**
 * @typedef {'low' | 'medium' | 'high' | 'unknown'} RiskLevel
 * @typedef {'food' | 'cosmetics'} DataCategory
 * @typedef {'cosmetic' | 'food-additive' | 'common-food-ingredient'} IngredientKind
 * @typedef {'permitted' | 'restricted' | 'prohibited' | 'unknown'} GBStatus
 * @typedef {'draft' | 'reviewed' | 'verified'} DataReviewStatus
 * @typedef {'verified_regulation' | 'verified_jecfa' | 'pending_review' | 'mapped_candidate' | 'common_ingredient' | 'unverified' | 'unknown_from_ocr'} DataStatus
 * @typedef {'official_standard' | 'regulation' | 'public_database' | 'manual_verified' | 'unknown'} SourceType
 * @typedef {'gb_2760_regulation' | 'jecfa_safety_evaluation' | 'candidate_mapping' | 'common_ingredient_lexicon' | 'ocr_unmatched' | 'seed_reference' | 'unknown'} SourceScope
 * @typedef {'high' | 'medium' | 'low' | 'unverified'} ConfidenceLevel
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
 * @property {DataStatus=} dataStatus
 * @property {string=} dataVersion
 * @property {string=} reviewedBy
 * @property {string=} reviewedAt
 * @property {string=} changeNote
 * @property {string=} updatedAt
 * @property {string=} sourceName
 * @property {SourceType=} sourceType
 * @property {SourceScope=} sourceScope
 * @property {string=} sourceVersion
 * @property {string=} sourceUrl
 * @property {string=} effectiveDate
 * @property {ConfidenceLevel=} confidenceLevel
 * @property {ConfidenceLevel=} matchConfidence
 * @property {string=} lastReviewedAt
 * @property {string=} reviewNote
 * @property {string=} regulatoryBasis
 * @property {string=} rawSourceText
 * @property {boolean=} isVerified
 *
 * @typedef {Ingredient & {
 *   kind: 'food-additive' | 'common-food-ingredient',
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
 *   dataStatus: DataStatus,
 *   dataVersion: string,
 *   reviewedBy?: string,
 *   reviewedAt?: string,
 *   changeNote?: string,
 *   updatedAt: string,
 *   sourceName: string,
 *   sourceType: SourceType,
 *   sourceScope: SourceScope,
 *   sourceVersion: string,
 *   sourceUrl: string,
 *   effectiveDate: string,
 *   confidenceLevel: ConfidenceLevel,
 *   matchConfidence: ConfidenceLevel,
 *   lastReviewedAt: string,
 *   reviewNote: string,
 *   regulatoryBasis: string,
 *   rawSourceText: string,
 *   isVerified: boolean
 * }} FoodAdditive
 *
 * @typedef {Object} SearchResult
 * @property {string} id
 * @property {string} nameCn
 * @property {string=} nameEn
 * @property {string} description
 * @property {RiskLevel} riskLevel
 * @property {string=} category
 * @property {string=} gbCode
 * @property {string=} eNumber
 * @property {AllergenType[]=} allergenTypes
 * @property {ConfidenceLevel=} confidenceLevel
 * @property {ConfidenceLevel=} matchConfidence
 * @property {DataStatus=} dataStatus
 * @property {SourceScope=} sourceScope
 * @property {boolean=} isVerified
 * @property {string=} sourceName
 *
 * @typedef {SearchResult & {
 *   matchedText?: string,
 *   matchLabel?: string
 * }} SearchSuggestion
 *
 * @typedef {SearchResult & {
 *   relationReasons: string[]
 * }} RelatedIngredientResult
 *
 * @typedef {Object} IngredientCategorySummary
 * @property {string} name
 * @property {number} count
 * @property {Record<RiskLevel, number>} riskCounts
 *
 * @typedef {Object} AnalysisResult
 * @property {Ingredient[]} ingredients
 * @property {number} matchedCount
 * @property {string[]} unknownItems
 * @property {Ingredient[]} highlights
 * @property {AnalysisItem[]=} analysisItems
 * @property {AnalysisQuality=} quality
 * @property {string} summary
 *
 * @typedef {Object} AnalysisItem
 * @property {'matched' | 'unknown'} type
 * @property {string} inputText
 * @property {string=} ingredientId
 * @property {string=} nameCn
 * @property {string=} matchedText
 * @property {string=} matchLabel
 * @property {'low' | 'medium' | 'high'} confidence
 * @property {string} confidenceLabel
 * @property {string} note
 *
 * @typedef {Object} AnalysisQuality
 * @property {number} totalCount
 * @property {number} matchedCount
 * @property {number} unknownCount
 * @property {number} highConfidenceCount
 * @property {number} mediumConfidenceCount
 * @property {number} lowConfidenceCount
 * @property {number} coveragePercent
 * @property {boolean} needsReview
 *
 * @typedef {Object} AIIngredientSummary
 * @property {string} id
 * @property {string} nameCn
 * @property {string} nameEn
 * @property {string} category
 * @property {RiskLevel} riskLevel
 * @property {string} description
 * @property {string} riskSummary
 * @property {string} gbCode
 * @property {string} eNumber
 * @property {AllergenType[]} allergenTypes
 * @property {ConsumerGroup[]} cautionGroups
 *
 * @typedef {Object} AIAnalysisRequest
 * @property {number} protocolVersion
 * @property {'ingredient-analysis'} requestType
 * @property {DataCategory} category
 * @property {string} categoryLabel
 * @property {string} locale
 * @property {string} input
 * @property {string} generatedAt
 * @property {{allergenIds: AllergenType[], consumerGroups: ConsumerGroup[]}} userContext
 * @property {{summary: string, matchedCount: number, unknownItems: string[], riskCounts: Record<RiskLevel, number>, highlightIngredientIds: string[], ingredients: AIIngredientSummary[]}} localAnalysis
 * @property {Object} outputContract
 * @property {string[]} safetyRules
 *
 * @typedef {Object} AIAnalysisResponseSection
 * @property {string} title
 * @property {'info' | 'watch' | 'caution'} tone
 * @property {string} body
 *
 * @typedef {Object} AIAnalysisIngredientNote
 * @property {string} id
 * @property {string} name
 * @property {string} note
 * @property {'low' | 'medium' | 'high'} confidence
 *
 * @typedef {Object} AIAnalysisAllergenWarning
 * @property {string} item
 * @property {AllergenType[]} allergenIds
 * @property {string} message
 *
 * @typedef {Object} AIAnalysisResponse
 * @property {number} schemaVersion
 * @property {string} summary
 * @property {string} riskNarrative
 * @property {AIAnalysisResponseSection[]} sections
 * @property {AIAnalysisIngredientNote[]} ingredientNotes
 * @property {AIAnalysisAllergenWarning[]} allergenWarnings
 * @property {string[]} nextSteps
 * @property {string[]} limitations
 *
 * @typedef {Object} OCRImageMetadata
 * @property {string} name
 * @property {string} type
 * @property {number} size
 * @property {string} sizeLabel
 * @property {number} lastModified
 *
 * @typedef {Object} OCRRequest
 * @property {number} protocolVersion
 * @property {'ingredient-image-ocr'} requestType
 * @property {string} endpoint
 * @property {DataCategory} category
 * @property {string} locale
 * @property {string} createdAt
 * @property {OCRImageMetadata} image
 * @property {Object} validation
 * @property {Object} clientConstraints
 * @property {Object} processingHints
 * @property {Object} outputContract
 * @property {string[]} safetyRules
 *
 * @typedef {Object} OCRCandidate
 * @property {string} text
 * @property {number} confidence
 * @property {string} source
 *
 * @typedef {Object} OCRResponse
 * @property {number} schemaVersion
 * @property {string} text
 * @property {number} confidence
 * @property {string} language
 * @property {OCRCandidate[]} candidates
 * @property {string[]} warnings
 * @property {string[]} nextSteps
 *
 * @typedef {Object} AnalysisReportAllergenHit
 * @property {string} id
 * @property {AllergenType[]} allergenIds
 *
 * @typedef {Object} AnalysisReportTextAllergenHit
 * @property {string} item
 * @property {AllergenType[]} allergenIds
 *
 * @typedef {Object} AnalysisReportInsight
 * @property {string} key
 * @property {string} title
 * @property {'neutral' | 'watch' | 'caution'} tone
 * @property {string} summary
 * @property {string[]} items
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
 * @property {AnalysisReportInsight[]} insights
 * @property {number} schemaVersion
 */

export {};
