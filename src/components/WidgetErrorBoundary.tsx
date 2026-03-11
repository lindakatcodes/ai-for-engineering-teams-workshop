'use client';

/**
 * Widget-level React error boundary.
 *
 * Wraps an individual dashboard widget. On failure, renders a contained error
 * card so all other widgets remain functional (graceful degradation). Retries
 * up to 3 times with exponential back-off before showing the permanent state.
 *
 * Stack traces are shown only in development builds.
 */

import React from 'react';

export interface WidgetErrorBoundaryProps {
  widgetName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

const MAX_RETRIES = 3;
const IS_DEV = process.env.NODE_ENV === 'development';

export class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, isRetrying: false };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<WidgetErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (IS_DEV) {
      console.error(`[WidgetErrorBoundary: ${this.props.widgetName}] Caught error:`, error, errorInfo);
    } else {
      console.error(`[WidgetErrorBoundary: ${this.props.widgetName}] An error occurred.`, {
        name: error.name,
        message: error.message,
      });
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry(): void {
    const { retryCount } = this.state;
    if (retryCount >= MAX_RETRIES) return;

    const backoffMs = Math.pow(2, retryCount) * 500; // 500 ms, 1 s, 2 s
    this.setState({ isRetrying: true });

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        retryCount: retryCount + 1,
        isRetrying: false,
      });
    }, backoffMs);
  }

  render(): React.ReactNode {
    const { hasError, error, retryCount, isRetrying } = this.state;
    const { widgetName, children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Use caller-supplied fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    const isPermanent = retryCount >= MAX_RETRIES;

    return (
      <div
        role="alert"
        aria-live="polite"
        aria-label={`Error in ${widgetName} widget`}
        className="rounded-lg border border-red-200 bg-red-50 p-4 flex flex-col gap-3"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span
            className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-red-100 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="h-3 w-3 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">
              {widgetName} — Widget Error
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {isPermanent
                ? 'This widget failed to load after multiple attempts.'
                : 'This widget encountered an error. Other widgets are unaffected.'}
            </p>

            {/* Developer detail — development only */}
            {IS_DEV && error && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-red-500 hover:text-red-700">
                  Error details (dev only)
                </summary>
                <pre className="mt-1 overflow-auto rounded bg-red-100 p-2 text-xs text-red-700 max-h-32">
                  {error.stack ?? error.message}
                </pre>
              </details>
            )}
          </div>
        </div>

        {!isPermanent && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              disabled={isRetrying}
              aria-label={
                isRetrying
                  ? `Retrying ${widgetName}…`
                  : `Retry ${widgetName} widget (attempt ${retryCount + 1} of ${MAX_RETRIES})`
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isRetrying ? (
                <>
                  <svg
                    className="animate-spin h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Retrying…
                </>
              ) : (
                `Retry (${retryCount + 1}/${MAX_RETRIES})`
              )}
            </button>

            {retryCount > 0 && (
              <span className="text-xs text-red-500" aria-live="polite">
                Attempt {retryCount} of {MAX_RETRIES} failed
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default WidgetErrorBoundary;
