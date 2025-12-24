import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    const updateData: any = { status };
    if (status === 'posted') {
      updateData.postedAt = new Date();
    }

    const post = await prisma.post.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(post);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

