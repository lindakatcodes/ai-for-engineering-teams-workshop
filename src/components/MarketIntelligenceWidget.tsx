'use client';

import { useEffect, useState } from 'react';
import { MarketIntelligenceService } from '@/lib/MarketIntelligenceService';
import type { MarketData } from '@/lib/MarketIntelligenceService';

const service = new MarketIntelligenceService();

interface MarketIntelligenceWidgetProps {
  company: string;
}

const sentimentConfig = {
  positive: { label: 'Positive', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  neutral: { label: 'Neutral', badge: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  negative: { label: 'Negative', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-label="Loading market data">
      <div className="h-4 w-32 bg-gray-200 rounded" />
      <div className="h-6 w-24 bg-gray-200 rounded-full" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}

export default function MarketIntelligenceWidget({ company }: MarketIntelligenceWidgetProps) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    service
      .getMarketData(company)
      .then((data) => {
        if (!cancelled) {
          setData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load market data. Please try again.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [company]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col gap-4 w-full">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Market Intelligence
      </h2>

      {/* Empty state */}
      {!company && (
        <p className="text-sm text-gray-500 py-4 text-center">
          Select a customer to view market intelligence.
        </p>
      )}

      {/* Loading */}
      {company && loading && <LoadingSkeleton />}

      {/* Error */}
      {company && !loading && error && (
        <p className="text-sm text-red-600 py-4 text-center">{error}</p>
      )}

      {/* Data */}
      {company && !loading && !error && data && (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate">{data.company}</span>
            {(() => {
              const cfg = sentimentConfig[data.sentiment.label];
              return (
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}
                  aria-label={`Sentiment: ${cfg.label}`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
                  {cfg.label}
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{data.articleCount} articles</span>
            <span>Updated {formatDate(data.lastUpdated)}</span>
          </div>

          <ul className="flex flex-col gap-2">
            {data.headlines.map((h, i) => (
              <li key={i} className="flex flex-col gap-0.5 rounded bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-900 leading-snug">{h.title}</span>
                <span className="text-xs text-gray-500">
                  {h.source} · {formatDate(h.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
