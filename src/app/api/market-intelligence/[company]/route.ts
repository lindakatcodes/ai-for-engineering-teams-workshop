import { NextRequest, NextResponse } from 'next/server';
import {
  MarketIntelligenceService,
  MarketIntelligenceError,
} from '@/lib/MarketIntelligenceService';

const COMPANY_PATTERN = /^[a-zA-Z0-9 .,&'-]{1,100}$/;
const service = new MarketIntelligenceService();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ company: string }> }
) {
  const { company } = await params;

  if (!company || !COMPANY_PATTERN.test(company)) {
    return NextResponse.json({ error: 'Invalid company name' }, { status: 400 });
  }

  // Simulate realistic API delay 300–800 ms
  const delay = 300 + Math.floor(Math.random() * 500);
  await new Promise((resolve) => setTimeout(resolve, delay));

  try {
    const data = await service.getMarketData(company);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof MarketIntelligenceError) {
      return NextResponse.json({ error: 'Invalid company name' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
