/**
 * Data export utilities for the Customer Intelligence Dashboard.
 *
 * Supports CSV and JSON exports with configurable filters, progress callbacks,
 * and cancellation via AbortController. An audit log entry is written for every
 * completed or cancelled export. Sensitive financial data is excluded by default.
 */

import { Customer } from '@/data/mock-customers';
import { ExportError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataType = 'health-scores' | 'alerts' | 'market-intelligence';

export interface ExportFilters {
  /** ISO 8601 date strings */
  dateFrom?: string;
  dateTo?: string;
  segment?: Customer['subscriptionTier'];
  dataType?: DataType;
  /** Opt-in to include sensitive financial fields */
  includeSensitiveFinancials?: boolean;
}

export interface AuditLogEntry {
  timestamp: string;
  filename: string;
  format: 'csv' | 'json';
  filters: ExportFilters;
  rowCount: number;
  status: 'completed' | 'cancelled';
}

export type ProgressCallback = (exported: number, total: number) => void;

// In-memory audit log (survives the browser session; a real impl would POST to an API).
const auditLog: AuditLogEntry[] = [];

export function getAuditLog(): Readonly<AuditLogEntry[]> {
  return auditLog;
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory per session; production would use server-side state)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const exportTimestamps: number[] = [];

function checkRateLimit(): void {
  const now = Date.now();
  // Remove entries older than the window
  while (exportTimestamps.length > 0 && exportTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    exportTimestamps.shift();
  }
  if (exportTimestamps.length >= RATE_LIMIT_MAX) {
    throw new ExportError(
      'Export rate limit exceeded. Maximum 10 exports per minute.',
      'RATE_LIMIT_EXCEEDED',
      true,
      { limit: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS },
    );
  }
  exportTimestamps.push(now);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds an ISO 8601 timestamp string safe for use in filenames
 * (colons replaced with hyphens).
 */
function filenameTimestamp(): string {
  return new Date().toISOString().replace(/:/g, '-').slice(0, 19);
}

/** Derives a short filter summary for use in the filename. */
function filterSummary(filters: ExportFilters): string {
  const parts: string[] = [];
  if (filters.segment) parts.push(filters.segment);
  if (filters.dataType) parts.push(filters.dataType);
  if (filters.dateFrom) parts.push(`from-${filters.dateFrom.slice(0, 10)}`);
  if (filters.dateTo) parts.push(`to-${filters.dateTo.slice(0, 10)}`);
  return parts.length > 0 ? `_${parts.join('_')}` : '';
}

/** Applies ExportFilters to the customer list. */
function applyFilters(data: Customer[], filters: ExportFilters): Customer[] {
  let result = [...data];

  if (filters.segment) {
    result = result.filter((c) => c.subscriptionTier === filters.segment);
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    result = result.filter((c) => {
      const updated = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
      return updated >= from;
    });
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime();
    result = result.filter((c) => {
      const updated = c.updatedAt ? new Date(c.updatedAt).getTime() : Infinity;
      return updated <= to;
    });
  }

  return result;
}

/**
 * Returns the set of fields to include in the export.
 * Sensitive financial fields are omitted unless explicitly opted in.
 */
function selectFields(
  customer: Customer,
  filters: ExportFilters,
): Record<string, string | number | undefined> {
  const base: Record<string, string | number | undefined> = {
    id: customer.id,
    name: customer.name,
    company: customer.company,
    healthScore: customer.healthScore,
    subscriptionTier: customer.subscriptionTier,
    domains: customer.domains?.join(';'),
    updatedAt: customer.updatedAt,
  };

  if (filters.includeSensitiveFinancials) {
    // email is PII but not "financial"; including when opted in is acceptable
    base.email = customer.email;
  }

  return base;
}

/** Escapes a single CSV field per RFC 4180. */
function csvField(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Triggers a file download in the browser. */
function triggerDownload(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return; // SSR guard
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Exports customer data to an RFC 4180-compliant CSV file.
 *
 * @param data     - Full customer list (filtering is applied internally)
 * @param filters  - Active filter configuration
 * @param filename - Optional base filename; auto-generated if omitted
 * @param onProgress - Optional progress callback(exported, total)
 * @param signal   - Optional AbortController signal for cancellation
 */
export async function exportToCSV(
  data: Customer[],
  filters: ExportFilters = {},
  filename?: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<void> {
  checkRateLimit();

  const filtered = applyFilters(data, filters);
  const ts = filenameTimestamp();
  const summary = filterSummary(filters);
  const finalFilename = filename ?? `health-scores_${ts}${summary}.csv`;

  if (filtered.length === 0) {
    auditLog.push({
      timestamp: new Date().toISOString(),
      filename: finalFilename,
      format: 'csv',
      filters,
      rowCount: 0,
      status: 'completed',
    });
    return;
  }

  const headers = Object.keys(selectFields(filtered[0], filters));
  const rows: string[] = [headers.map(csvField).join(',')];

  for (let i = 0; i < filtered.length; i++) {
    if (signal?.aborted) {
      auditLog.push({
        timestamp: new Date().toISOString(),
        filename: finalFilename,
        format: 'csv',
        filters,
        rowCount: i,
        status: 'cancelled',
      });
      throw new ExportError('Export cancelled by user.', 'EXPORT_CANCELLED', true);
    }

    const fields = selectFields(filtered[i], filters);
    rows.push(headers.map((h) => csvField(fields[h])).join(','));

    if (onProgress) onProgress(i + 1, filtered.length);

    // Yield to the event loop every 50 rows to allow cancellation checks
    if ((i + 1) % 50 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  triggerDownload(rows.join('\r\n'), finalFilename, 'text/csv;charset=utf-8;');

  auditLog.push({
    timestamp: new Date().toISOString(),
    filename: finalFilename,
    format: 'csv',
    filters,
    rowCount: filtered.length,
    status: 'completed',
  });
}

/**
 * Exports customer data to a pretty-printed JSON file.
 *
 * @param data     - Full customer list (filtering is applied internally)
 * @param filters  - Active filter configuration
 * @param filename - Optional base filename; auto-generated if omitted
 * @param onProgress - Optional progress callback(exported, total)
 * @param signal   - Optional AbortController signal for cancellation
 */
export async function exportToJSON(
  data: Customer[],
  filters: ExportFilters = {},
  filename?: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<void> {
  checkRateLimit();

  const filtered = applyFilters(data, filters);
  const ts = filenameTimestamp();
  const summary = filterSummary(filters);
  const finalFilename = filename ?? `health-scores_${ts}${summary}.json`;

  const output: Record<string, string | number | undefined>[] = [];

  for (let i = 0; i < filtered.length; i++) {
    if (signal?.aborted) {
      auditLog.push({
        timestamp: new Date().toISOString(),
        filename: finalFilename,
        format: 'json',
        filters,
        rowCount: i,
        status: 'cancelled',
      });
      throw new ExportError('Export cancelled by user.', 'EXPORT_CANCELLED', true);
    }

    output.push(selectFields(filtered[i], filters));
    if (onProgress) onProgress(i + 1, filtered.length);

    if ((i + 1) % 50 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  triggerDownload(JSON.stringify(output, null, 2), finalFilename, 'application/json');

  auditLog.push({
    timestamp: new Date().toISOString(),
    filename: finalFilename,
    format: 'json',
    filters,
    rowCount: filtered.length,
    status: 'completed',
  });
}
