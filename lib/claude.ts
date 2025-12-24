import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './db';

interface GeneratePostOptions {
  format?: 'informative' | 'entertaining' | 'engaging';
  type?: 'thread' | 'post';
  brandVoice?: {
    id: string;
    name: string;
    tone: string;
    sampleTweets: string;
    analyzedStyle: string;
  } | null;
  niche?: string;
  additionalContent?: string;
}

export async function extractTopicsFromNewsletter(content: string, source: string): Promise<string[]> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  
  const anthropic = new Anthropic({
    apiKey: settings?.claudeApiKey || process.env.CLAUDE_API_KEY || '',
  });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract 2-3 key topics or insights from this newsletter that would make good X (Twitter) posts. Return ONLY the topics as a numbered list, no other text.

Newsletter content:
${content.substring(0, 4000)}` // Limit content length
    }],
  });

  const topicsText = message.content[0].type === 'text' ? message.content[0].text : '';
  const topics = topicsText.split('\n').filter(t => t.trim()).map(t => t.replace(/^\d+\.\s*/, ''));
  
  return topics.slice(0, 3);
}

export async function generatePost(
  topic: string,
  source: string,
  options: GeneratePostOptions = {}
): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  
  const anthropic = new Anthropic({
    apiKey: settings?.claudeApiKey || process.env.CLAUDE_API_KEY || '',
  });

  const lengthGuidelines: Record<string, string> = {
    short: 'under 100 characters',
    medium: '100-200 characters',
    long: '200-280 characters',
  };

  const ctaGuidelines: Record<string, string> = {
    question: 'End with an engaging question',
    link: 'Include a placeholder [LINK] for sharing',
    cta: 'Include a clear call-to-action',
    none: 'No specific CTA needed',
  };

  const formatGuidelines: Record<string, string> = {
    informative: 'Educational and fact-based. Share knowledge, tips, or insights that provide value.',
    entertaining: 'Fun, witty, or humorous. Make people smile or laugh while still being relevant.',
    engaging: 'Thought-provoking and conversation-starting. Encourage replies and discussion.',
  };

  // Build brand voice context
  let brandVoiceContext = '';
  if (options.brandVoice) {
    const sampleTweets = JSON.parse(options.brandVoice.sampleTweets || '[]');
    brandVoiceContext = `
Brand Voice: "${options.brandVoice.name}"
Base Tone: ${options.brandVoice.tone}
${options.brandVoice.analyzedStyle ? `Style Analysis: ${options.brandVoice.analyzedStyle}` : ''}
${sampleTweets.length > 0 ? `Sample tweets in this voice:\n${sampleTweets.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}` : ''}
`;
  } else {
    brandVoiceContext = `
Tone: ${settings?.brandVoiceTone || 'professional'}
${settings?.brandVoiceExamples ? `Example posts in my voice:\n${settings.brandVoiceExamples}` : ''}
`;
  }

  // Build niche context
  const nicheContext = options.niche || settings?.niche
    ? `\nNiche/Topic Focus: ${options.niche || settings?.niche}`
    : '';

  // Build additional context from scraped content
  const additionalContext = options.additionalContent
    ? `\nAdditional context:\n${options.additionalContent.substring(0, 1000)}`
    : '';

  const format = options.format || 'informative';
  const postType = options.type || 'post';

  const typeGuidelines: Record<string, string> = {
    post: 'Write ONE single post. Keep it under 280 characters.',
    thread: 'Write a thread of 3-5 connected posts. Each post should be under 280 characters. Separate posts with "---". The first post should hook the reader, middle posts expand on the idea, and the final post should conclude or have a CTA.',
  };

  const prompt = `Generate an X (Twitter) ${postType} about this topic: "${topic}"

Type: ${postType.toUpperCase()}
${typeGuidelines[postType]}

Format: ${format.toUpperCase()}
${formatGuidelines[format]}
${nicheContext}
${brandVoiceContext}

Post guidelines:
- Length per post: ${lengthGuidelines[settings?.postLength as string] || lengthGuidelines.medium}
- ${settings?.includeEmojis ? 'Include 1-2 relevant emojis' : 'No emojis'}
- ${settings?.useHashtags ? 'Include 1-2 relevant hashtags' : 'No hashtags'}
- ${ctaGuidelines[settings?.ctaStyle as string] || ctaGuidelines.none}
${additionalContext}

${postType === 'thread' ? 'Write the thread posts separated by "---". No explanations.' : 'Write ONE post, no explanation.'} Match the brand voice closely.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}

export async function generatePostsFromScrapedContent(
  count: number = 5,
  formats: ('informative' | 'entertaining' | 'engaging')[] = ['informative', 'entertaining', 'engaging']
): Promise<void> {
  const settings = await prisma.settings.findFirst();
  const defaultVoice = await prisma.brandVoice.findFirst({
    where: { isDefault: true },
  });

  // Get unused scraped content
  const scrapedContent = await prisma.scrapedContent.findMany({
    where: { used: false },
    take: count,
    orderBy: { scrapedAt: 'desc' },
  });

  for (const content of scrapedContent) {
    const source = await prisma.contentSource.findUnique({
      where: { id: content.sourceId },
    });

    // Pick a random format
    const format = formats[Math.floor(Math.random() * formats.length)];

    const postText = await generatePost(content.title, source?.name || 'Web', {
      format,
      brandVoice: defaultVoice,
      niche: settings?.niche,
      additionalContent: content.content,
    });

    await prisma.post.create({
      data: {
        text: postText,
        topic: content.title,
        source: source?.name || 'Web',
        status: 'unposted',
        format,
        brandVoiceId: defaultVoice?.id,
        feedback: 'pending',
      },
    });

    // Mark content as used
    await prisma.scrapedContent.update({
      where: { id: content.id },
      data: { used: true },
    });
  }
}
