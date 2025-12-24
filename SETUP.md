# PostDraft Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your API keys and Gmail OAuth credentials

3. **Initialize database:**
   ```bash
   npm run db:push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Detailed Setup

### Environment Variables

Create `.env.local` with the following:

```env
# Claude API
CLAUDE_API_KEY=your_claude_api_key_here

# Gmail API OAuth
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback

# Database
DATABASE_URL="file:./prisma/dev.db"
```

### Gmail OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Gmail API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URI: `http://localhost:3000/api/auth/gmail/callback`
7. Copy Client ID and Client Secret to `.env.local`

### Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Copy to `.env.local` as `CLAUDE_API_KEY`

### Seed Newsletters (Optional)

Run the seed script to add default newsletters:

```bash
npm run seed
```

Or add them manually through the Settings page.

## First Run

1. Start the server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Go to **Settings**:
   - Add your Claude API key
   - Connect Gmail
   - Configure brand voice
   - Add newsletters to monitor
4. Go to **Dashboard** and click "Generate New Batch"

## Troubleshooting

### Database Issues
- Run `npm run db:push` to sync schema
- Delete `prisma/dev.db` and run `npm run db:push` to reset

### Gmail Connection Issues
- Verify OAuth credentials in Google Cloud Console
- Check redirect URI matches exactly
- Ensure Gmail API is enabled

### API Errors
- Verify Claude API key is valid
- Check API key has sufficient credits/quota
- Review console logs for detailed error messages

