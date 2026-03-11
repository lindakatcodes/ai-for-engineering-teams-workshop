# Spec: Market Intelligence Widget

## Feature: MarketIntelligenceWidget Component & API

### Context
- Dashboard widget that surfaces real-time market sentiment and news for a selected customer's company
- Sits alongside the Domain Health and Predictive Alerts widgets in the responsive dashboard grid (`src/app/page.tsx`)
- Receives the selected customer's `company` name from `CustomerSelector` and fetches market data automatically when selection changes
- Uses mock data generation (`src/data/mock-market-intelligence.ts`) for reliable, dependency-free operation

### Requirements

#### API Route (`src/app/api/market-intelligence/[company]/route.ts`)
- `GET /api/market-intelligence/[company]` — returns market data for the given company name
- Uses `generateMockMarketData` and `calculateMockSentiment` from `src/data/mock-market-intelligence.ts`
- Validates and sanitizes the `company` path parameter before use
- Simulates realistic API delay (300–800 ms) for authentic UX
- Returns consistent JSON:
  ```ts
  {
    company: string;
    sentiment: { score: number; label: 'positive' | 'neutral' | 'negative'; confidence: number; };
    articleCount: number;
    headlines: { title: string; source: string; publishedAt: string; }[];
    lastUpdated: string; // ISO 8601
  }
  ```
- Returns `400` for empty/invalid company names; `500` with sanitized message on unexpected errors

#### Service Layer (`src/lib/MarketIntelligenceService.ts`)
- `MarketIntelligenceService` class with a `getMarketData(company: string)` method
- In-memory cache with 10-minute TTL; returns cached result if fresh
- Throws `MarketIntelligenceError extends Error` on validation failure or fetch error
- Pure function helpers for cache TTL checks and response normalization

#### UI Component (`src/components/MarketIntelligenceWidget.tsx`)
- Accepts `company: string` prop; re-fetches when prop changes
- Displays overall sentiment with color-coded badge: green (positive), yellow (neutral), red (negative)
- Shows article count and last-updated timestamp
- Lists top 3 headlines with source name and formatted publication date
- Loading skeleton while fetching
- Error state with user-friendly message (no internal detail leakage)
- Empty/no-company state prompting the user to select a customer

#### Dashboard Integration (`src/app/page.tsx`)
- Add `MarketIntelligenceWidget` to the existing 3-column widget grid
- Pass `company` from currently selected `Customer` (from `CustomerSelector`)
- Follow the existing `DashboardWidgetDemo` placeholder slot for Exercise 6

### Constraints
- **Stack:** Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS
- **Data:** `src/data/mock-market-intelligence.ts` — `MockHeadline`, `MockMarketData`, `generateMockMarketData`, `calculateMockSentiment` already exist; do not duplicate
- **No external UI libraries** — Tailwind utility classes only
- **Color coding** must match dashboard conventions: green = healthy/positive, yellow = warning/neutral, red = critical/negative
- **Security:** Company name validated with `/^[a-zA-Z0-9 .,&'-]{1,100}$/`; no raw user input reflected in error messages
- **File locations:**
  - `src/app/api/market-intelligence/[company]/route.ts`
  - `src/lib/MarketIntelligenceService.ts`
  - `src/components/MarketIntelligenceWidget.tsx`
- **Props interface:**
  ```ts
  interface MarketIntelligenceWidgetProps {
    company: string;
  }
  ```
- **Performance:** Cache prevents redundant fetches for the same company within 10 minutes; component must not block dashboard render

### Acceptance Criteria

#### API Route
- [ ] `GET /api/market-intelligence/Acme` returns 200 with correct JSON shape
- [ ] `GET /api/market-intelligence/` (empty) returns 400
- [ ] Response includes `sentiment`, `articleCount`, `headlines` (max 3), and `lastUpdated`
- [ ] Company name with special characters outside the allowed pattern returns 400
- [ ] Error responses contain no internal stack traces or sensitive details

#### Service Layer
- [ ] `getMarketData` returns cached result on second call within 10 minutes
- [ ] Cache is invalidated after TTL expires
- [ ] Throws `MarketIntelligenceError` for invalid company names
- [ ] All methods are strongly typed — no `any` types

#### UI Component
- [ ] Sentiment badge renders green, yellow, or red matching the label from the API
- [ ] All 3 headlines display title, source, and formatted date
- [ ] Article count and last-updated timestamp are visible
- [ ] Loading skeleton shown during fetch
- [ ] Error message shown on API failure (no raw error detail)
- [ ] Empty state shown when `company` prop is an empty string
- [ ] Score and colors are consistent with CustomerCard and CustomerHealthDisplay health indicators
- [ ] Responsive layout works at 375 px (mobile) and 1280 px (desktop)
- [ ] Component re-fetches automatically when `company` prop changes
