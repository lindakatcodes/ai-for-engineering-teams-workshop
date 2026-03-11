/**
 * /api/health — Load balancer health check endpoint.
 *
 * Returns { status: 'ok', uptime: number, version: string }.
 * In production, the version string is intentionally generic to avoid
 * exposing internal deployment details.
 */

import { NextResponse } from 'next/server';

const startTime = Date.now();

export function GET(): NextResponse {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const isProduction = process.env.NODE_ENV === 'production';

  return NextResponse.json(
    {
      status: 'ok',
      uptime: uptimeSeconds,
      // Expose version only in non-production to avoid leaking deployment info
      version: isProduction ? 'redacted' : (process.env.npm_package_version ?? 'dev'),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
