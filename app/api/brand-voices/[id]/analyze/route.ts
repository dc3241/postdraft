import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const voice = await prisma.brandVoice.findUnique({
      where: { id: params.id },
    });
    
    if (!voice) {
      return NextResponse.json({ error: 'Brand voice not found' }, { status: 404 });
    }
    
    const settings = await prisma.settings.findFirst();
    if (!settings?.claudeApiKey) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 400 });
    }
    
    const sampleTweets = JSON.parse(voice.sampleTweets || '[]');
    
    if (sampleTweets.length < 3) {
      return NextResponse.json({ error: 'Need at least 3 sample tweets to analyze' }, { status: 400 });
    }
    
    const anthropic = new Anthropic({ apiKey: settings.claudeApiKey });
    
    const prompt = `Analyze these sample tweets and describe the writing style, tone, and patterns in 2-3 sentences. Focus on:
- Sentence structure and length
- Vocabulary and word choice
- Use of emojis, hashtags, punctuation
- Overall personality and voice

Sample tweets:
${sampleTweets.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}

Provide a concise style description that can be used to generate similar content:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const analyzedStyle = (response.content[0] as any).text || '';
    
    // Update the brand voice with analyzed style
    const updatedVoice = await prisma.brandVoice.update({
      where: { id: params.id },
      data: { analyzedStyle },
    });
    
    return NextResponse.json(updatedVoice);
  } catch (error) {
    console.error('Error analyzing brand voice:', error);
    return NextResponse.json({ error: 'Failed to analyze brand voice' }, { status: 500 });
  }
}

