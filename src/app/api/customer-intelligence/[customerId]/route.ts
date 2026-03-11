import { NextRequest, NextResponse } from 'next/server';
import { mockCustomers } from '@/data/mock-customers';
import {
  alertEngine,
  type Alert,
  type HealthScoreResult,
  type CustomerAlertData,
} from '@/lib/alerts';
import {
  MarketIntelligenceService,
  MarketIntelligenceError,
  correlateWithAlerts,
  type MarketData,
  type CorrelatedInsight,
} from '@/lib/MarketIntelligenceService';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Accept alphanumeric ids up to 64 chars; reject anything else */
const CUSTOMER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

// ---------------------------------------------------------------------------
// Module-level service singleton (shares cache across requests in one worker)
// ---------------------------------------------------------------------------
const intelligenceService = new MarketIntelligenceService();

// ---------------------------------------------------------------------------
// Rate limiting — in-memory, per-user-ip, 30 req/min
// ---------------------------------------------------------------------------
interface RateLimitEntry {
  count: number;
  windowStart: number;
}
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitStore = new Map<string, RateLimitEntry>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// Health score calculation (derived from mock data only)
// ---------------------------------------------------------------------------
function calculateHealthScore(customerId: string): HealthScoreResult {
  const customer = mockCustomers.find((c) => c.id === customerId);
  if (!customer) {
    return { customerId, score: 0 };
  }
  // Simulate a realistic previous score based on current + a small delta
  const delta = (customer.healthScore % 7) * (customer.healthScore > 50 ? -1 : 1);
  const previousScore = Math.max(0, Math.min(100, customer.healthScore - delta));
  const droppedPointsIn7Days = previousScore - customer.healthScore;
  return {
    customerId,
    score: customer.healthScore,
    previousScore,
    droppedPointsIn7Days: droppedPointsIn7Days > 0 ? droppedPointsIn7Days : 0,
  };
}

// ---------------------------------------------------------------------------
// Build customer alert data from mock — no raw financial figures
// ---------------------------------------------------------------------------
function buildCustomerAlertData(customerId: string): CustomerAlertData | null {
  const customer = mockCustomers.find((c) => c.id === customerId);
  if (!customer) return null;

  // Simulate engagement/support signals deterministically from healthScore
  const score = customer.healthScore;
  const isAtRisk = score < 50;
  const isCritical = score < 30;

  return {
    ...customer,
    arrGrowthPositive: customer.subscriptionTier === 'enterprise',
    daysSinceLastLogin: isCritical ? 35 : isAtRisk ? 10 : 2,
    loginsLast7Days: isCritical ? 0 : isAtRisk ? 2 : 10,
    avgDailyLoginsLast30Days: isCritical ? 3 : isAtRisk ? 2 : 3,
    supportTicketsLast7Days: isCritical ? 5 : isAtRisk ? 2 : 0,
    hasEscalatedTicket: isCritical,
    daysUntilContractExpiry: isAtRisk ? 60 : 200,
    daysSinceLastPayment: isCritical ? 45 : 10,
    newFeatureUsageLast30Days: !isAtRisk,
  };
}

// ---------------------------------------------------------------------------
// Response type
// ---------------------------------------------------------------------------
interface IntelligencePayload {
  customerId: string;
  healthScore: HealthScoreResult;
  activeAlerts: Alert[];
  marketData: MarketData | null;
  correlatedInsights: CorrelatedInsight[];
  generatedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  // Rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  const { customerId } = await params;

  // Validate customerId
  if (!customerId || !CUSTOMER_ID_PATTERN.test(customerId)) {
    return NextResponse.json(
      { error: 'Invalid customer ID.' },
      { status: 400 },
    );
  }

  // Verify customer exists
  const customer = mockCustomers.find((c) => c.id === customerId);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  }

  try {
    // Run health score, alert evaluation, and market data fetch concurrently
    const [healthScore, marketDataResult] = await Promise.all([
      Promise.resolve(calculateHealthScore(customerId)),
      intelligenceService.getMarketData(customer.company).catch((err) => {
        // Market data failure is non-fatal
        if (err instanceof MarketIntelligenceError) {
          console.warn(`Market data unavailable for ${customer.company}:`, err.message);
        } else {
          console.error('Unexpected market data error:', err);
        }
        return null;
      }),
    ]);

    // Build alert data and run engine (synchronous, so no need to await)
    const alertData = buildCustomerAlertData(customerId);
    const activeAlerts = alertData ? alertEngine(alertData, healthScore) : [];

    // Correlate market signals with active alerts
    const correlatedInsights: CorrelatedInsight[] =
      marketDataResult !== null
        ? correlateWithAlerts(marketDataResult, activeAlerts)
        : [];

    // Annotate alerts with market context from correlated insights
    const annotatedAlerts = activeAlerts.map((alert) => {
      const insight = correlatedInsights.find((i) => i.alertId === alert.id);
      return insight ? { ...alert, marketContext: insight.headline } : alert;
    });

    const payload: IntelligencePayload = {
      customerId,
      healthScore,
      activeAlerts: annotatedAlerts,
      marketData: marketDataResult,
      correlatedInsights,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('Unexpected error in customer-intelligence route:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
