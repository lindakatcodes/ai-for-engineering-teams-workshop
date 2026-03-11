# Spec: Health Score Calculator

## Feature: Health Score Calculator & CustomerHealthDisplay

### Context
- Core business logic module for the Customer Intelligence Dashboard
- Provides predictive analytics for customer relationship health and churn risk
- Used by `CustomerHealthDisplay` widget to surface scores in real time when a customer is selected via `CustomerSelector`
- Scores drive color-coded health indicators consistently across the entire dashboard

### Requirements

#### Core Algorithm (`lib/healthCalculator.ts`)
- Calculate a composite health score on a **0–100 scale** from four weighted factors:
  | Factor | Weight | Inputs |
  |---|---|---|
  | Payment history | 40% | Days since last payment, average payment delay, overdue amounts |
  | Engagement | 30% | Login frequency, feature usage count, support tickets |
  | Contract status | 20% | Days until renewal, contract value, recent upgrades |
  | Support satisfaction | 10% | Average resolution time, satisfaction scores, escalation counts |
- Classify risk level from final score:
  - **Healthy** — 71–100
  - **Warning** — 31–70
  - **Critical** — 0–30
- Individual scoring functions per factor, each returning a 0–100 sub-score
- Main `calculateHealthScore` function that combines sub-scores using the weighted formula
- Input validation with descriptive error messages for all data inputs
- Edge case handling for new customers and missing/null data
- Normalization strategies for differing data types and value ranges
- Trend analysis: flag whether the customer trajectory is `improving`, `stable`, or `declining`

#### UI Component (`src/components/CustomerHealthDisplay.tsx`)
- Displays overall health score with color-coded visualization matching dashboard conventions (red/yellow/green)
- Expandable breakdown section showing each factor's individual sub-score
- Loading state while score is being computed after customer selection changes
- Error state consistent with other dashboard widget patterns
- Integrates with `CustomerSelector` — score updates in real time on customer change

### Constraints
- **Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS
- **Architecture:** Pure functions only in `lib/healthCalculator.ts` — no side effects
- **TypeScript interfaces** required for all data structures and return types:
  ```ts
  interface PaymentData { daysSinceLastPayment: number; avgPaymentDelayDays: number; overdueAmount: number; }
  interface EngagementData { loginFrequencyPerMonth: number; featureUsageCount: number; openSupportTickets: number; }
  interface ContractData { daysUntilRenewal: number; contractValue: number; recentUpgrades: number; }
  interface SupportData { avgResolutionTimeDays: number; satisfactionScore: number; escalationCount: number; }
  interface HealthScoreResult { score: number; riskLevel: 'healthy' | 'warning' | 'critical'; trend: 'improving' | 'stable' | 'declining'; breakdown: FactorBreakdown; }
  ```
- **Error handling:** Custom error classes extending `Error` with descriptive messages
- **JSDoc comments** on all exported functions explaining business logic and formulas
- **No external UI libraries** — Tailwind utility classes only
- **No async data fetching** inside calculator functions; component handles data loading
- **Color coding** must match the existing `CustomerCard` health indicator scheme

### Acceptance Criteria

#### Calculator (`lib/healthCalculator.ts`)
- [ ] `calculateHealthScore` returns a score between 0 and 100 for valid inputs
- [ ] Weighted formula produces correct results: payment×0.4 + engagement×0.3 + contract×0.2 + support×0.1
- [ ] Score is classified as `healthy`, `warning`, or `critical` per the defined ranges
- [ ] Each factor function returns a normalized 0–100 sub-score
- [ ] Returns a descriptive error for any invalid or out-of-range input
- [ ] New customers with missing data receive a safe default score rather than throwing
- [ ] Trend field is present and one of `improving | stable | declining`
- [ ] All functions are pure (no side effects, deterministic output)
- [ ] All interfaces and functions are strongly typed — no `any` types
- [ ] JSDoc comments present on every exported function

#### CustomerHealthDisplay component
- [ ] Displays overall score and risk level badge in matching red/yellow/green colors
- [ ] Factor breakdown is hidden by default and expands on user interaction
- [ ] Renders loading state while awaiting score computation
- [ ] Renders error state with user-friendly message when calculation fails
- [ ] Score updates in real time when a new customer is selected in `CustomerSelector`
- [ ] Responsive layout works at 375 px (mobile) and 1280 px (desktop)

#### Tests
- [ ] Unit tests cover all four factor scoring functions
- [ ] Boundary condition tests for scores at 0, 30, 31, 70, 71, and 100
- [ ] Mathematical accuracy verified against manually calculated expected values
- [ ] Error handling tests for invalid inputs and missing data
- [ ] Realistic customer data scenario tests covering all three risk levels
