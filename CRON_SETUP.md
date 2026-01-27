# Morning Scraping Cron Job Setup

This document explains how to set up the automatic morning scraping and post generation feature.

## Overview

The morning scraping system automatically:
1. Scrapes all active sources (custom links + newsletters) for all users
2. Filters out duplicate content and topics
3. Generates posts for users with `auto_generate_enabled` enabled
4. Runs daily at 6:00 AM (configurable)

## Features

### Duplicate Detection
- **Content Hash Checking**: Detects if the same content was scraped recently (last 7 days)
- **Topic Deduplication**: Filters out topics that are >80% similar to existing topics in the database
- **Early Exit**: Skips scraping if content is unchanged, saving API costs

### Automatic Processing
- Processes all users with active sources
- Scrapes custom sources and newsletter sources
- Generates posts for users with auto-generation enabled
- Handles errors gracefully (continues with next user if one fails)

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` (or production environment):

```bash
# Required for cron job authentication
CRON_SECRET=your-secret-token-here
```

Generate a secure random token:
```bash
# Using openssl
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Vercel Deployment

If deploying on Vercel, the `vercel.json` file is already configured:

```json
{
  "crons": [
    {
      "path": "/api/cron/morning-scrape",
      "schedule": "0 6 * * *"
    }
  ]
}
```

This schedules the job to run daily at 6:00 AM UTC.

**To deploy:**
1. Push your code to your repository
2. Vercel will automatically detect the cron configuration
3. The cron job will be active after deployment

### 3. Manual Testing

You can manually trigger the cron job for testing:

```bash
# Using curl
curl -X GET "https://your-domain.com/api/cron/morning-scrape" \
  -H "Authorization: Bearer your-cron-secret-here"

# Or using the POST method
curl -X POST "https://your-domain.com/api/cron/morning-scrape" \
  -H "Authorization: Bearer your-cron-secret-here"
```

### 4. Alternative Cron Services

If not using Vercel, you can use external cron services:

#### Option A: EasyCron / Cron-Job.org
1. Create an account
2. Add a new cron job
3. Set schedule: `0 6 * * *` (daily at 6 AM)
4. Set URL: `https://your-domain.com/api/cron/morning-scrape`
5. Add header: `Authorization: Bearer your-cron-secret-here`

#### Option B: GitHub Actions
Create `.github/workflows/morning-scrape.yml`:

```yaml
name: Morning Scrape
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Morning Scrape
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/morning-scrape" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Monitoring

### Check Logs

The cron job logs detailed information:
- Number of users processed
- Topics found per user
- Posts generated
- Errors encountered

Check your deployment logs (Vercel, Railway, etc.) to monitor execution.

### Response Format

The API returns:

```json
{
  "success": true,
  "timestamp": "2026-01-26T06:00:00.000Z",
  "totalUsers": 10,
  "successfulUsers": 9,
  "totalTopicsFound": 45,
  "totalPostsGenerated": 30,
  "results": [
    {
      "userId": "user-id",
      "customSourcesScraped": 2,
      "newsletterSourcesScraped": 1,
      "topicsFound": 5,
      "postsGenerated": 3,
      "errors": []
    }
  ],
  "errors": []
}
```

## Troubleshooting

### Issue: "Unauthorized" Error

**Solution**: Make sure `CRON_SECRET` is set in your environment variables and matches the Authorization header.

### Issue: Functions Fail with "No user session"

**Solution**: The scraping functions (`triggerScrape`, `processNewsletterEmails`) currently use `createClient()` which requires cookies. In cron context, there are no user cookies. 

**Workaround**: These functions should still work since they take `userId` as a parameter and query by userId. If you encounter issues, you may need to refactor these functions to accept an optional Supabase client parameter.

### Issue: Gmail OAuth Token Expired

**Solution**: Users need to reconnect their Gmail account. The system will skip newsletter scraping for users with expired tokens and continue with other sources.

### Issue: Rate Limiting

**Solution**: The system includes delays between users (1 second) and between sources. If you hit rate limits, increase the delays in `morning-scrape.ts`.

## Customization

### Change Schedule

Edit `vercel.json` to change the cron schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/morning-scrape",
      "schedule": "0 8 * * *"  // 8 AM instead of 6 AM
    }
  ]
}
```

Cron format: `minute hour day month day-of-week`
- `0 6 * * *` = Daily at 6:00 AM
- `0 */6 * * *` = Every 6 hours
- `0 9 * * 1-5` = Weekdays at 9:00 AM

### Adjust Duplicate Detection Threshold

Edit `src/lib/scraping/duplicate-detector.ts`:

```typescript
// Change similarity threshold (default: 0.8 = 80%)
const isDuplicate = await isDuplicateTopic(topic, userId, supabase, 0.9) // 90% similarity
```

## Security Notes

- **Never commit `CRON_SECRET` to version control**
- Use environment variables for all secrets
- The cron endpoint is protected by the secret token
- Vercel Cron automatically adds the `x-vercel-cron` header for additional security
