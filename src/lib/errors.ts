/**
 * Shared error classes for the Customer Intelligence Dashboard.
 * Each error carries a machine-readable code, a context payload, and a
 * recoverable flag that controls whether the error boundary should offer a
 * retry option.
 */

export class DashboardError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DashboardError';
    // Maintains proper prototype chain in ES5 transpiled output
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class WidgetError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'WidgetError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ExportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ExportError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
