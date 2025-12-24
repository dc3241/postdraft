'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Archive, ThumbsUp, ThumbsDown, Lightbulb, Smile, MessageCircle, ListTree } from 'lucide-react';
import { useState } from 'react';

const formatIcons: Record<string, any> = {
  informative: Lightbulb,
  entertaining: Smile,
  engaging: MessageCircle,
};

const formatColors: Record<string, string> = {
  informative: 'bg-blue-50 text-blue-700',
  entertaining: 'bg-pink-50 text-pink-700',
  engaging: 'bg-green-50 text-green-700',
};

export function PostCard({ post, onUpdate }: any) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(post.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function markAsPosted() {
    await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'posted' }),
    });
    onUpdate();
  }

  async function archive() {
    await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });
    onUpdate();
  }

  async function submitFeedback(feedback: 'approved' | 'denied') {
    await fetch(`/api/posts/${post.id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    });
    onUpdate();
  }

  const charCount = post.text.length;
  const isOverLimit = charCount > 280;
  const FormatIcon = formatIcons[post.format] || Lightbulb;

  return (
    <Card className="p-4 border-border shadow-sm">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">{post.source}</Badge>
            {post.type === 'thread' && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                <ListTree className="w-3 h-3" />
                thread
              </span>
            )}
            {post.format && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${formatColors[post.format] || 'bg-muted'}`}>
                <FormatIcon className="w-3 h-3" />
                {post.format}
              </span>
            )}
            {post.feedback && post.feedback !== 'pending' && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                post.feedback === 'approved' 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {post.feedback}
              </span>
            )}
          </div>
          <span className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
            {charCount}/280
          </span>
        </div>
        
        <p className="text-base whitespace-pre-wrap leading-relaxed">{post.text}</p>
        
        <p className="text-sm text-muted-foreground">Topic: {post.topic}</p>
        
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex gap-2">
            <Button size="sm" onClick={copyToClipboard} variant="outline">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button size="sm" variant="outline" onClick={markAsPosted}>
              <Check className="w-4 h-4 mr-1" />
              Posted
            </Button>
            <Button size="sm" variant="outline" onClick={archive}>
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
          </div>
          
          {post.feedback === 'pending' && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => submitFeedback('approved')}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => submitFeedback('denied')}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
