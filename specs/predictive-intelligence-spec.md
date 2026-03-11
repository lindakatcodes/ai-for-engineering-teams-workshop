# Spec: Predictive Intelligence

## Feature: PredictiveIntelligence — Unified Alerts + Market Context Layer

### Context
- Combines the proactive alert rules engine (`lib/alerts.ts`) with market sentiment data (`MarketIntelligenceService`) into a single intelligence layer for the Customer Intelligence Dashboard
- Customer success teams see internally-derived risk signals (payment, engagement, contract) alongside externally-derived market context (company news, sentiment) in one place
- Feeds the `PredictiveAlertsWidget` and `MarketIntelligenceWidget` components, both driven by the active `CustomerSelector` selection
- Enables correlation between market events and customer health degradation

### Requirements

#### Alert Rules Engine (`lib/alerts.ts`)
- Pure function `alertEngine(customerData, healthScore)` evaluating five alert rules and returning all triggered `Alert` objects
- **High Priority rules:**
  - `PAYMENT_RISK` — payment overdue >30 days OR health score dropped >20 points in the last 7 days
  - `ENGAGEMENT_CLIFF` — login frequency down >50% vs 30-day average
  - `CONTRACT_EXPIRATION_RISK` — contract expires in <90 days AND health score <50
- **Medium Priority rules:**
  - `SUPPORT_TICKET_SPIKE` — >3 support tickets in 7 days OR an escalated ticket open
  - `FEATURE_ADOPTION_STALL` — no new feature usage in 30 days for a growing account (ARR growth >0)
- Deduplication: no re-trigger for the same customer/rule within a configurable cooldown window
- Priority scoring: customer ARR × urgency weight × recency multiplier
- `dismissAlert(alertId)` pure function returning a new alerts array with the target dismissed
- Alert history object keyed by `customerId` for audit and effectiveness tracking

#### Market Intelligence Service (`src/lib/MarketIntelligenceService.ts`)
- `MarketIntelligenceService` class with `getMarketData(company: string): Promise<MarketData>`
- In-memory cache with 10-minute TTL; returns cached result on subsequent calls within TTL
- `correlateWithAlerts(marketData, activeAlerts)` — pure function that returns enriched alerts annotated with relevant market headlines (e.g., a `PAYMENT_RISK` alert for a company with negative news gets a `marketContext` field)
- Throws `MarketIntelligenceError extends Error` on validation failure or fetch error

#### Combined Intelligence API Route (`src/app/api/customer-intelligence/[customerId]/route.ts`)
- `GET /api/customer-intelligence/[customerId]` returns a unified payload:
  ```ts
  {
    customerId: string;
    healthScore: HealthScoreResult;
    activeAlerts: Alert[];
    marketData: MarketData | null;  // null if company unavailable
    correlatedInsights: CorrelatedInsight[];
    generatedAt: string; // ISO 8601
  }
  ```
- Validates `customerId` path parameter; returns 400 for invalid values
- Runs health score calculation, alert evaluation, and market data fetch concurrently (`Promise.all`)
- Market data failure is non-fatal — returns `marketData: null` and logs the error
- Returns 500 with sanitized message on unexpected errors

#### UI Components
- `PredictiveAlertsWidget` — lists active alerts grouped by priority; each alert shows rule name, message, recommended action, and optional `marketContext` snippet if correlated; supports per-alert dismissal
- `MarketIntelligenceWidget` — shows sentiment badge (green/yellow/red), article count, last-updated timestamp, and top 3 headlines; re-fetches when company changes
- Both components use the unified API route for a single network round-trip per customer selection

