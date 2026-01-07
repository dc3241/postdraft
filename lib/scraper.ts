import puppeteer from 'puppeteer';
import { prisma } from './db';

interface ScrapedItem {
  title: string;
  content: string;
  url: string;
}

export async function scrapeSource(sourceId: string): Promise<ScrapedItem[]> {
  const source = await prisma.contentSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error('Source not found');
  }

  let items: ScrapedItem[] = [];

  switch (source.type) {
    case 'reddit':
      items = await scrapeReddit(source.url);
      break;
    case 'website':
      items = await scrapeWebsite(source.url);
      break;
    case 'rss':
      items = await scrapeRSS(source.url);
      break;
    default:
      items = await scrapeWebsite(source.url);
  }

  // Save scraped content to database (skip duplicates)
  let savedCount = 0;
  for (const item of items) {
    // Check if this URL was already scraped for this source
    const existing = await prisma.scrapedContent.findFirst({
      where: {
        sourceId: source.id,
        url: item.url,
      },
    });

    if (!existing) {
      await prisma.scrapedContent.create({
        data: {
          sourceId: source.id,
          title: item.title,
          content: item.content,
          url: item.url,
        },
      });
      savedCount++;
    }
  }

  console.log(`Scraped ${items.length} items, saved ${savedCount} new items (${items.length - savedCount} duplicates skipped)`);

  // Update last scraped time
  await prisma.contentSource.update({
    where: { id: sourceId },
    data: { lastScraped: new Date() },
  });

  return items;
}

async function scrapeReddit(url: string): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  
  // Convert to JSON endpoint
  const jsonUrl = url.endsWith('.json') ? url : `${url.replace(/\/$/, '')}.json`;
  
  try {
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'PostDraft/1.0',
      },
    });
    
    const data = await response.json();
    const posts = data.data?.children || [];
    
    for (const post of posts.slice(0, 20)) {
      const postData = post.data;
      if (postData.stickied) continue;
      
      items.push({
        title: postData.title || '',
        content: postData.selftext || postData.title || '',
        url: `https://reddit.com${postData.permalink}`,
      });
    }
  } catch (error) {
    console.error('Reddit scrape error:', error);
  }
  
  return items;
}

async function scrapeWebsite(url: string): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract article/post content
    const content = await page.evaluate(() => {
      const items: { title: string; content: string; url: string }[] = [];
      
      // Try common article selectors
      const selectors = [
        'article',
        '[class*="post"]',
        '[class*="article"]',
        '[class*="entry"]',
        '.content-item',
        'main section',
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((el) => {
            const titleEl = el.querySelector('h1, h2, h3, [class*="title"]');
            const contentEl = el.querySelector('p, [class*="excerpt"], [class*="summary"]');
            const linkEl = el.querySelector('a');
            
            if (titleEl) {
              items.push({
                title: titleEl.textContent?.trim() || '',
                content: contentEl?.textContent?.trim() || titleEl.textContent?.trim() || '',
                url: linkEl?.href || window.location.href,
              });
            }
          });
          if (items.length > 0) break;
        }
      }
      
      // Fallback: get page title and main content
      if (items.length === 0) {
        const title = document.querySelector('h1')?.textContent?.trim() || document.title;
        const paragraphs = Array.from(document.querySelectorAll('p'))
          .map(p => p.textContent?.trim())
          .filter(t => t && t.length > 50)
          .slice(0, 3)
          .join(' ');
        
        if (title || paragraphs) {
          items.push({
            title,
            content: paragraphs || title,
            url: window.location.href,
          });
        }
      }
      
      return items.slice(0, 15);
    });
    
    items.push(...content);
  } catch (error) {
    console.error('Website scrape error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return items;
}

async function scrapeRSS(url: string): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // Simple XML parsing for RSS
    const itemMatches = text.match(/<item[\s\S]*?<\/item>/gi) || [];
    
    for (const itemXml of itemMatches.slice(0, 20)) {
      const title = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] || '';
      const description = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] || '';
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '';
      
      if (title) {
        items.push({
          title: title.trim(),
          content: description.replace(/<[^>]*>/g, '').trim() || title.trim(),
          url: link.trim(),
        });
      }
    }
  } catch (error) {
    console.error('RSS scrape error:', error);
  }
  
  return items;
}

export async function scrapeAllDueSources(): Promise<void> {
  const now = new Date();
  
  const sources = await prisma.contentSource.findMany({
    where: { enabled: true },
  });
  
  for (const source of sources) {
    const shouldScrape = shouldScrapeSource(source, now);
    
    if (shouldScrape) {
      try {
        await scrapeSource(source.id);
        console.log(`Scraped source: ${source.name}`);
      } catch (error) {
        console.error(`Failed to scrape ${source.name}:`, error);
      }
    }
  }
}

function shouldScrapeSource(source: any, now: Date): boolean {
  if (!source.lastScraped) return true;
  
  const lastScraped = new Date(source.lastScraped);
  const hoursSinceLastScrape = (now.getTime() - lastScraped.getTime()) / (1000 * 60 * 60);
  
  switch (source.scrapeFreq) {
    case 'daily':
      return hoursSinceLastScrape >= 24;
    case 'weekly':
      return hoursSinceLastScrape >= 168;
    case 'monthly':
      return hoursSinceLastScrape >= 720;
    default:
      return hoursSinceLastScrape >= 24;
  }
}

