import {
  generateMockMarketData,
  calculateMockSentiment,
} from '@/data/mock-market-intelligence';
import type { Alert } from '@/lib/alerts';

export class MarketIntelligenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketIntelligenceError';
  }
}

export interface CorrelatedInsight {
  alertId: string;
  headline: string;
  relevanceScore: number;
}

const COMPANY_PATTERN = /^[a-zA-Z0-9 .,&'-]{1,100}$/;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface MarketData {
  company: string;
  sentiment: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  };
  articleCount: number;
  headlines: { title: string; source: string; publishedAt: string }[];
  lastUpdated: string;
}

interface CacheEntry {
  data: MarketData;
  fetchedAt: number;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt > TTL_MS;
}

function normalize(company: string): MarketData {
  const mockData = generateMockMarketData(company);
  const sentiment = calculateMockSentiment(mockData.headlines);
  return {
    company,
    sentiment,
    articleCount: mockData.articleCount,
    headlines: mockData.headlines.slice(0, 3).map((h) => ({
      title: h.title,
      source: h.source,
      publishedAt: h.publishedAt,
    })),
    lastUpdated: new Date().toISOString(),
  };
}

export class MarketIntelligenceService {
  private cache = new Map<string, CacheEntry>();

  async getMarketData(company: string): Promise<MarketData> {
    if (!company || !COMPANY_PATTERN.test(company)) {
      throw new MarketIntelligenceError('Invalid company name');
    }

    const cached = this.cache.get(company);
    if (cached && !isExpired(cached)) {
      return cached.data;
    }

    const data = normalize(company);
    this.cache.set(company, { data, fetchedAt: Date.now() });
    return data;
  }
}

// ---------------------------------------------------------------------------
// Rules that are considered financially sensitive and get extra market context
// when negative news is present.
// ---------------------------------------------------------------------------
const FINANCIALLY_SENSITIVE_RULES = new Set<string>([
  'PAYMENT_RISK',
  'CONTRACT_EXPIRATION_RISK',
]);

/**
 * Pure function: enriches each alert with a `marketContext` string when
 * a relevant market headline can be correlated.
 *
 * Returns an array of CorrelatedInsight objects (alert → headline mappings).
 * The alert objects in `activeAlerts` are NOT mutated; use the returned
 * insights to annotate them at the call site.
 */
export function correlateWithAlerts(
  marketData: MarketData,
  activeAlerts: Alert[],
): CorrelatedInsight[] {
  const insights: CorrelatedInsight[] = [];

  const negativeOrNeutral =
    marketData.sentiment.label === 'negative' ||
    marketData.sentiment.label === 'neutral';

  for (const alert of activeAlerts) {
    if (alert.dismissed) continue;

    // Only correlate payment/contract alerts with negative-leaning sentiment
    if (
      FINANCIALLY_SENSITIVE_RULES.has(alert.rule) &&
      !negativeOrNeutral
    ) {
      continue;
    }

    // Pick the most relevant headline (first is assumed most recent)
    const headline = marketData.headlines[0];
    if (!headline) continue;

    // Relevance score: combine sentiment confidence with priority weight
    const priorityWeight = alert.priority === 'high' ? 1.5 : 1.0;
    const relevanceScore =
      Math.round(marketData.sentiment.confidence * priorityWeight * 100) / 100;

    insights.push({
      alertId: alert.id,
      headline: headline.title,
      relevanceScore,
    });
  }

  return insights;
}
