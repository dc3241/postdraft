import { startScheduler } from '@/lib/scheduler';
import { NextResponse } from 'next/server';

// Initialize scheduler
startScheduler();

export async function GET() {
  return NextResponse.json({ message: 'Scheduler initialized' });
}

