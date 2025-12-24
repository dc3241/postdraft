import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/gmail';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect('/settings?error=no_code');
  }

  try {
    const tokens = await getTokensFromCode(code);
    
    await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        gmailAccessToken: tokens.access_token || '',
        gmailRefreshToken: tokens.refresh_token || '',
      },
      create: {
        gmailAccessToken: tokens.access_token || '',
        gmailRefreshToken: tokens.refresh_token || '',
      },
    });

    return NextResponse.redirect('/settings?success=gmail_connected');
  } catch (error) {
    console.error('Gmail auth error:', error);
    return NextResponse.redirect('/settings?error=auth_failed');
  }
}

