import cron from 'node-cron';
import { prisma } from './db';
import { getNewsletterEmails } from './gmail';
import { extractTopicsFromNewsletter, generatePost } from './claude';
import { scrapeAllDueSources } from './scraper';

let schedulerStarted = false;

export function startScheduler() {
  // Prevent multiple scheduler instances
  if (schedulerStarted) {
    console.log('Scheduler already started');
    return;
  }

  // Run every minute to check if it's time to generate
  cron.schedule('* * * * *', async () => {
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      
      if (!settings?.autoGenEnabled) return;

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime === settings.autoGenTime) {
        await generatePosts(settings.postsPerRun);
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });

  // Run scraping check every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running scheduled scrape check...');
      await scrapeAllDueSources();
    } catch (error) {
      console.error('Scraping scheduler error:', error);
    }
  });

  schedulerStarted = true;
  console.log('Scheduler started');
}

export async function generatePosts(count: number = 5) {
  try {
    const allTopics: Array<{ topic: string; source: string; content?: string }> = [];
    
    // Get topics from newsletter emails
    try {
      const emails = await getNewsletterEmails();
      for (const email of emails) {
        try {
          const topics = await extractTopicsFromNewsletter(email.content, email.source);
          topics.forEach(topic => {
            allTopics.push({ topic, source: email.source });
          });
        } catch (error) {
          console.error(`Error extracting topics from newsletter ${email.source}:`, error);
          // Continue with other emails
        }
      }
    } catch (error: any) {
      // Handle Gmail connection errors gracefully
      if (error.message?.includes('Gmail not connected') || error.message?.includes('token')) {
        console.warn('Gmail not available or token expired. Skipping newsletter emails.');
      } else {
        console.error('Error fetching newsletter emails:', error);
      }
      // Continue with scraped content even if newsletters fail
    }

    // Get topics from scraped content
    const scrapedContent = await prisma.scrapedContent.findMany({
      where: { used: false },
      take: 20,
      orderBy: { scrapedAt: 'desc' },
    });

    for (const content of scrapedContent) {
      const source = await prisma.contentSource.findUnique({
        where: { id: content.sourceId },
      });
      
      allTopics.push({
        topic: content.title,
        source: source?.name || 'Web',
        content: content.content,
      });
    }

    if (allTopics.length === 0) {
      console.log('No topics found from newsletters or scraped content');
      return;
    }

    // Get settings and brand voice
    const settings = await prisma.settings.findFirst();
    const defaultVoice = await prisma.brandVoice.findFirst({
      where: { isDefault: true },
    });

    // Generate posts from topics (limit to requested count)
    const topicsToUse = allTopics.slice(0, count);
    const formats = ['informative', 'entertaining', 'engaging'];
    
    for (const { topic, source, content } of topicsToUse) {
      // Generate one post in each format for variety
      const format = formats[Math.floor(Math.random() * formats.length)];
      
      const postText = await generatePost(topic, source, {
        format,
        brandVoice: defaultVoice,
        niche: settings?.niche,
        additionalContent: content,
      });
      
      await prisma.post.create({
        data: {
          text: postText,
          topic,
          source,
          status: 'unposted',
          format,
          brandVoiceId: defaultVoice?.id,
          feedback: 'pending',
        },
      });
    }

    // Mark scraped content as used
    const usedContentIds = scrapedContent
      .slice(0, count)
      .map(c => c.id);
    
    if (usedContentIds.length > 0) {
      await prisma.scrapedContent.updateMany({
        where: { id: { in: usedContentIds } },
        data: { used: true },
      });
    }

    console.log(`Generated ${topicsToUse.length} posts`);
  } catch (error) {
    console.error('Error generating posts:', error);
  }
}
