'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronDown, ChevronUp, ListTree, MessageSquare, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface GenerateConfig {
  totalPosts: number;
  threadCount: number;
  postCount: number;
  informativeCount: number;
  entertainingCount: number;
  engagingCount: number;
}

export function GenerateButton({ onGenerate }: { onGenerate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<GenerateConfig>({
    totalPosts: 5,
    threadCount: 2,
    postCount: 3,
    informativeCount: 2,
    entertainingCount: 1,
    engagingCount: 2,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setExpanded(false);
    try {
      // Build types and formats arrays based on counts
      const types: string[] = [];
      for (let i = 0; i < config.threadCount; i++) types.push('thread');
      for (let i = 0; i < config.postCount; i++) types.push('post');

      const formats: string[] = [];
      for (let i = 0; i < config.informativeCount; i++) formats.push('informative');
      for (let i = 0; i < config.entertainingCount; i++) formats.push('entertaining');
      for (let i = 0; i < config.engagingCount; i++) formats.push('engaging');

      await fetch('/api/generate-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: config.totalPosts,
          types: types.length > 0 ? types : ['post'],
          formats: formats.length > 0 ? formats : ['informative'],
        }),
      });
      onGenerate();
    } catch (error) {
      console.error('Error generating posts:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setExpanded(!expanded)}
        disabled={loading}
        className="flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Now
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </>
        )}
      </Button>

      {expanded && !loading && (
        <Card className="absolute right-0 top-full mt-2 p-4 w-80 z-50 shadow-lg border-border">
          <div className="space-y-4">
            {/* Total Posts */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Total Posts</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={config.totalPosts}
                onChange={(e) => setConfig({ ...config, totalPosts: parseInt(e.target.value) || 1 })}
                className="w-20"
              />
            </div>

            {/* Type Split */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Type Distribution</Label>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-purple-600" />
                  <Label className="text-xs">Threads</Label>
                  <Input
                    type="number"
                    min={0}
                    value={config.threadCount}
                    onChange={(e) => {
                      const threads = parseInt(e.target.value) || 0;
                      setConfig({ ...config, threadCount: threads, postCount: config.totalPosts - threads });
                    }}
                    className="w-14"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <Label className="text-xs">Posts</Label>
                  <Input
                    type="number"
                    min={0}
                    value={config.postCount}
                    onChange={(e) => {
                      const posts = parseInt(e.target.value) || 0;
                      setConfig({ ...config, postCount: posts, threadCount: config.totalPosts - posts });
                    }}
                    className="w-14"
                  />
                </div>
              </div>
            </div>

            {/* Format Distribution */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Format Distribution (ratio)</Label>
              {(() => {
                const total = config.informativeCount + config.entertainingCount + config.engagingCount;
                const pct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;
                return (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <Label className="text-xs">Informative</Label>
                        <span className="text-xs text-muted-foreground">({pct(config.informativeCount)}%)</span>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={config.informativeCount}
                        onChange={(e) => setConfig({ ...config, informativeCount: parseInt(e.target.value) || 0 })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                        <Label className="text-xs">Entertaining</Label>
                        <span className="text-xs text-muted-foreground">({pct(config.entertainingCount)}%)</span>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={config.entertainingCount}
                        onChange={(e) => setConfig({ ...config, entertainingCount: parseInt(e.target.value) || 0 })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <Label className="text-xs">Engaging</Label>
                        <span className="text-xs text-muted-foreground">({pct(config.engagingCount)}%)</span>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={config.engagingCount}
                        onChange={(e) => setConfig({ ...config, engagingCount: parseInt(e.target.value) || 0 })}
                        className="w-full"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            <Button onClick={handleGenerate} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate {config.totalPosts} Posts
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
