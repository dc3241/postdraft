# Content Idea Scorer

AI-powered platform for discovering trending topics and generating social media posts.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `env.template.txt` to `.env.local` and fill in your API keys

3. Set up Supabase:
   - Create a new Supabase project
   - Run the database migrations (we'll create these next)
   - Copy the URL and anon key to `.env.local`

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Next.js 14 (App Router)
- Supabase (PostgreSQL + Auth)
- Tailwind CSS + Shadcn/UI
- Claude API (Anthropic)
- TypeScript
