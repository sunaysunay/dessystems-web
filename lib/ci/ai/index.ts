export {
  buildContext,
  formatContextForPrompt,
  SAFE_TABLES,
  type AIContext,
  type BuildContextOpts,
} from './context-builder';

export { findMetric, answerQuestion } from './nlq';
export { explainMovement, formatNarrative } from './narrative';
export { seasonalNaive, holtWinters, mape, backtestForecast, generateForecasts } from './forecast';
export { generateRecommendations, formatTelegramApproval, recordApproval } from './recommend';
