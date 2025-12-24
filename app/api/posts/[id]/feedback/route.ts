import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { feedback } = await request.json();
    
    if (!['approved', 'denied'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 });
    }
    
    const post = await prisma.post.update({
      where: { id: params.id },
      data: { feedback },
    });
    
    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating post feedback:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}

