import { NextResponse } from 'next/server';
import { generatePosts } from '@/lib/scheduler';
import { prisma } from '@/lib/db';
import { generatePost } from '@/lib/claude';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { count, formats, types, brandVoiceId, useScrapedContent } = body;

    // If specific options provided, use custom generation
    if (brandVoiceId || formats || types) {
      const settings = await prisma.settings.findFirst();
      const brandVoice = brandVoiceId
        ? await prisma.brandVoice.findUnique({ where: { id: brandVoiceId } })
        : await prisma.brandVoice.findFirst({ where: { isDefault: true } });

      const selectedFormats = formats || ['informative', 'entertaining', 'engaging'];
      const selectedTypes = types || ['post', 'thread'];
      const postsToGenerate = count || 5;

      // Get content sources
      let topics: Array<{ topic: string; source: string; content?: string }> = [];

      if (useScrapedContent !== false) {
        const scrapedContent = await prisma.scrapedContent.findMany({
          where: { used: false },
          take: postsToGenerate,
          orderBy: { scrapedAt: 'desc' },
        });

        for (const content of scrapedContent) {
          const source = await prisma.contentSource.findUnique({
            where: { id: content.sourceId },
          });
          topics.push({
            topic: content.title,
            source: source?.name || 'Web',
            content: content.content,
          });
        }
      }

      // Generate posts
      for (const { topic, source, content } of topics.slice(0, postsToGenerate)) {
        const format = selectedFormats[Math.floor(Math.random() * selectedFormats.length)];
        const type = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];

        const postText = await generatePost(topic, source, {
          format,
          type,
          brandVoice,
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
            type,
            brandVoiceId: brandVoice?.id,
            feedback: 'pending',
          },
        });
      }

      // Mark scraped content as used
      if (topics.length > 0) {
        const scrapedContent = await prisma.scrapedContent.findMany({
          where: { used: false },
          take: topics.length,
        });
        await prisma.scrapedContent.updateMany({
          where: { id: { in: scrapedContent.map(c => c.id) } },
          data: { used: true },
        });
      }

      return NextResponse.json({ success: true, generated: topics.length });
    }

    // Default behavior - use scheduler's generatePosts
    await generatePosts(count || 5);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error generating posts:', error);
    return NextResponse.json({ error: 'Failed to generate posts' }, { status: 500 });
  }
}
