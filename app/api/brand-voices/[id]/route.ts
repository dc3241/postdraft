import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const voice = await prisma.brandVoice.findUnique({
      where: { id: params.id },
    });
    
    if (!voice) {
      return NextResponse.json({ error: 'Brand voice not found' }, { status: 404 });
    }
    
    return NextResponse.json(voice);
  } catch (error) {
    console.error('Error fetching brand voice:', error);
    return NextResponse.json({ error: 'Failed to fetch brand voice' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // If setting as default, unset others
    if (data.isDefault) {
      await prisma.brandVoice.updateMany({
        where: { id: { not: params.id } },
        data: { isDefault: false },
      });
    }
    
    // Convert sampleTweets array to JSON string if provided
    if (data.sampleTweets && Array.isArray(data.sampleTweets)) {
      data.sampleTweets = JSON.stringify(data.sampleTweets);
    }
    
    const voice = await prisma.brandVoice.update({
      where: { id: params.id },
      data,
    });
    
    return NextResponse.json(voice);
  } catch (error) {
    console.error('Error updating brand voice:', error);
    return NextResponse.json({ error: 'Failed to update brand voice' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.brandVoice.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brand voice:', error);
    return NextResponse.json({ error: 'Failed to delete brand voice' }, { status: 500 });
  }
}

