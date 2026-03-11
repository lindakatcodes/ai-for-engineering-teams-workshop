'use client';

/**
 * Application-level React error boundary.
 *
 * Catches unhandled errors from any child component tree, renders a full-page
 * fallback with a retry button, and logs the error event. Retries up to 3
 * times with exponential back-off before showing a permanent error state.
 *
 * Stack traces are shown only in development builds.
 */

import React from 'react';

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
}

interface DashboardErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

const MAX_RETRIES = 3;
const IS_DEV = process.env.NODE_ENV === 'development';

export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, isRetrying: false };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<DashboardErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Production-safe logging: no stack traces or internal paths exposed to users
    if (IS_DEV) {
      console.error('[DashboardErrorBoundary] Caught error:', error, errorInfo);
    } else {
      console.error('[DashboardErrorBoundary] An unexpected error occurred.', {
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

    if (!hasError) {
      return this.props.children;
    }

    const isPermanent = retryCount >= MAX_RETRIES;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-screen bg-gray-50 flex items-center justify-center p-6"
      >
        <div className="bg-white rounded-xl border border-red-200 shadow-lg p-8 max-w-lg w-full text-center space-y-4">
          {/* Icon */}
          <div
            className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-gray-900">
            {isPermanent ? 'Dashboard Unavailable' : 'Something Went Wrong'}
          </h1>

          <p className="text-sm text-gray-600">
            {isPermanent
              ? 'The dashboard encountered a critical error and could not recover. Please refresh the page.'
              : 'An unexpected error occurred. You can retry or refresh the page to continue.'}
          </p>

          {/* Developer detail — development only */}
          {IS_DEV && error && (
            <details className="text-left mt-2">
              <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
                Error details (development only)
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs text-red-700 max-h-40">
                {error.stack ?? error.message}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {!isPermanent && (
              <button
                type="button"
                onClick={this.handleRetry}
                disabled={isRetrying}
                aria-label={
                  isRetrying
                    ? 'Retrying…'
                    : `Retry dashboard (attempt ${retryCount + 1} of ${MAX_RETRIES})`
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
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
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Retrying…
                  </>
                ) : (
                  `Retry (${retryCount + 1}/${MAX_RETRIES})`
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
            >
              Refresh Page
            </button>
          </div>

          {retryCount > 0 && !isPermanent && (
            <p className="text-xs text-gray-400">
              Retry attempt {retryCount} of {MAX_RETRIES}
            </p>
          )}
        </div>
      </div>
    );
  }
}

export default DashboardErrorBoundary;
