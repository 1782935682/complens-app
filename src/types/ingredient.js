/**
 * @typedef {'low' | 'medium' | 'high' | 'unknown'} RiskLevel
 *
 * @typedef {Object} Ingredient
 * @property {string} id
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
