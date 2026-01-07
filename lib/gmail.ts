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

async function refreshAccessToken(): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  
  if (!settings?.gmailRefreshToken) {
    throw new Error('Gmail refresh token not available. Please reconnect Gmail.');
  }

  oauth2Client.setCredentials({
    refresh_token: settings.gmailRefreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const newAccessToken = credentials.access_token;
    
    if (!newAccessToken) {
      throw new Error('Failed to refresh access token');
    }

    // Save the new access token
    await prisma.settings.update({
      where: { id: 1 },
      data: { gmailAccessToken: newAccessToken },
    });

    return newAccessToken;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Gmail token expired. Please reconnect Gmail.');
  }
}

export async function getNewsletterEmails() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  
  if (!settings?.gmailAccessToken) {
    throw new Error('Gmail not connected');
  }

  let accessToken = settings.gmailAccessToken;

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: settings.gmailRefreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const newsletters = await prisma.newsletter.findMany({ where: { enabled: true } });
  
  const emails: Array<{ source: string; content: string }> = [];
  
  for (const newsletter of newsletters) {
    try {
      // Search for emails from this sender in last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const query = `from:${newsletter.senderEmail} after:${oneDayAgo}`;
      
      let response;
      try {
        response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
        });
      } catch (error: any) {
        // If token expired, refresh and retry
        if (error.code === 401) {
          console.log('Access token expired, refreshing...');
          accessToken = await refreshAccessToken();
          oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: settings.gmailRefreshToken,
          });
          
          response = await gmail.users.messages.list({
            userId: 'me',
            q: query,
          });
        } else {
          throw error;
        }
      }

      if (response.data.messages) {
        for (const message of response.data.messages) {
          try {
            const msg = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'full',
            });

            // Extract email body with improved HTML parsing
            const body = getEmailBody(msg.data);
            
            if (body) {
              emails.push({
                source: newsletter.senderName,
                content: body,
              });
            }
          } catch (error) {
            console.error(`Error fetching message ${message.id}:`, error);
            // Continue with next message
          }
        }
      }

      // Update last checked
      await prisma.newsletter.update({
        where: { id: newsletter.id },
        data: { lastChecked: new Date() },
      });
    } catch (error) {
      console.error(`Error processing newsletter ${newsletter.senderName}:`, error);
      // Continue with next newsletter
    }
  }

  return emails;
}

function getEmailBody(message: any): string {
  // Extract plain text from email (handle HTML/multipart)
  const parts = message.payload?.parts || [message.payload];
  
  let plainText = '';
  let htmlText = '';
  
  // Recursively extract parts
  function extractParts(partList: any[]) {
    for (const part of partList) {
      if (part.parts) {
        extractParts(part.parts);
      }
      
      if (part.mimeType === 'text/plain' && part.body?.data) {
        plainText = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        htmlText = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }
  
  extractParts(parts);
  
  // Prefer plain text, but if not available, extract text from HTML
  if (plainText) {
    return plainText.trim();
  }
  
  if (htmlText) {
    return extractTextFromHTML(htmlText);
  }
  
  // Fallback: check if body data exists directly
  if (message.payload?.body?.data) {
    const text = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    if (message.payload.mimeType === 'text/plain') {
      return text.trim();
    }
    if (message.payload.mimeType === 'text/html') {
      return extractTextFromHTML(text);
    }
  }
  
  return '';
}

function extractTextFromHTML(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Convert common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  
  // Decode any remaining entities
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  text = text.replace(/&#x([a-f\d]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return text.trim();
}

