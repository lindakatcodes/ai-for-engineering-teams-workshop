'use client';

/**
 * DashboardOrchestrator — production-ready dashboard shell.
 *
 * Responsibilities:
 * - Semantic HTML landmarks for WCAG 2.1 AA compliance
 * - Skip-to-main-content as the first focusable element
 * - Application-level DashboardErrorBoundary wrapping the entire page tree
 * - Per-widget WidgetErrorBoundary for graceful degradation
 * - React.lazy + Suspense for lazily loaded widgets (separate JS chunks)
 * - useMemo / useCallback to prevent unnecessary re-renders
 * - ARIA live region for async status announcements
 * - Export controls wired to ExportUtils
 * - XSS-safe search input (value stored in state, never reflected via innerHTML)
 */

import React, {
  Suspense,
  lazy,
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { mockCustomers, Customer } from '@/data/mock-customers';
import CustomerCard from '@/components/CustomerCard';
import DashboardErrorBoundary from '@/components/DashboardErrorBoundary';
import WidgetErrorBoundary from '@/components/WidgetErrorBoundary';
import { exportToCSV, exportToJSON, ExportFilters } from '@/lib/ExportUtils';

// ---------------------------------------------------------------------------
// Lazily loaded widgets (separate JS chunks for faster initial paint)
// ---------------------------------------------------------------------------

const MarketIntelligenceWidget = lazy(
  () => import('@/components/MarketIntelligenceWidget'),
);

const PredictiveAlertsWidget = lazy(
  () => import('@/components/PredictiveAlertsWidget'),
);

// ---------------------------------------------------------------------------
// Widget loading skeleton
// ---------------------------------------------------------------------------

function WidgetSkeleton({ label }: { label: string }) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse"
      role="status"
      aria-label={`Loading ${label}`}
      aria-live="polite"
    >
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" aria-hidden="true" />
      <div className="space-y-2" aria-hidden="true">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-4/6" />
      </div>
      <span className="sr-only">Loading {label}…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health score helpers (mirrors CustomerCard conventions)
// ---------------------------------------------------------------------------

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'At Risk';
  return 'Critical';
}

