import { NextResponse } from 'next/server';
import { scrapeSource } from '@/lib/scraper';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const items = await scrapeSource(params.id);
    
    return NextResponse.json({
      success: true,
      itemsScraped: items.length,
    });
  } catch (error) {
    console.error('Error scraping source:', error);
    return NextResponse.json({ error: 'Failed to scrape source' }, { status: 500 });
  }
}

