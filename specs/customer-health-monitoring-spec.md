# Spec: Customer Health Monitoring

## Feature: CustomerHealthMonitoring — Score Engine + Predictive Alerts

### Context
- Unified monitoring layer for the Customer Intelligence Dashboard that combines real-time health scoring with a proactive alert engine
- `lib/healthCalculator.ts` computes composite health scores from four customer data signals; `lib/alerts.ts` evaluates alert rules against those scores and raw metrics
- `CustomerHealthDisplay` widget surfaces the score and risk level; `PredictiveAlertsWidget` surfaces triggered alerts — both react to `CustomerSelector` changes
- Designed to give customer success teams early warning of churn risk before it becomes critical

### Requirements

#### Health Score Engine (`lib/healthCalculator.ts`)
- Composite score on a **0–100 scale** from four weighted factors:
  | Factor | Weight | Inputs |
  |---|---|---|
  | Payment history | 40% | Days since last payment, average payment delay, overdue amount |
  | Engagement | 30% | Login frequency, feature usage count, open support tickets |
  | Contract status | 20% | Days until renewal, contract value, recent upgrades |
  | Support satisfaction | 10% | Avg resolution time, satisfaction score, escalation count |
- Risk level classification from final score:
  - **Healthy** — 71–100
  - **Warning** — 31–70
  - **Critical** — 0–30
- Individual scoring functions per factor returning 0–100 sub-scores
- Main `calculateHealthScore` function composing sub-scores with the weighted formula
- Edge case handling for new customers and missing/null data (safe defaults, no throws)
- Trend analysis: flag whether the customer trajectory is `improving`, `stable`, or `declining`

#### Alert Rules Engine (`lib/alerts.ts`)
- Pure function `alertEngine(customerData, healthScore)` evaluating all rules and returning triggered alerts
- **High Priority alerts:**
  - `PAYMENT_RISK` — payment overdue >30 days OR health score drops >20 points in 7 days
  - `ENGAGEMENT_CLIFF` — login frequency drops >50% vs 30-day average
  - `CONTRACT_EXPIRATION_RISK` — contract expires in <90 days AND health score <50
- **Medium Priority alerts:**
  - `SUPPORT_TICKET_SPIKE` — >3 support tickets in 7 days OR an escalated ticket exists
  - `FEATURE_ADOPTION_STALL` — no new feature usage in 30 days for a growing account
- Deduplication: one active alert per customer/rule combination; no re-trigger within cooldown period
- Priority scoring using weighted factors: customer ARR, urgency, and recency
- Alert history object for tracking triggered alerts and response effectiveness
- Business hours flag for delivery timing consideration

#### UI Components
- `CustomerHealthDisplay` — color-coded score badge, risk level label, expandable per-factor breakdown, loading + error states
- `PredictiveAlertsWidget` — lists triggered alerts grouped by priority (high/medium), color-coded (red/yellow), shows recommended action text, supports dismissal per alert
- Both components accept a `customerId` prop and re-render automatically when `CustomerSelector` changes

### Constraints
- **Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS
- **Architecture:** Pure functions only in `lib/healthCalculator.ts` and `lib/alerts.ts` — no side effects, no async, fully deterministic
- **TypeScript interfaces required:**
  ```ts
  interface PaymentData { daysSinceLastPayment: number; avgPaymentDelayDays: number; overdueAmount: number; }
  interface EngagementData { loginFrequencyPerMonth: number; featureUsageCount: number; openSupportTickets: number; }
  interface ContractData { daysUntilRenewal: number; contractValue: number; recentUpgrades: number; }
  interface SupportData { avgResolutionTimeDays: number; satisfactionScore: number; escalationCount: number; }
  interface HealthScoreResult { score: number; riskLevel: 'healthy' | 'warning' | 'critical'; trend: 'improving' | 'stable' | 'declining'; breakdown: FactorBreakdown; }
  type AlertPriority = 'high' | 'medium';
  interface Alert { id: string; customerId: string; rule: string; priority: AlertPriority; message: string; recommendedAction: string; triggeredAt: string; dismissed: boolean; }
  ```
- **Error handling:** Custom error classes extending `Error`; errors in alert evaluation must not crash the health display
- **JSDoc comments** on every exported function explaining business logic and formulas
- **Color coding** consistent across the dashboard: green (healthy/positive), yellow (warning/neutral), red (critical/negative)
- **File locations:**
  - `lib/healthCalculator.ts`
  - `lib/alerts.ts`
  - `src/components/CustomerHealthDisplay.tsx`
  - `src/components/PredictiveAlertsWidget.tsx`
- **Security:** No sensitive customer data (ARR, overdue amounts) exposed in rendered alert messages; rate-limit alert generation to prevent spam; audit log entries for triggered alerts
- **Performance:** Both calculation functions must complete synchronously in <5 ms for a single customer; alert engine supports batched evaluation over hundreds of customers

### Acceptance Criteria

#### Health Score Engine
- [ ] `calculateHealthScore` returns a score in [0, 100] for valid inputs
- [ ] Weighted formula: `payment×0.4 + engagement×0.3 + contract×0.2 + support×0.1`
- [ ] Score maps correctly to `healthy`, `warning`, or `critical` risk level
- [ ] Each factor function returns a normalized 0–100 sub-score
- [ ] Missing/null data produces a safe default score, not a thrown error
- [ ] Trend field is present and one of `improving | stable | declining`
- [ ] All functions are pure and strongly typed — no `any` types

#### Alert Rules Engine
- [ ] `alertEngine` returns an array of `Alert` objects for all triggered rules
- [ ] High-priority alerts fire correctly at defined thresholds (payment >30d, drop >20pts, etc.)
- [ ] Medium-priority alerts fire correctly at defined thresholds
- [ ] No duplicate alerts for the same customer/rule within the cooldown period
- [ ] Priority scoring orders alerts by ARR × urgency × recency
- [ ] Alert messages contain no raw financial or sensitive data
- [ ] Dismissing an alert sets `dismissed: true` and removes it from the active list

#### CustomerHealthDisplay
- [ ] Renders overall score and risk level badge in matching colors
- [ ] Factor breakdown is collapsed by default and expands on interaction
- [ ] Loading state shown while awaiting score; error state shown on failure
- [ ] Score updates in real time when `CustomerSelector` changes

#### PredictiveAlertsWidget
- [ ] High-priority alerts appear in red, medium in yellow
- [ ] Each alert shows rule name, message, and recommended action
- [ ] Dismissal removes alert from view without page reload
- [ ] Empty state shown when no alerts are active for selected customer
- [ ] Widget does not crash dashboard when `alertEngine` throws

#### Tests
- [ ] Unit tests for all four factor scoring functions with boundary values (0, 30, 31, 70, 71, 100)
- [ ] Unit tests for each alert rule at, below, and above threshold
- [ ] Deduplication and cooldown behavior verified
- [ ] Mathematical accuracy verified against manually calculated expected values
- [ ] Error handling tests for invalid inputs and missing data
- [ ] Realistic multi-customer scenario covering all three risk levels and multiple alert types
