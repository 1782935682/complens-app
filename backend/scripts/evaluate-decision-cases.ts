import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { profileComparisonEvaluationCases, profileDecisionEvaluationCases } from '../src/data/evaluationCases.js';
import type { AiFoodExplanationService } from '../src/services/aiFoodExplanationService.js';
import { createDecisionAgentService } from '../src/services/decisionAgentService.js';
import { createFoodAnalyzeService } from '../src/services/foodAnalyzeService.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const reportPath = resolve(repoRoot, 'reports/evaluation/decision-cases-report.json');

const ruleOnlyExplanationService: AiFoodExplanationService = {
  async explain({ ruleResult }) {
    return {
      summary: ruleResult.summary,
      plainExplanation: ruleResult.plainExplanation,
      mainReasons: ruleResult.mainReasons,
      suitableFor: ruleResult.suitableFor,
      notSuitableFor: ruleResult.notSuitableFor,
      ingredientHighlights: ruleResult.ingredientHighlights,
      nutritionExplanation: ruleResult.nutritionExplanation,
      eatingAdvice: ruleResult.eatingAdvice,
      retakeSuggestion: ruleResult.confidence === 'low' ? '建议补拍配料表和营养成分表。' : '',
      provider: 'rule-only',
      model: '',
      promptVersion: 'evaluation-rule-only',
      aiEnhanced: false
    };
  }
};

const decisionAgentService = createDecisionAgentService(createFoodAnalyzeService(ruleOnlyExplanationService));
const caseResults = [];
const comparisonResults = [];

for (const evaluationCase of profileDecisionEvaluationCases) {
  const actual = await decisionAgentService.analyzeProduct({
    productName: evaluationCase.productName,
    labelText: evaluationCase.labelText,
    userProfile: evaluationCase.userProfile,
    options: {
      enableAi: false
    }
  });
  const failures = [
    actual.decision_result.recommendation === evaluationCase.expected.recommendation
      ? ''
      : `recommendation expected ${evaluationCase.expected.recommendation}, got ${actual.decision_result.recommendation}`,
    ...missingIncludes('riskReasons', actual.decision_result.riskReasons, evaluationCase.expected.riskReasonIncludes),
    ...missingIncludes('unsuitableFor', actual.decision_result.unsuitableFor, evaluationCase.expected.unsuitableForIncludes),
    ...missingIncludes('alternatives', actual.decision_result.alternatives, evaluationCase.expected.alternativeIncludes),
    actual.decision_result.riskReasons.length <= 3
      ? ''
      : `riskReasons expected max 3, got ${actual.decision_result.riskReasons.length}`
  ].filter(Boolean);

  caseResults.push({
    id: evaluationCase.id,
    profileTag: evaluationCase.profileTag,
    title: evaluationCase.title,
    ok: failures.length === 0,
    failures,
    expected: evaluationCase.expected,
    actual: {
      recommendation: actual.decision_result.recommendation,
      riskReasons: actual.decision_result.riskReasons,
      suitableFor: actual.decision_result.suitableFor,
      unsuitableFor: actual.decision_result.unsuitableFor,
      alternatives: actual.decision_result.alternatives,
      score: actual.decision_result.score
    }
  });
}

for (const evaluationCase of profileComparisonEvaluationCases) {
  const actual = await decisionAgentService.compareProducts({
    left: evaluationCase.left,
    right: evaluationCase.right,
    userProfile: evaluationCase.userProfile
  });
  const failures = [
    actual.healthier === evaluationCase.expected.healthier
      ? ''
      : `healthier expected ${evaluationCase.expected.healthier}, got ${actual.healthier}`,
    actual.lowerRisk === evaluationCase.expected.lowerRisk
      ? ''
      : `lowerRisk expected ${evaluationCase.expected.lowerRisk}, got ${actual.lowerRisk}`,
    actual.betterForProfile === evaluationCase.expected.betterForProfile
      ? ''
      : `betterForProfile expected ${evaluationCase.expected.betterForProfile}, got ${actual.betterForProfile}`,
    actual.summary.includes(evaluationCase.expected.summaryIncludes)
      ? ''
      : `summary expected to include ${evaluationCase.expected.summaryIncludes}, got ${actual.summary}`,
    actual.reasons.length > 0 && actual.reasons.length <= 3
      ? ''
      : `reasons expected 1..3, got ${actual.reasons.length}`,
    actual.agents.some((item) => item.agent === 'review-agent' && item.status === 'pass')
      ? ''
      : 'review-agent pass trace missing'
  ].filter(Boolean);

  comparisonResults.push({
    id: evaluationCase.id,
    title: evaluationCase.title,
    ok: failures.length === 0,
    failures,
    expected: evaluationCase.expected,
    actual: {
      healthier: actual.healthier,
      lowerRisk: actual.lowerRisk,
      betterForProfile: actual.betterForProfile,
      summary: actual.summary,
      reasons: actual.reasons
    }
  });
}

const passed = caseResults.filter((item) => item.ok).length;
const comparisonPassed = comparisonResults.filter((item) => item.ok).length;
const report = {
  schemaVersion: 'evaluation-case-report-v1',
  product: '成分镜',
  generatedAt: new Date().toISOString(),
  summary: {
    total: caseResults.length,
    passed,
    failed: caseResults.length - passed,
    matchRate: caseResults.length ? Number((passed / caseResults.length).toFixed(4)) : 0,
    comparisonTotal: comparisonResults.length,
    comparisonPassed,
    comparisonFailed: comparisonResults.length - comparisonPassed,
    comparisonMatchRate: comparisonResults.length ? Number((comparisonPassed / comparisonResults.length).toFixed(4)) : 0,
    decisionQualityScore: Number((((caseResults.length ? passed / caseResults.length : 0) + (comparisonResults.length ? comparisonPassed / comparisonResults.length : 0)) / 2).toFixed(4))
  },
  cases: caseResults,
  comparisonCases: comparisonResults
};

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (report.summary.failed) {
  console.error(`decision evaluation cases failed: ${report.summary.failed}/${report.summary.total}`);
  for (const item of caseResults.filter((caseResult) => !caseResult.ok)) {
    console.error(`- ${item.id}: ${item.failures.join('; ')}`);
  }
  process.exit(1);
}
if (report.summary.comparisonFailed) {
  console.error(`comparison evaluation cases failed: ${report.summary.comparisonFailed}/${report.summary.comparisonTotal}`);
  for (const item of comparisonResults.filter((caseResult) => !caseResult.ok)) {
    console.error(`- ${item.id}: ${item.failures.join('; ')}`);
  }
  process.exit(1);
}

console.log(`decision evaluation cases passed: ${report.summary.passed}/${report.summary.total}; comparison cases passed: ${report.summary.comparisonPassed}/${report.summary.comparisonTotal}`);

function missingIncludes(field: string, actual: string[], expectedIncludes: string[]): string[] {
  return expectedIncludes
    .filter((expected) => !actual.some((item) => item.includes(expected)))
    .map((expected) => `${field} missing ${expected}`);
}
