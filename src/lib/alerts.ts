/**
 * Alert Rules Engine
 * Pure functions only — no side effects, no external calls.
 */

import type { Customer } from '@/data/mock-customers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertPriority = 'high' | 'medium';

export type AlertRule =
  | 'PAYMENT_RISK'
  | 'ENGAGEMENT_CLIFF'
  | 'CONTRACT_EXPIRATION_RISK'
  | 'SUPPORT_TICKET_SPIKE'
  | 'FEATURE_ADOPTION_STALL';

export interface Alert {
  id: string;
  customerId: string;
  rule: AlertRule;
  priority: AlertPriority;
  message: string;
  recommendedAction: string;
  triggeredAt: string; // ISO 8601
  dismissed: boolean;
  marketContext?: string;
}

export interface HealthScoreResult {
  customerId: string;
  score: number;
  previousScore?: number;
  droppedPointsIn7Days?: number;
}

/** Extended customer data passed into the alert engine */
export interface CustomerAlertData extends Customer {
  /** Monthly recurring revenue indicator (abstract units, no raw dollar amounts) */
  arrGrowthPositive?: boolean;
  /** Days since last login; undefined = unknown */
  daysSinceLastLogin?: number;
  /** Login count in last 7 days */
  loginsLast7Days?: number;
  /** Average daily logins over last 30 days */
  avgDailyLoginsLast30Days?: number;
  /** Number of support tickets opened in last 7 days */
  supportTicketsLast7Days?: number;
  /** Whether an escalated support ticket is currently open */
  hasEscalatedTicket?: boolean;
  /** Days until contract renewal; undefined = unknown or no contract */
  daysUntilContractExpiry?: number;
  /** Days since any payment was received; undefined = unknown */
  daysSinceLastPayment?: number;
  /** Whether the account had new feature adoption in the last 30 days */
  newFeatureUsageLast30Days?: boolean;
}

/** Alert history keyed by customerId for audit and effectiveness tracking */
export type AlertHistory = Record<string, Alert[]>;

/** Priority urgency weights used in priority scoring */
const URGENCY_WEIGHTS: Record<AlertPriority, number> = {
  high: 2.0,
  medium: 1.0,
};

// ---------------------------------------------------------------------------
// Rule helpers
// ---------------------------------------------------------------------------

/** Generate a stable-ish id for an alert */
function makeAlertId(customerId: string, rule: AlertRule, triggeredAt: string): string {
  return `${customerId}::${rule}::${triggeredAt}`;
}

/** Build an Alert object */
function buildAlert(
  customerId: string,
  rule: AlertRule,
  priority: AlertPriority,
  message: string,
  recommendedAction: string,
  now: string,
): Alert {
  return {
    id: makeAlertId(customerId, rule, now),
    customerId,
    rule,
    priority,
    message,
    recommendedAction,
    triggeredAt: now,
    dismissed: false,
  };
}

/**
 * Checks whether the same rule was already triggered for the customer within
 * the cooldown window.  History entries that are dismissed are ignored for
 * deduplication purposes.
 */
function isDuplicate(
  customerId: string,
  rule: AlertRule,
  history: AlertHistory,
  cooldownMs: number,
  now: number,
): boolean {
  const customerHistory = history[customerId];
  if (!customerHistory) return false;
  return customerHistory.some(
    (a) =>
      a.rule === rule &&
      !a.dismissed &&
      now - new Date(a.triggeredAt).getTime() < cooldownMs,
  );
}

// ---------------------------------------------------------------------------
// Public: alertEngine
// ---------------------------------------------------------------------------

/**
 * Evaluates five alert rules for a single customer and returns all triggered
 * Alert objects, sorted high-priority first.
 *
 * @param customerData  — Extended customer data (no raw financial figures in messages)
 * @param healthScore   — Current health score result including optional trend data
 * @param history       — Existing alert history for deduplication
 * @param cooldownMs    — Minimum milliseconds before re-triggering same rule (default: 24h)
 * @param nowIso        — Override "now" for testing (ISO 8601 string)
 */