### Constraints
- **Stack:** Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS
- **Architecture:** `lib/alerts.ts` and correlation helpers are pure functions; `MarketIntelligenceService` is the only class with state (cache)
- **TypeScript interfaces required:**
  ```ts
  type AlertPriority = 'high' | 'medium';
  interface Alert { id: string; customerId: string; rule: string; priority: AlertPriority; message: string; recommendedAction: string; triggeredAt: string; dismissed: boolean; marketContext?: string; }
  interface MarketData { company: string; sentiment: { score: number; label: 'positive' | 'neutral' | 'negative'; confidence: number; }; articleCount: number; headlines: { title: string; source: string; publishedAt: string; }[]; lastUpdated: string; }
  interface CorrelatedInsight { alertId: string; headline: string; relevanceScore: number; }
  ```
- **Security:**
  - `customerId` and `company` parameters validated before use; invalid values return 400
  - No raw ARR, payment amounts, or overdue figures in rendered alert messages
  - No internal error details in API 500 responses
  - Rate limiting: max 30 unified intelligence requests per user per minute
- **File locations:**
  - `lib/alerts.ts`
  - `src/lib/MarketIntelligenceService.ts`
  - `src/app/api/customer-intelligence/[customerId]/route.ts`
  - `src/components/PredictiveAlertsWidget.tsx`
  - `src/components/MarketIntelligenceWidget.tsx`
- **Performance:**
  - Concurrent fetch with `Promise.all`; no sequential waterfall between health, alerts, and market data
  - Market intelligence cache prevents redundant external calls within 10-minute window
  - Alert engine evaluates all five rules in a single synchronous pass

### Acceptance Criteria

#### Alert Rules Engine
- [ ] All five rules trigger at their defined thresholds and not before
- [ ] High-priority alerts appear before medium-priority in the returned array
- [ ] No duplicate alert for the same customer/rule within the cooldown window
- [ ] `dismissAlert` returns a new array without mutating the original
- [ ] Alert messages contain no raw financial data
- [ ] All functions are pure and strongly typed — no `any` types

#### Market Intelligence Service
- [ ] `getMarketData` returns a correctly shaped `MarketData` object for a valid company name
- [ ] Second call within 10 minutes returns the cached result (no new fetch)
- [ ] Cache invalidates correctly after TTL expires
- [ ] `correlateWithAlerts` annotates matching alerts with a `marketContext` string
- [ ] Throws `MarketIntelligenceError` for empty or invalid company names

#### Unified API Route
- [ ] `GET /api/customer-intelligence/[customerId]` returns 200 with all four top-level fields
- [ ] `healthScore`, `activeAlerts`, and `marketData` are fetched concurrently (verified via timing test or mock)
- [ ] Market data failure results in `marketData: null`, not a 500 response
- [ ] Invalid `customerId` returns 400 with a sanitized error message
- [ ] `correlatedInsights` array is non-empty when a market event is relevant to an active alert

#### PredictiveAlertsWidget
- [ ] High-priority alerts render with a red indicator; medium with yellow
- [ ] Each alert shows rule name, message, and recommended action text
- [ ] Alerts with `marketContext` show a headline snippet below the alert body
- [ ] Dismissing an alert removes it from view without a page reload
- [ ] Empty state rendered when no active alerts exist for the selected customer
- [ ] Widget uses a single call to the unified API route, not separate alert + market endpoints

#### MarketIntelligenceWidget
- [ ] Sentiment badge is green (positive), yellow (neutral), or red (negative)
- [ ] All 3 headlines show title, source, and formatted publication date
- [ ] Loading skeleton shown during fetch; error message shown on failure (no raw detail)
- [ ] Empty state shown when no customer is selected
- [ ] Component re-fetches when the selected customer changes

#### Tests
- [ ] Unit tests for each of the five alert rules at, below, and above threshold
- [ ] Deduplication and cooldown behavior verified with time-mocked tests
- [ ] `correlateWithAlerts` unit tests covering match and no-match scenarios
- [ ] Integration test for the unified API route verifying concurrent fetch and market-failure fallback
- [ ] Security tests: XSS-attempt `customerId` and `company` values return 400 without reflection
- [ ] Performance test: alert engine evaluates 200 customers in < 100 ms total
