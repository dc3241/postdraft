import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const sources = await prisma.contentSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const source = await prisma.contentSource.create({
      data: {
        url: data.url,
        name: data.name,
        type: data.type || 'website',
        scrapeFreq: data.scrapeFreq || 'daily',
        enabled: data.enabled ?? true,
      },
    });
    
    return NextResponse.json(source);
  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
  }
}

