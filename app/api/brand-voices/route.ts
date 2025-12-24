import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const voices = await prisma.brandVoice.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(voices);
  } catch (error) {
    console.error('Error fetching brand voices:', error);
    return NextResponse.json({ error: 'Failed to fetch brand voices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.brandVoice.updateMany({
        data: { isDefault: false },
      });
    }
    
    const voice = await prisma.brandVoice.create({
      data: {
        name: data.name,
        tone: data.tone || 'professional',
        sampleTweets: JSON.stringify(data.sampleTweets || []),
        isDefault: data.isDefault ?? false,
      },
    });
    
    return NextResponse.json(voice);
  } catch (error) {
    console.error('Error creating brand voice:', error);
    return NextResponse.json({ error: 'Failed to create brand voice' }, { status: 500 });
  }
}