export function alertEngine(
  customerData: CustomerAlertData,
  healthScore: HealthScoreResult,
  history: AlertHistory = {},
  cooldownMs = 24 * 60 * 60 * 1000,
  nowIso?: string,
): Alert[] {
  const now = nowIso ?? new Date().toISOString();
  const nowMs = new Date(now).getTime();
  const { id: customerId } = customerData;

  const triggered: Alert[] = [];

  function push(alert: Alert) {
    if (!isDuplicate(customerId, alert.rule, history, cooldownMs, nowMs)) {
      triggered.push(alert);
    }
  }

  // ------------------------------------------------------------------
  // HIGH priority rules
  // ------------------------------------------------------------------

  // PAYMENT_RISK — payment overdue >30 days OR health dropped >20 pts in 7 days
  const paymentOverdue =
    customerData.daysSinceLastPayment !== undefined &&
    customerData.daysSinceLastPayment > 30;
  const healthDropped =
    healthScore.droppedPointsIn7Days !== undefined &&
    healthScore.droppedPointsIn7Days > 20;

  if (paymentOverdue || healthDropped) {
    push(
      buildAlert(
        customerId,
        'PAYMENT_RISK',
        'high',
        paymentOverdue
          ? 'Payment has not been received for an extended period.'
          : 'Significant health score decline detected over the past week.',
        'Reach out to the account team immediately to verify account status and schedule a check-in call.',
        now,
      ),
    );
  }

  // ENGAGEMENT_CLIFF — login frequency down >50% vs 30-day average
  const avgLogins = customerData.avgDailyLoginsLast30Days ?? 0;
  const recentLogins = customerData.loginsLast7Days ?? undefined;
  const avgOver7Days = avgLogins * 7;

  if (
    avgOver7Days > 0 &&
    recentLogins !== undefined &&
    recentLogins < avgOver7Days * 0.5
  ) {
    push(
      buildAlert(
        customerId,
        'ENGAGEMENT_CLIFF',
        'high',
        'Login frequency has dropped significantly compared to the recent average.',
        'Schedule a proactive engagement call and review product adoption blockers.',
        now,
      ),
    );
  }

  // CONTRACT_EXPIRATION_RISK — expires <90 days AND health score <50
  if (
    customerData.daysUntilContractExpiry !== undefined &&
    customerData.daysUntilContractExpiry < 90 &&
    healthScore.score < 50
  ) {
    push(
      buildAlert(
        customerId,
        'CONTRACT_EXPIRATION_RISK',
        'high',
        'Contract renewal is approaching while the health score is below the risk threshold.',
        'Initiate renewal conversation immediately and create a tailored success plan.',
        now,
      ),
    );
  }

  // ------------------------------------------------------------------
  // MEDIUM priority rules
  // ------------------------------------------------------------------

  // SUPPORT_TICKET_SPIKE — >3 tickets in 7 days OR escalated ticket open
  if (
    (customerData.supportTicketsLast7Days !== undefined &&
      customerData.supportTicketsLast7Days > 3) ||
    customerData.hasEscalatedTicket
  ) {
    push(
      buildAlert(
        customerId,
        'SUPPORT_TICKET_SPIKE',
        'medium',
        customerData.hasEscalatedTicket
          ? 'An escalated support ticket is currently open for this account.'
          : 'An unusually high number of support tickets were opened this week.',
        'Review open tickets with the support team and arrange a technical review call.',
        now,
      ),
    );
  }

  // FEATURE_ADOPTION_STALL — no new feature usage in 30 days for a growing account
  if (
    customerData.arrGrowthPositive === true &&
    customerData.newFeatureUsageLast30Days === false
  ) {
    push(
      buildAlert(
        customerId,
        'FEATURE_ADOPTION_STALL',
        'medium',
        'No new feature adoption has been detected in the past 30 days for this growing account.',
        'Schedule a product walkthrough session to highlight features aligned with their use case.',
        now,
      ),
    );
  }

  // Sort: high before medium, then by most recently triggered
  triggered.sort((a, b) => {
    if (a.priority !== b.priority) {
      return URGENCY_WEIGHTS[b.priority] - URGENCY_WEIGHTS[a.priority];
    }
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

  return triggered;
}

// ---------------------------------------------------------------------------
// Public: dismissAlert
// ---------------------------------------------------------------------------

/**
 * Returns a new alerts array where the target alert is marked dismissed.
 * Does NOT mutate the original array.
 */
export function dismissAlert(alerts: Alert[], alertId: string): Alert[] {
  return alerts.map((a) => (a.id === alertId ? { ...a, dismissed: true } : a));
}

// ---------------------------------------------------------------------------
// Public: priorityScore
// ---------------------------------------------------------------------------

/**
 * Priority scoring: account tier weight × urgency weight × recency multiplier.
 * Higher is more urgent.
 */
export function priorityScore(
  alert: Alert,
  arrGrowthPositive: boolean,
  nowMs: number = Date.now(),
): number {
  const arrWeight = arrGrowthPositive ? 2 : 1;
  const urgency = URGENCY_WEIGHTS[alert.priority];
  const ageMs = nowMs - new Date(alert.triggeredAt).getTime();
  // Recency multiplier: 1.0 at t=0, decays toward 0 over 7 days
  const recency = Math.max(0, 1 - ageMs / (7 * 24 * 60 * 60 * 1000));
  return arrWeight * urgency * (1 + recency);
}
