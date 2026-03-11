# Spec: Dashboard Orchestrator

## Feature: DashboardOrchestrator — Production-Ready Dashboard Shell

### Context
- Top-level orchestration layer that wraps all Customer Intelligence Dashboard widgets in error boundaries, coordinates data export, and enforces production-grade resilience, accessibility, and security
- Replaces the current prototype `src/app/page.tsx` layout with a hardened shell that isolates widget failures, provides unified export capabilities, and satisfies WCAG 2.1 AA requirements
- Used by all internal customer success operators; uptime and accessibility are business-critical

### Requirements

#### Error Boundary System
- `DashboardErrorBoundary` — application-level React error boundary; catches unhandled errors from any child, renders a full-page fallback with a retry button, and logs the error event
- `WidgetErrorBoundary` — widget-level boundary wrapping each individual dashboard widget; on failure renders a contained error card so other widgets remain functional (graceful degradation)
- Custom error classes: `DashboardError`, `WidgetError`, `ExportError` — each extends `Error` and carries a `code`, `context`, and `recoverable` flag
- Retry logic: up to 3 automatic retries with exponential back-off before showing the permanent error state
- Development mode shows full stack traces; production mode shows user-friendly messages only

#### Data Export System (`src/lib/ExportUtils.ts`)
- `exportToCSV(data, filters, filename)` and `exportToJSON(data, filters, filename)` pure functions
- Configurable filters: date range, customer segment, data type (health scores, alerts, market intelligence)
- File names include ISO 8601 timestamp and filter summary (e.g., `health-scores_2026-03-11_healthy.csv`)
- Progress callback for long-running exports; cancellation via `AbortController`
- Export audit log entry written for every completed or cancelled export
- No sensitive financial data (raw ARR, payment amounts) included in export unless the caller explicitly opts in

#### Performance Optimization
- `React.memo` on `CustomerCard`, `CustomerHealthDisplay`, `PredictiveAlertsWidget`, `MarketIntelligenceWidget` — re-render only when props change
- `useMemo` for expensive derived data (filtered customer lists, aggregate health scores)
- `useCallback` for event handlers passed as props to prevent unnecessary child re-renders
- `React.lazy` + `Suspense` for `MarketIntelligenceWidget` and `PredictiveAlertsWidget` (loaded only after initial paint)
- Virtual scrolling for the customer list when > 50 customers
- Core Web Vitals targets: FCP < 1.5 s, LCP < 2.5 s, CLS < 0.1, TTI < 3.5 s

#### Accessibility Compliance (WCAG 2.1 AA)
- Semantic HTML landmarks: `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>` around dashboard regions
- Skip-to-main-content link as the first focusable element in the page
- All interactive elements reachable and operable via keyboard; logical tab order follows visual layout
- Focus is trapped inside modals/drawers; returns to trigger element on close
- ARIA live regions (`aria-live="polite"`) for alert notifications and async loading state changes
- All color-coded indicators (health badges, sentiment labels) have a non-color secondary indicator (icon or text label)
- Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text across all Tailwind color classes used

#### Security Hardening
- Content Security Policy header: `default-src 'self'`; `script-src 'self'`; no `unsafe-inline` or `unsafe-eval`
- HTTP security headers via `next.config.js`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- All user search inputs and URL parameters sanitized before use; no raw values reflected into the DOM
- Export endpoints enforce rate limiting (max 10 exports per user per minute)
- Error messages and logs never expose internal stack traces, file paths, or API keys

#### Deployment Configuration
- `next.config.js` updated with security headers, bundle analysis plugin, and source map generation for production
- `/api/health` route returning `{ status: 'ok', uptime: number, version: string }` for load balancer health checks
- Environment variables validated at startup with descriptive errors for missing required values
- Production logging: structured JSON logs with severity, component, and correlation ID; no `console.log` in production paths

### Constraints
- **Stack:** Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS
- **No new UI libraries** — Tailwind utility classes + existing component patterns only
- **File locations:**
  - `src/app/page.tsx` — updated orchestrator layout
  - `src/components/DashboardErrorBoundary.tsx`
  - `src/components/WidgetErrorBoundary.tsx`
  - `src/lib/ExportUtils.ts`
  - `src/lib/errors.ts` — shared error classes
  - `src/app/api/health/route.ts`
  - `next.config.js` — security headers + bundle config
- **Props interface for WidgetErrorBoundary:**
  ```ts
  interface WidgetErrorBoundaryProps {
    widgetName: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }
  ```
- **Error class shape:**
  ```ts
  class DashboardError extends Error { constructor(message: string, public code: string, public recoverable: boolean) }
  ```
- **Backward compatibility:** all existing widget APIs unchanged; orchestrator adds wrapping only

### Acceptance Criteria

#### Error Boundaries
- [ ] A widget that throws does not crash other widgets or the page shell
- [ ] `WidgetErrorBoundary` renders a contained error card with widget name and retry button
- [ ] `DashboardErrorBoundary` renders a full-page fallback when the app-level error boundary catches
- [ ] Retry button re-mounts the failed component; gives up after 3 attempts
- [ ] Production build shows no stack traces in the UI; development build shows full detail

#### Export System
- [ ] `exportToCSV` produces a valid, RFC 4180-compliant CSV with headers matching data fields
- [ ] `exportToJSON` produces valid, pretty-printed JSON
- [ ] Date-range and segment filters correctly limit exported rows
- [ ] File name includes ISO timestamp and active filter summary
- [ ] Progress callback fires at reasonable intervals during large exports
- [ ] Cancellation via `AbortController` stops export and writes a cancelled audit entry
- [ ] Export endpoint returns 429 after exceeding the rate limit

#### Performance
- [ ] Lighthouse performance score ≥ 90 on desktop for the main dashboard page
- [ ] No unnecessary re-renders of memoized widgets when unrelated state changes
- [ ] `MarketIntelligenceWidget` and `PredictiveAlertsWidget` are lazily loaded (visible in bundle analysis as separate chunks)
- [ ] Customer list with 200 entries scrolls at 60 fps using virtual scrolling

#### Accessibility
- [ ] axe-core automated scan reports zero critical or serious violations
- [ ] All widgets reachable and operable using keyboard alone
- [ ] Skip-to-main link is the first tab stop and moves focus to `<main>`
- [ ] Dismissing an alert modal returns focus to the trigger button
- [ ] All health/sentiment color indicators have an accompanying text or icon label
- [ ] Color contrast passes WCAG AA for all text/background combinations

#### Security
- [ ] Response headers include `X-Frame-Options`, `X-Content-Type-Options`, and a `Content-Security-Policy`
- [ ] Entering `<script>alert(1)</script>` in the search box does not execute JavaScript
- [ ] Export endpoint returns 429 after 10 requests within 60 seconds from the same user
- [ ] `/api/health` returns 200 with valid JSON; does not expose version details in production

#### Tests
- [ ] Unit tests for `ExportUtils` covering CSV/JSON output, filters, cancellation, and rate limiting
- [ ] Unit tests for all custom error classes and their `recoverable` flag
- [ ] Integration test simulating a widget crash and verifying graceful degradation
- [ ] Accessibility snapshot tests to catch regression in ARIA attributes
- [ ] Security tests for XSS via search input and export parameters
