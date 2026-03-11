/**
 * Health Score Calculator
 *
 * Computes a composite 0–100 health score for a customer from four weighted
 * factors: payment history (40%), engagement (30%), contract status (20%),
 * and support satisfaction (10%).
 *
 * All functions are pure and synchronous. Missing or null-ish fields are
 * handled with safe defaults so no call path ever throws.
 */

// ---------------------------------------------------------------------------
// TypeScript interfaces (exported so UI components can import them)
// ---------------------------------------------------------------------------

export interface PaymentData {
  daysSinceLastPayment: number;
  avgPaymentDelayDays: number;
  overdueAmount: number;
}

export interface EngagementData {
  loginFrequencyPerMonth: number;
  featureUsageCount: number;
  openSupportTickets: number;
}

export interface ContractData {
  daysUntilRenewal: number;
  contractValue: number;
  recentUpgrades: number;
}

export interface SupportData {
  avgResolutionTimeDays: number;
  satisfactionScore: number; // 0–10 scale
  escalationCount: number;
}

export interface FactorBreakdown {
  payment: number;
  engagement: number;
  contract: number;
  support: number;
}

export interface HealthScoreResult {
  score: number;
  riskLevel: 'healthy' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  breakdown: FactorBreakdown;
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

export class HealthCalculatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HealthCalculatorError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Clamps a number to [0, 100]. */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Returns a safe numeric value for a potentially missing field.
 * If the value is null, undefined, or NaN, returns the provided default.
 */
function safeNumber(value: number | null | undefined, defaultValue: number): number {
  if (value === null || value === undefined || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Factor scoring functions
// ---------------------------------------------------------------------------

/**
 * Scores payment history on a 0–100 scale.
 *
 * Scoring logic:
 * - Base 100 points, penalised by days overdue and average delay.
 * - `daysSinceLastPayment > 30` subtracts points linearly (full deduction at 90 days).
 * - `avgPaymentDelayDays > 0` subtracts up to 30 points.
 * - Any `overdueAmount > 0` subtracts a flat 20 points.
 *
 * @param data - Payment metrics; null/undefined fields fall back to safe defaults.
 * @returns Normalised sub-score in [0, 100].
 */
export function scorePayment(data: Partial<PaymentData> | null | undefined): number {
  const days = safeNumber(data?.daysSinceLastPayment, 0);
  const delay = safeNumber(data?.avgPaymentDelayDays, 0);
  const overdue = safeNumber(data?.overdueAmount, 0);

  let score = 100;

  // Penalise late payment: 0 penalty at <=30 days, full 50 pts deduction at >=90 days
  if (days > 30) {
    const penalty = Math.min((days - 30) / 60, 1) * 50;
    score -= penalty;
  }

  // Penalise average delay: up to 30 pts deduction at >=30 days average delay
  if (delay > 0) {
    const penalty = Math.min(delay / 30, 1) * 30;
    score -= penalty;
  }

  // Flat penalty for any outstanding overdue amount
  if (overdue > 0) {
    score -= 20;
  }

  return clamp(score);
}

/**
 * Scores engagement on a 0–100 scale.
 *
 * Scoring logic:
 * - Login frequency contributes up to 50 pts (capped at 20 logins/month = full score).
 * - Feature usage contributes up to 30 pts (capped at 10 features = full score).
 * - Open support tickets reduce the score (up to −20 pts at 5+ open tickets).
 *
 * @param data - Engagement metrics; null/undefined fields fall back to safe defaults.
 * @returns Normalised sub-score in [0, 100].
 */
export function scoreEngagement(data: Partial<EngagementData> | null | undefined): number {
  const logins = safeNumber(data?.loginFrequencyPerMonth, 0);
  const features = safeNumber(data?.featureUsageCount, 0);
  const tickets = safeNumber(data?.openSupportTickets, 0);

  const loginScore = Math.min(logins / 20, 1) * 50;
  const featureScore = Math.min(features / 10, 1) * 30;
  const ticketPenalty = Math.min(tickets / 5, 1) * 20;

  return clamp(loginScore + featureScore - ticketPenalty);
}

/**
 * Scores contract status on a 0–100 scale.
 *
 * Scoring logic:
 * - `daysUntilRenewal` contributes up to 60 pts (full score at >=365 days; 0 pts at 0 days).
 * - Recent upgrades add up to 20 pts (capped at 2 upgrades).
 * - `contractValue` contributes up to 20 pts, scaled logarithmically (capped at $100k+).
 *
 * @param data - Contract metrics; null/undefined fields fall back to safe defaults.
 * @returns Normalised sub-score in [0, 100].
 */
export function scoreContract(data: Partial<ContractData> | null | undefined): number {
  const days = safeNumber(data?.daysUntilRenewal, 365);
  const value = safeNumber(data?.contractValue, 0);
  const upgrades = safeNumber(data?.recentUpgrades, 0);

  const renewalScore = Math.min(days / 365, 1) * 60;
  const upgradeScore = Math.min(upgrades / 2, 1) * 20;

  // Log scale for contract value: $0 → 0 pts, $100k+ → 20 pts
  const valueScore = value > 0 ? Math.min(Math.log10(value) / Math.log10(100_000), 1) * 20 : 0;

  return clamp(renewalScore + upgradeScore + valueScore);
}

/**
 * Scores support satisfaction on a 0–100 scale.
 *
 * Scoring logic:
 * - `satisfactionScore` (0–10) contributes up to 60 pts directly (×6).
 * - `avgResolutionTimeDays` reduces score: 0 penalty at <=1 day, full 30 pt deduction at >=10 days.
 * - Each escalation deducts 10 pts (up to 10 pts total for >=1 escalation).
 *
 * @param data - Support metrics; null/undefined fields fall back to safe defaults.
 * @returns Normalised sub-score in [0, 100].
 */
export function scoreSupport(data: Partial<SupportData> | null | undefined): number {
  const satisfaction = safeNumber(data?.satisfactionScore, 5); // neutral default
  const resolution = safeNumber(data?.avgResolutionTimeDays, 1);
  const escalations = safeNumber(data?.escalationCount, 0);

  // Satisfaction: 0–10 → 0–60 pts
  const satisfactionScore = clamp(satisfaction * 6);

  // Resolution time penalty: 0 at <=1 day, full 30 pts at >=10 days
  const resolutionPenalty = resolution > 1 ? Math.min((resolution - 1) / 9, 1) * 30 : 0;

  // Escalation penalty: 10 pts per escalation, max 10 pts
  const escalationPenalty = Math.min(escalations, 1) * 10;

  return clamp(satisfactionScore - resolutionPenalty - escalationPenalty);
}

// ---------------------------------------------------------------------------
// Risk level classifier
// ---------------------------------------------------------------------------

/**
 * Maps a composite score to a named risk level.
 * - healthy:  71–100
 * - warning:  31–70
 * - critical:  0–30
 */
function classifyRiskLevel(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 71) return 'healthy';
  if (score >= 31) return 'warning';
  return 'critical';
}

// ---------------------------------------------------------------------------
// Trend derivation
// ---------------------------------------------------------------------------

/**
 * Derives a trend label from the breakdown scores relative to a simple
 * heuristic: if the average engagement + contract sub-scores (forward-looking
 * indicators) diverges meaningfully from the payment + support sub-scores
 * (lagging indicators) the trend is flagged accordingly.
 *
 * When no historical data is available this function falls back to `stable`.
 *
 * @param breakdown - Per-factor sub-scores already computed.
 * @param previousScore - Optional prior composite score for comparison.
 */
function deriveTrend(
  breakdown: FactorBreakdown,
  previousScore?: number
): 'improving' | 'stable' | 'declining' {
  if (previousScore !== undefined && isFinite(previousScore)) {
    const currentComposite =
      breakdown.payment * 0.4 +
      breakdown.engagement * 0.3 +
      breakdown.contract * 0.2 +
      breakdown.support * 0.1;
    const delta = currentComposite - previousScore;
    if (delta > 5) return 'improving';
    if (delta < -5) return 'declining';
    return 'stable';
  }

  // Heuristic when no history: compare forward-looking vs lagging indicators
  const forwardLooking = (breakdown.engagement + breakdown.contract) / 2;
  const lagging = (breakdown.payment + breakdown.support) / 2;
  const delta = forwardLooking - lagging;
  if (delta > 10) return 'improving';
  if (delta < -10) return 'declining';
  return 'stable';
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Calculates a composite customer health score from four weighted factors.
 *
 * Formula: `payment×0.4 + engagement×0.3 + contract×0.2 + support×0.1`
 *
 * All inputs are optional/partial — missing fields receive safe defaults so
 * this function never throws for missing data. Invalid object inputs (e.g.
 * null) are also handled gracefully.
 *
 * @param payment    - Payment history metrics.
 * @param engagement - Product engagement metrics.
 * @param contract   - Contract and renewal metrics.
 * @param support    - Support satisfaction metrics.
 * @param previousScore - Optional prior score used for trend analysis.
 * @returns A {@link HealthScoreResult} with score, riskLevel, trend, and breakdown.
 */
export function calculateHealthScore(
  payment?: Partial<PaymentData> | null,
  engagement?: Partial<EngagementData> | null,
  contract?: Partial<ContractData> | null,
  support?: Partial<SupportData> | null,
  previousScore?: number
): HealthScoreResult {
  const paymentScore = scorePayment(payment);
  const engagementScore = scoreEngagement(engagement);
  const contractScore = scoreContract(contract);
  const supportScore = scoreSupport(support);

  const breakdown: FactorBreakdown = {
    payment: paymentScore,
    engagement: engagementScore,
    contract: contractScore,
    support: supportScore,
  };

  const rawScore =
    paymentScore * 0.4 +
    engagementScore * 0.3 +
    contractScore * 0.2 +
    supportScore * 0.1;

  const score = clamp(Math.round(rawScore));
  const riskLevel = classifyRiskLevel(score);
  const trend = deriveTrend(breakdown, previousScore);

  return { score, riskLevel, trend, breakdown };
}
