'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/data/mock-customers';
import {
  calculateHealthScore,
  HealthScoreResult,
  PaymentData,
  EngagementData,
  ContractData,
  SupportData,
} from '@/lib/healthCalculator';

// ---------------------------------------------------------------------------
// Prop Interfaces
// ---------------------------------------------------------------------------

/**
 * Optional pre-computed factor data for the selected customer.
 * If omitted, the component falls back to safe defaults (new-customer scenario).
 */
export interface CustomerHealthInputData {
  payment?: Partial<PaymentData> | null;
  engagement?: Partial<EngagementData> | null;
  contract?: Partial<ContractData> | null;
  support?: Partial<SupportData> | null;
  /** Optional prior composite score used for trend comparison */
  previousScore?: number;
}

export interface CustomerHealthDisplayProps {
  /** The customer whose health score should be displayed */
  customer: Customer | null;
  /**
   * Factor data used to compute the score. When omitted the component uses
   * the customer's existing `healthScore` field as a fallback display value
   * and derives defaults for the breakdown.
   */
  inputData?: CustomerHealthInputData;
  /** Additional Tailwind classes for the outermost container */
  className?: string;
}

// ---------------------------------------------------------------------------
// Health Colour Helpers (matches CustomerCard conventions)
// ---------------------------------------------------------------------------

interface HealthColours {
  badgeClass: string;
  dotClass: string;
  barClass: string;
  label: string;
}

function getHealthColours(riskLevel: HealthScoreResult['riskLevel']): HealthColours {
  switch (riskLevel) {
    case 'healthy':
      return {
        badgeClass: 'bg-green-100 text-green-800',
        dotClass: 'bg-green-500',
        barClass: 'bg-green-500',
        label: 'Healthy',
      };
    case 'warning':
      return {
        badgeClass: 'bg-yellow-100 text-yellow-800',
        dotClass: 'bg-yellow-400',
        barClass: 'bg-yellow-400',
        label: 'Warning',
      };
    case 'critical':
      return {
        badgeClass: 'bg-red-100 text-red-800',
        dotClass: 'bg-red-500',
        barClass: 'bg-red-500',
        label: 'Critical',
      };
  }
}

function getTrendIcon(trend: HealthScoreResult['trend']): { symbol: string; class: string; label: string } {
  switch (trend) {
    case 'improving':
      return { symbol: '↑', class: 'text-green-600', label: 'Improving' };
    case 'declining':
      return { symbol: '↓', class: 'text-red-600', label: 'Declining' };
    case 'stable':
      return { symbol: '→', class: 'text-gray-500', label: 'Stable' };
  }
}

// ---------------------------------------------------------------------------
// Sub-component: Factor Row
// ---------------------------------------------------------------------------

interface FactorRowProps {
  label: string;
  score: number;
  weight: string;
}