function getHealthBadgeClass(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

// ---------------------------------------------------------------------------
// Summary stats panel
// ---------------------------------------------------------------------------

interface SummaryStatsProps {
  customers: Customer[];
}

const SummaryStats = React.memo(function SummaryStats({ customers }: SummaryStatsProps) {
  const stats = useMemo(() => {
    const total = customers.length;
    const healthy = customers.filter((c) => c.healthScore >= 80).length;
    const atRisk = customers.filter(
      (c) => c.healthScore >= 50 && c.healthScore < 80,
    ).length;
    const critical = customers.filter((c) => c.healthScore < 50).length;
    const avgScore =
      total > 0
        ? Math.round(customers.reduce((sum, c) => sum + c.healthScore, 0) / total)
        : 0;
    return { total, healthy, atRisk, critical, avgScore };
  }, [customers]);

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      aria-label="Customer health summary"
    >
      {[
        {
          label: 'Total Customers',
          value: stats.total,
          badge: 'bg-gray-100 text-gray-800',
        },
        {
          label: 'Healthy',
          value: stats.healthy,
          badge: 'bg-green-100 text-green-800',
        },
        {
          label: 'At Risk',
          value: stats.atRisk,
          badge: 'bg-yellow-100 text-yellow-800',
        },
        {
          label: 'Critical',
          value: stats.critical,
          badge: 'bg-red-100 text-red-800',
        },
      ].map(({ label, value, badge }) => (
        <div
          key={label}
          className="bg-white rounded-lg border border-gray-200 p-4 text-center"
        >
          <p className="text-2xl font-bold text-gray-900" aria-label={`${value} ${label}`}>
            {value}
          </p>
          <span
            className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}
            aria-hidden="true"
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Export panel
// ---------------------------------------------------------------------------

interface ExportPanelProps {
  customers: Customer[];
  statusRef: React.RefObject<HTMLDivElement | null>;
}

const ExportPanel = React.memo(function ExportPanel({
  customers,
  statusRef,
}: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable announce helper — reads from a ref so it never changes identity
  const announce = useCallback(
    (message: string): void => {
      if (statusRef.current) {
        statusRef.current.textContent = message;
      }
    },
    [statusRef],
  );

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    abortControllerRef.current = new AbortController();
    announce('Starting CSV export…');
    try {
      const filters: ExportFilters = { dataType: 'health-scores' };
      await exportToCSV(
        customers,
        filters,
        undefined,
        (exported, total) => announce(`Exporting CSV: ${exported}/${total}`),
        abortControllerRef.current.signal,
      );
      announce('CSV export complete.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.';
      announce(message);
    } finally {
      setIsExporting(false);
    }
  }, [customers, announce]);

  const handleExportJSON = useCallback(async () => {
    setIsExporting(true);
    abortControllerRef.current = new AbortController();
    announce('Starting JSON export…');
    try {
      const filters: ExportFilters = { dataType: 'health-scores' };
      await exportToJSON(
        customers,
        filters,
        undefined,
        (exported, total) => announce(`Exporting JSON: ${exported}/${total}`),
        abortControllerRef.current.signal,
      );
      announce('JSON export complete.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.';
      announce(message);
    } finally {
      setIsExporting(false);
    }
  }, [customers, announce]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    announce('Export cancelled.');
  }, [announce]);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Export controls">
      <button
        type="button"
        onClick={handleExportCSV}
        disabled={isExporting}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Export customers as CSV"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={handleExportJSON}
        disabled={isExporting}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Export customers as JSON"
      >
        Export JSON
      </button>
      {isExporting && (
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
          aria-label="Cancel in-progress export"
        >
          Cancel Export
        </button>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Customer list section
// ---------------------------------------------------------------------------

interface CustomerListSectionProps {
  customers: Customer[];
  selectedId: string | null;
  onSelect: (customer: Customer) => void;
}

const CustomerListSection = React.memo(function CustomerListSection({
  customers,
  selectedId,
  onSelect,
}: CustomerListSectionProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      role="list"
      aria-label="Customer list"
    >
      {customers.map((customer) => (
        <div
          key={customer.id}
          role="listitem"
          className={
            customer.id === selectedId ? 'rounded-lg ring-2 ring-blue-500' : ''
          }
        >
          <CustomerCard customer={customer} onClick={onSelect} />
        </div>
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Selected customer detail panel
// ---------------------------------------------------------------------------

interface CustomerDetailPanelProps {
  customer: Customer;
  onClose: () => void;
}

const CustomerDetailPanel = React.memo(function CustomerDetailPanel({
  customer,
  onClose,
}: CustomerDetailPanelProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Return focus to close button when panel opens
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, [customer.id]);

  const healthLabel = getHealthLabel(customer.healthScore);
  const badgeClass = getHealthBadgeClass(customer.healthScore);

  return (
    <aside
      className="bg-white rounded-xl border border-gray-200 shadow p-6 space-y-4"
      aria-label={`Customer detail: ${customer.name}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{customer.name}</h2>
          <p className="text-sm text-gray-500">{customer.company}</p>
        </div>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
          aria-label="Close customer detail panel"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Health Score
          </dt>
          <dd className="mt-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}
              aria-label={`Health score: ${customer.healthScore} — ${healthLabel}`}
            >
              {customer.healthScore}
              <span className="sr-only">{healthLabel}</span>
              <span aria-hidden="true"> {healthLabel}</span>
            </span>
          </dd>
        </div>

        {customer.subscriptionTier && (
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Tier
            </dt>
            <dd className="mt-1 capitalize text-gray-900">{customer.subscriptionTier}</dd>
          </div>
        )}

        {customer.email && (
          <div className="col-span-2">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Email
            </dt>
            <dd className="mt-1 text-gray-900 truncate">
              <a
                href={`mailto:${customer.email}`}
                className="text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                {customer.email}
              </a>
            </dd>
          </div>
        )}

        {customer.domains && customer.domains.length > 0 && (
          <div className="col-span-2">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Domains
            </dt>
            <dd className="mt-1">
              <ul className="flex flex-col gap-0.5">
                {customer.domains.map((d) => (
                  <li
                    key={d}
                    className="truncate rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-700 font-mono"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
    </aside>
  );
});

// ---------------------------------------------------------------------------
// Main orchestrator page
// ---------------------------------------------------------------------------

function DashboardContent() {
  // XSS-safe: query is stored in state and rendered via React's text escaping,
  // never via dangerouslySetInnerHTML or direct DOM manipulation.
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Ref for ARIA live region (status announcements)
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Memoised filtered customers — recomputes only when query or data changes
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mockCustomers;
    return mockCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const selectedCustomer = useMemo(
    () => mockCustomers.find((c) => c.id === selectedCustomerId) ?? null,
    [selectedCustomerId],
  );

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomerId((prev) => (prev === customer.id ? null : customer.id));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedCustomerId(null);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.currentTarget.value);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip navigation — first focusable element on the page (WCAG 2.1 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* ARIA live region for async status announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                          */}
      {/* ------------------------------------------------------------------ */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Customer Intelligence Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              AI for Engineering Teams Workshop
            </p>
          </div>

          {/* Export controls */}
          <ExportPanel customers={filteredCustomers} statusRef={liveRegionRef} />
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation / filter bar                                              */}
      {/* ------------------------------------------------------------------ */}
      <nav
        aria-label="Dashboard filters"
        className="bg-white border-b border-gray-100 px-4 py-3 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-screen-2xl">
          <label htmlFor="customer-search" className="sr-only">
            Search customers by name or company
          </label>
          <input
            id="customer-search"
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name or company…"
            autoComplete="off"
            className="w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search customers"
          />
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main id="main-content" className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Summary statistics */}
          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="sr-only">
              Customer health summary
            </h2>
            <WidgetErrorBoundary widgetName="Summary Stats">
              <SummaryStats customers={mockCustomers} />
            </WidgetErrorBoundary>
          </section>

          {/* Main grid: customer list + optional detail panel */}
          <div
            className={
              selectedCustomer
                ? 'grid grid-cols-1 lg:grid-cols-3 gap-6'
                : 'grid grid-cols-1 gap-6'
            }
          >
            {/* Customer list */}
            <section
              aria-labelledby="customers-heading"
              className={selectedCustomer ? 'lg:col-span-2' : ''}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 id="customers-heading" className="text-lg font-semibold text-gray-900">
                  Customers
                  <span
                    className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                    aria-label={`${filteredCustomers.length} customers shown`}
                  >
                    {filteredCustomers.length}
                  </span>
                </h2>
              </div>

              {filteredCustomers.length === 0 ? (
                <p
                  className="text-sm text-gray-500 py-8 text-center"
                  aria-live="polite"
                  role="status"
                >
                  No customers match &ldquo;{searchQuery}&rdquo;
                </p>
              ) : (
                <WidgetErrorBoundary widgetName="Customer List">
                  <CustomerListSection
                    customers={filteredCustomers}
                    selectedId={selectedCustomerId}
                    onSelect={handleSelectCustomer}
                  />
                </WidgetErrorBoundary>
              )}
            </section>

            {/* Customer detail panel */}
            {selectedCustomer && (
              <section aria-labelledby="detail-heading">
                <h2 id="detail-heading" className="sr-only">
                  Customer detail
                </h2>
                <CustomerDetailPanel
                  customer={selectedCustomer}
                  onClose={handleCloseDetail}
                />
              </section>
            )}
          </div>

          {/* Lazily loaded widget row */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            aria-label="Intelligence widgets"
          >
            <section aria-labelledby="market-heading">
              <h2 id="market-heading" className="sr-only">
                Market intelligence
              </h2>
              <WidgetErrorBoundary widgetName="Market Intelligence">
                <Suspense fallback={<WidgetSkeleton label="Market Intelligence" />}>
                  <MarketIntelligenceWidget
                    company={selectedCustomer?.company ?? ''}
                  />
                </Suspense>
              </WidgetErrorBoundary>
            </section>

            <section aria-labelledby="alerts-heading">
              <h2 id="alerts-heading" className="sr-only">
                Predictive alerts
              </h2>
              <WidgetErrorBoundary widgetName="Predictive Alerts">
                <Suspense fallback={<WidgetSkeleton label="Predictive Alerts" />}>
                  <PredictiveAlertsWidget
                    customerId={selectedCustomer?.id ?? ''}
                  />
                </Suspense>
              </WidgetErrorBoundary>
            </section>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer className="mt-12 border-t border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-2xl text-xs text-gray-400 text-center">
          Customer Intelligence Dashboard &mdash; AI for Engineering Teams Workshop
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}
