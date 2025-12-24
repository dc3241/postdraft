'use client';

import { useEffect, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { GenerateButton } from '@/components/GenerateButton';
import { FileText, Clock, CheckCircle2, Sparkles, ListTree, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Settings {
  autoGenEnabled: boolean;
  postsPerRun: number;
  threadCount: number;
  postCount: number;
  informativeCount: number;
  entertainingCount: number;
  engagingCount: number;
}

export default function Dashboard() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, posted: 0 });
  const [settings, setSettings] = useState<Settings>({
    autoGenEnabled: false,
    postsPerRun: 5,
    threadCount: 2,
    postCount: 3,
    informativeCount: 2,
    entertainingCount: 1,
    engagingCount: 2,
  });
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings({
        autoGenEnabled: data.autoGenEnabled ?? false,
        postsPerRun: data.postsPerRun ?? 5,
        threadCount: data.threadCount ?? 2,
        postCount: data.postCount ?? 3,
        informativeCount: data.informativeCount ?? 2,
        entertainingCount: data.entertainingCount ?? 1,
        engagingCount: data.engagingCount ?? 2,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }

  async function updateSettings(updates: Partial<Settings>) {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }

  async function fetchPosts() {
    try {
      const response = await fetch('/api/posts?status=unposted');
      const data = await response.json();
      setPosts(data);
      
      // Calculate stats
      const allResponse = await fetch('/api/posts');
      const allPosts = await allResponse.json();
      setStats({
        total: allPosts.length,
        pending: allPosts.filter((p: any) => p.status === 'unposted').length,
        posted: allPosts.filter((p: any) => p.status === 'posted').length,
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">{today}</p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <GenerateButton onGenerate={fetchPosts} />
        </div>
      </div>

      {/* Generation Controls */}
      <Card className="p-5 mb-8 border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.autoGenEnabled}
              onChange={(checked) => {
                updateSettings({ autoGenEnabled: checked });
                if (checked) setSettingsExpanded(true);
              }}
            />
            <Label className="font-medium">Daily Auto-Generation</Label>
          </div>
          {settings.autoGenEnabled && (
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
            >
              {settingsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {settingsExpanded ? 'Hide' : 'Show'} Settings
            </button>
          )}
        </div>

        {settings.autoGenEnabled && settingsExpanded && (
          <div className="mt-6 space-y-6 pt-4 border-t border-border">
            {/* Total Posts */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Total Posts Per Day</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={settings.postsPerRun}
                onChange={(e) => updateSettings({ postsPerRun: parseInt(e.target.value) || 1 })}
                className="w-24"
              />
            </div>

            {/* Type Split */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Type Distribution</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-purple-600" />
                  <Label className="text-sm">Threads</Label>
                  <Input
                    type="number"
                    min={0}
                    max={settings.postsPerRun}
                    value={settings.threadCount}
                    onChange={(e) => {
                      const threads = parseInt(e.target.value) || 0;
                      updateSettings({ threadCount: threads, postCount: settings.postsPerRun - threads });
                    }}
                    className="w-16"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <Label className="text-sm">Posts</Label>
                  <Input
                    type="number"
                    min={0}
                    max={settings.postsPerRun}
                    value={settings.postCount}
                    onChange={(e) => {
                      const posts = parseInt(e.target.value) || 0;
                      updateSettings({ postCount: posts, threadCount: settings.postsPerRun - posts });
                    }}
                    className="w-16"
                  />
                </div>
              </div>
            </div>

            {/* Format Distribution */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Format Distribution (ratio)</Label>
              <div className="flex gap-4 flex-wrap">
                {(() => {
                  const total = settings.informativeCount + settings.entertainingCount + settings.engagingCount;
                  const pct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <Label className="text-sm">Informative</Label>
                        <Input
                          type="number"
                          min={0}
                          value={settings.informativeCount}
                          onChange={(e) => updateSettings({ informativeCount: parseInt(e.target.value) || 0 })}
                          className="w-16"
                        />
                        <span className="text-xs text-muted-foreground">({pct(settings.informativeCount)}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                        <Label className="text-sm">Entertaining</Label>
                        <Input
                          type="number"
                          min={0}
                          value={settings.entertainingCount}
                          onChange={(e) => updateSettings({ entertainingCount: parseInt(e.target.value) || 0 })}
                          className="w-16"
                        />
                        <span className="text-xs text-muted-foreground">({pct(settings.entertainingCount)}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <Label className="text-sm">Engaging</Label>
                        <Input
                          type="number"
                          min={0}
                          value={settings.engagingCount}
                          onChange={(e) => updateSettings({ engagingCount: parseInt(e.target.value) || 0 })}
                          className="w-16"
                        />
                        <span className="text-xs text-muted-foreground">({pct(settings.engagingCount)}%)</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Posts</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.posted}</p>
              <p className="text-sm text-muted-foreground">Posted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Drafts */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-terracotta" />
        <h2 className="text-lg font-medium">Today's Drafts</h2>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-stone-400" />
          </div>
          <p className="text-muted-foreground mb-1">No drafts yet</p>
          <p className="text-sm text-muted-foreground">Click "Generate New Batch" to create posts from your newsletters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Threads Section */}
          {posts.filter((p: any) => p.type === 'thread').length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ListTree className="w-4 h-4 text-purple-600" />
                <h3 className="text-md font-medium">Threads</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {posts.filter((p: any) => p.type === 'thread').length}
                </span>
              </div>
              <div className="grid gap-4">
                {posts
                  .filter((p: any) => p.type === 'thread')
                  .map((post: any) => (
                    <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
                  ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {posts.filter((p: any) => p.type !== 'thread').length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <h3 className="text-md font-medium">Posts</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {posts.filter((p: any) => p.type !== 'thread').length}
                </span>
              </div>
              <div className="grid gap-4">
                {posts
                  .filter((p: any) => p.type !== 'thread')
                  .map((post: any) => (
                    <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
