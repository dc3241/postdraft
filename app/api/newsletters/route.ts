import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const newsletters = await prisma.newsletter.findMany({
      orderBy: { senderName: 'asc' },
    });
    return NextResponse.json(newsletters);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch newsletters' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderEmail, senderName } = body;

    const newsletter = await prisma.newsletter.create({
      data: {
        senderEmail,
        senderName,
      },
    });

    return NextResponse.json(newsletter);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create newsletter' }, { status: 500 });
  }
}