function FactorRow({ label, score, weight }: FactorRowProps) {
  const riskLevel: HealthScoreResult['riskLevel'] =
    score >= 71 ? 'healthy' : score >= 31 ? 'warning' : 'critical';
  const colours = getHealthColours(riskLevel);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">
          {label}
          <span className="ml-1 text-xs font-normal text-gray-400">({weight})</span>
        </span>
        <span className="text-xs font-semibold text-gray-900">{Math.round(score)}</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={Math.round(score)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} sub-score: ${Math.round(score)} out of 100`}
      >
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${colours.barClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Displays a customer's computed health score, risk badge, trend indicator,
 * and an expandable factor breakdown.
 *
 * - Integrates with `CustomerSelector` by accepting a `customer` prop that
 *   updates in real time when the user selects a different customer.
 * - Renders a loading shimmer during score computation (simulated async).
 * - Renders a user-friendly error state if calculation fails.
 * - Factor breakdown is collapsed by default and expands on interaction.
 */
export default function CustomerHealthDisplay({
  customer,
  inputData,
  className = '',
}: CustomerHealthDisplayProps) {
  const [result, setResult] = useState<HealthScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Recompute whenever the customer or inputData changes
  useEffect(() => {
    if (!customer) {
      setResult(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Use a microtask to simulate async computation and allow the loading
    // state to render before the (synchronous) calculation runs.
    const timer = setTimeout(() => {
      try {
        const computed = calculateHealthScore(
          inputData?.payment,
          inputData?.engagement,
          inputData?.contract,
          inputData?.support,
          inputData?.previousScore,
        );
        setResult(computed);
      } catch (err) {
        setError(
          err instanceof Error
            ? `Unable to compute health score: ${err.message}`
            : 'An unexpected error occurred while computing the health score.',
        );
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [
    customer,
    inputData?.payment,
    inputData?.engagement,
    inputData?.contract,
    inputData?.support,
    inputData?.previousScore,
  ]);

  // ------------------------------------------------------------------
  // Empty state — no customer selected
  // ------------------------------------------------------------------
  if (!customer) {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-white p-5 text-center ${className}`}
        aria-label="Customer health display — no customer selected"
      >
        <p className="text-sm text-gray-400">Select a customer to view their health score.</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  if (isLoading) {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-white p-5 ${className}`}
        aria-busy="true"
        aria-label={`Computing health score for ${customer.name}`}
      >
        {/* Shimmer header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
        </div>
        {/* Shimmer score */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-16 animate-pulse rounded bg-gray-200" />
          <div className="flex flex-col gap-2">
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
        <p className="sr-only">Computing health score…</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------
  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-5 ${className}`}
        role="alert"
        aria-label="Health score computation error"
      >
        <p className="text-sm font-semibold text-red-800 mb-1">Could not compute health score</p>
        <p className="text-xs text-red-700">{error}</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Success state
  // ------------------------------------------------------------------
  if (!result) return null;

  const colours = getHealthColours(result.riskLevel);
  const trendIcon = getTrendIcon(result.trend);

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white ${className}`}
      aria-label={`Health score for ${customer.name}: ${result.score} — ${colours.label}`}
    >
      {/* ---- Header ---- */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
          <p className="text-xs text-gray-500 truncate">{customer.company}</p>
        </div>

        {/* Risk badge — colour + text for accessibility */}
        <div
          className={`flex items-center gap-1 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${colours.badgeClass}`}
          aria-label={`Risk level: ${colours.label}`}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${colours.dotClass}`} aria-hidden="true" />
          <span>{colours.label}</span>
        </div>
      </div>

      {/* ---- Score + Trend ---- */}
      <div className="flex items-center gap-4 px-4 pb-3">
        <div className="flex flex-col items-start">
          <span
            className="text-4xl font-bold tracking-tight text-gray-900"
            aria-label={`Overall health score: ${result.score}`}
          >
            {result.score}
          </span>
          <span className="text-xs text-gray-400">out of 100</span>
        </div>

        <div className="flex flex-col gap-1">
          {/* Trend indicator */}
          <div
            className={`flex items-center gap-1 text-sm font-medium ${trendIcon.class}`}
            aria-label={`Trend: ${trendIcon.label}`}
          >
            <span aria-hidden="true">{trendIcon.symbol}</span>
            <span>{trendIcon.label}</span>
          </div>

          {/* Score bar */}
          <div
            className="w-28 md:w-40 h-2 rounded-full bg-gray-100"
            role="progressbar"
            aria-valuenow={result.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Health score progress: ${result.score} percent`}
          >
            <div
              className={`h-2 rounded-full transition-all duration-700 ${colours.barClass}`}
              style={{ width: `${result.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---- Expandable Breakdown ---- */}
      <div className="border-t border-gray-100">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 transition-colors"
          onClick={() => setBreakdownOpen((prev) => !prev)}
          aria-expanded={breakdownOpen}
          aria-controls="health-breakdown-panel"
        >
          <span>Factor Breakdown</span>
          <span aria-hidden="true" className="text-gray-400">
            {breakdownOpen ? '▲' : '▼'}
          </span>
        </button>

        {breakdownOpen && (
          <div
            id="health-breakdown-panel"
            className="flex flex-col gap-3 px-4 pb-4 pt-1"
            role="region"
            aria-label="Health score factor breakdown"
          >
            <FactorRow label="Payment History" score={result.breakdown.payment} weight="40%" />
            <FactorRow label="Engagement" score={result.breakdown.engagement} weight="30%" />
            <FactorRow label="Contract Status" score={result.breakdown.contract} weight="20%" />
            <FactorRow label="Support Satisfaction" score={result.breakdown.support} weight="10%" />
          </div>
        )}
      </div>
    </div>
  );
}
