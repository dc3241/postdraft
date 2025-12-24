import { google } from 'googleapis';
import { prisma } from './db';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

export async function getAuthUrl() {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  });
  return url;
}

export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getNewsletterEmails() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  
  if (!settings?.gmailAccessToken) {
    throw new Error('Gmail not connected');
  }

  oauth2Client.setCredentials({
    access_token: settings.gmailAccessToken,
    refresh_token: settings.gmailRefreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const newsletters = await prisma.newsletter.findMany({ where: { enabled: true } });
  
  const emails: Array<{ source: string; content: string }> = [];
  
  for (const newsletter of newsletters) {
    // Search for emails from this sender in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const query = `from:${newsletter.senderEmail} after:${oneDayAgo}`;
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
    });

    if (response.data.messages) {
      for (const message of response.data.messages) {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });

        // Extract email body (simplified - you'll need to handle HTML/multipart)
        const body = getEmailBody(msg.data);
        
        emails.push({
          source: newsletter.senderName,
          content: body,
        });
      }
    }

    // Update last checked
    await prisma.newsletter.update({
      where: { id: newsletter.id },
      data: { lastChecked: new Date() },
    });
  }

  return emails;
}

function getEmailBody(message: any): string {
  // Extract plain text from email (handle HTML/multipart)
  const parts = message.payload?.parts || [message.payload];
  
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part.mimeType === 'text/html' && part.body?.data) {
      // Fallback to HTML if plain text not available
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
  }
  
  return '';
}

