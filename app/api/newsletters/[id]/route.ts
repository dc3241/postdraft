import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const newsletter = await prisma.newsletter.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json(newsletter);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update newsletter' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.newsletter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete newsletter' }, { status: 500 });
  }
}

