export { runRules, getRegisteredRules, type RuleContext, type AttentionCandidate, type Severity } from './rule-engine';
export { groupCandidates, upsertAttentionItems, groupKey } from './dedup';
export { sendMorningDigest, formatDigest } from './digest';
export { findAllOpportunities, rangeEstimate, isRange, type Opportunity, type OpportunityRange } from './opportunity';
