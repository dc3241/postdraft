# PostDraft - AI Tweet Generation App

PostDraft automatically generates X (Twitter) posts daily based on content from email newsletters and presents them in a clean dashboard for review and posting.

## Features

- 🔗 **Gmail Integration**: Connect your Gmail to monitor newsletters
- 🤖 **AI-Powered**: Uses Claude AI to extract topics and generate posts
- ⚙️ **Customizable**: Configure brand voice, tone, length, and style
- 📅 **Auto-Generation**: Schedule automatic post generation
- 📚 **Post Library**: View and manage all generated posts

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required variables:
- `CLAUDE_API_KEY`: Your Anthropic Claude API key
- `GMAIL_CLIENT_ID`: Gmail OAuth client ID (from Google Cloud Console)
- `GMAIL_CLIENT_SECRET`: Gmail OAuth client secret
- `GMAIL_REDIRECT_URI`: Should be `http://localhost:3000/api/auth/gmail/callback`

### 3. Set Up Gmail OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3000/api/auth/gmail/callback` to authorized redirect URIs
6. Copy Client ID and Client Secret to `.env.local`

### 4. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Seed Initial Newsletters (Optional)

You can add newsletters through the Settings page, or run this script:

```typescript
// In a script or directly in settings
await prisma.newsletter.createMany({
  data: [
    { senderEmail: 'newsletter@whattheai.com', senderName: 'WhatTheAI' },
    { senderEmail: 'newsletter@unwindai.com', senderName: 'Unwind AI' },
    { senderEmail: 'newsletter@8020ai.com', senderName: '8020 AI' },
    { senderEmail: 'newsletter@therundown.ai', senderName: 'The Rundown AI' },
  ],
});
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Configure Settings**: Go to Settings page and:
   - Add your Claude API key
   - Connect your Gmail account
   - Configure brand voice preferences
   - Add newsletters to monitor

2. **Generate Posts**: 
   - Click "Generate New Batch" on the Dashboard
   - Or enable auto-generation in Settings

3. **Review & Post**:
   - Review generated posts on the Dashboard
   - Copy posts to clipboard
   - Mark as posted when you've shared them
   - Archive posts you don't want to use

## Project Structure

```
/postdraft
  /app
    /api          # API routes
    /dashboard    # Dashboard page
    /settings     # Settings page
    /library      # Post library page
  /components     # React components
  /lib            # Utility functions
  /prisma         # Database schema
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: SQLite with Prisma ORM
- **APIs**: Claude API (Anthropic), Gmail API
- **Scheduling**: node-cron for automated daily generation
- **Authentication**: Gmail OAuth 2.0

## Notes

- Gmail API setup requires OAuth credentials from Google Cloud Console
- Newsletter sender emails may need to be adjusted based on actual sender addresses
- Posts are limited to 280 characters (X/Twitter limit)
- Auto-generation runs at the specified time daily
- **Scheduler Note**: The node-cron scheduler works best in a traditional Node.js server environment. For serverless deployments (Vercel, etc.), consider using:
  - Vercel Cron Jobs (for Vercel deployments)
  - A separate worker process
  - External cron service (e.g., cron-job.org) that calls your API endpoint

