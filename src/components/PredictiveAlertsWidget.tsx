'use client';

import { useEffect, useState } from 'react';
import type { Alert, AlertPriority, HealthScoreResult, CustomerAlertData } from '@/lib/alerts';
import { alertEngine } from '@/lib/alerts';
import type { CorrelatedInsight } from '@/lib/MarketIntelligenceService';
import { MarketIntelligenceService, correlateWithAlerts } from '@/lib/MarketIntelligenceService';
import { mockCustomers } from '@/data/mock-customers';

const service = new MarketIntelligenceService();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictiveAlertsWidgetProps {
  customerId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG: Record<
  AlertPriority,
  { label: string; dot: string; badge: string; border: string }
> = {
  high: {
    label: 'High',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-800',
    border: 'border-red-200',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-100 text-yellow-800',
    border: 'border-yellow-200',
  },
};

// Human-friendly rule labels
const RULE_LABELS: Record<string, string> = {
  PAYMENT_RISK: 'Payment Risk',
  ENGAGEMENT_CLIFF: 'Engagement Cliff',
  CONTRACT_EXPIRATION_RISK: 'Contract Expiration Risk',
  SUPPORT_TICKET_SPIKE: 'Support Ticket Spike',
  FEATURE_ADOPTION_STALL: 'Feature Adoption Stall',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-label="Loading alerts">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );
}

interface AlertItemProps {
  alert: Alert;
  onDismiss: (id: string) => void;
}

function AlertItem({ alert, onDismiss }: AlertItemProps) {
  const cfg = PRIORITY_CONFIG[alert.priority];
  const ruleLabel = RULE_LABELS[alert.rule] ?? alert.rule;

  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border ${cfg.border} bg-white p-3`}
      aria-label={`${cfg.label} priority alert: ${ruleLabel}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Priority indicator — color + text label for accessibility */}
          <span
            className={`inline-block h-2 w-2 rounded-full shrink-0 ${cfg.dot}`}
            aria-hidden="true"
          />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${cfg.badge}`}
          >
            {cfg.label}
          </span>
          <span className="text-sm font-medium text-gray-900 truncate">
            {ruleLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(alert.id)}
          className="shrink-0 rounded px-2 py-0.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={`Dismiss ${ruleLabel} alert`}
        >
          Dismiss
        </button>
      </div>

      {/* Alert message */}
      <p className="text-sm text-gray-700 leading-snug">{alert.message}</p>

      {/* Recommended action */}
      <p className="text-xs text-gray-500 italic">{alert.recommendedAction}</p>

      {/* Market context snippet — shown only when correlated */}
      {alert.marketContext && (
        <div className="rounded bg-blue-50 border border-blue-100 px-2 py-1.5">
          <p className="text-xs text-blue-700 font-medium mb-0.5">Market Context</p>
          <p className="text-xs text-blue-600 leading-snug">{alert.marketContext}</p>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PredictiveAlertsWidget({
  customerId,
}: PredictiveAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setAlerts([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const customer = mockCustomers.find((c) => c.id === customerId);
    if (!customer) {
      setError('Customer not found.');
      setLoading(false);
      return;
    }

    // Derive health score from mock data
    const delta = (customer.healthScore % 7) * (customer.healthScore > 50 ? -1 : 1);
    const previousScore = Math.max(0, Math.min(100, customer.healthScore - delta));
    const droppedPointsIn7Days = previousScore - customer.healthScore;
    const healthScore: HealthScoreResult = {
      customerId,
      score: customer.healthScore,
      previousScore,
      droppedPointsIn7Days: droppedPointsIn7Days > 0 ? droppedPointsIn7Days : 0,
    };

    // Build alert input data from mock signals
    const score = customer.healthScore;
    const isAtRisk = score < 50;
    const isCritical = score < 30;
    const alertData: CustomerAlertData = {
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

    const activeAlerts = alertEngine(alertData, healthScore);

    service
      .getMarketData(customer.company)
      .then((marketData) => {
        if (!cancelled) {
          const insights: CorrelatedInsight[] = correlateWithAlerts(marketData, activeAlerts);
          const annotated = activeAlerts.map((alert) => {
            const insight = insights.find((i) => i.alertId === alert.id);
            return insight ? { ...alert, marketContext: insight.headline } : alert;
          });
          setAlerts(annotated.filter((a) => !a.dismissed));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Market data failure is non-fatal — still show alerts without context
          setAlerts(activeAlerts.filter((a) => !a.dismissed));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  /**
   * Dismiss an alert locally without a page reload.
   * Uses pure function semantics: replaces the alerts array.
   */
  function handleDismiss(alertId: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col gap-4 w-full">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Predictive Alerts
      </h2>

      {/* Empty state — no customer selected */}
      {!customerId && (
        <p className="text-sm text-gray-500 py-4 text-center">
          Select a customer to view predictive alerts.
        </p>
      )}

      {/* Loading */}
      {customerId && loading && <LoadingSkeleton />}

      {/* Error */}
      {customerId && !loading && error && (
        <p className="text-sm text-red-600 py-4 text-center" role="alert">
          {error}
        </p>
      )}

      {/* Data */}
      {customerId && !loading && !error && (
        <>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No active alerts for this customer.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} onDismiss={handleDismiss} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
