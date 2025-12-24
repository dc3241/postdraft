'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Key, Clock, Target, Palette } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSettings(updates: any) {
    if (!settings) return;
    
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-8 w-full space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences and generation settings
        </p>
      </div>

      {/* API Keys */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
              <Key className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">API Configuration</CardTitle>
              <CardDescription>Manage your API credentials</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="claudeKey">Claude API Key</Label>
            <Input
              id="claudeKey"
              type="password"
              value={settings.claudeApiKey}
              onChange={(e) => updateSettings({ claudeApiKey: e.target.value })}
              placeholder="sk-ant-..."
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get your API key from the Anthropic Console
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Niche / Topic Focus */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-base">Content Focus</CardTitle>
              <CardDescription>Define your niche and topic areas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="niche">Your Niche</Label>
            <Textarea
              id="niche"
              placeholder="e.g., SaaS, AI/ML, Web Development, Productivity, Marketing..."
              value={settings.niche || ''}
              onChange={(e) => updateSettings({ niche: e.target.value })}
              className="mt-1.5"
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This helps the AI focus on relevant topics when generating content
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Post Style Preferences */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center">
              <Palette className="w-4 h-4 text-pink-600" />
            </div>
            <div>
              <CardTitle className="text-base">Post Style</CardTitle>
              <CardDescription>Customize how your posts are generated</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="length">Post Length</Label>
              <Select
                id="length"
                value={settings.postLength}
                onChange={(e) => updateSettings({ postLength: e.target.value })}
              >
                <option value="short">Short (under 100 chars)</option>
                <option value="medium">Medium (100-200 chars)</option>
                <option value="long">Long (200-280 chars)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="cta">Call-to-Action Style</Label>
              <Select
                id="cta"
                value={settings.ctaStyle}
                onChange={(e) => updateSettings({ ctaStyle: e.target.value })}
              >
                <option value="none">None</option>
                <option value="question">End with Question</option>
                <option value="link">Include Link Placeholder</option>
                <option value="cta">Clear CTA</option>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="emojis">Include Emojis</Label>
              <p className="text-xs text-muted-foreground">Add relevant emojis to posts</p>
            </div>
            <Switch
              id="emojis"
              checked={settings.includeEmojis}
              onChange={(checked) => updateSettings({ includeEmojis: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="hashtags">Use Hashtags</Label>
              <p className="text-xs text-muted-foreground">Include relevant hashtags</p>
            </div>
            <Switch
              id="hashtags"
              checked={settings.useHashtags}
              onChange={(checked) => updateSettings({ useHashtags: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto-Generation */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Auto-Generation</CardTitle>
              <CardDescription>Schedule automatic post generation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoGen">Enable Auto-Generation</Label>
              <p className="text-xs text-muted-foreground">Automatically generate posts daily</p>
            </div>
            <Switch
              id="autoGen"
              checked={settings.autoGenEnabled}
              onChange={(checked) => updateSettings({ autoGenEnabled: checked })}
            />
          </div>
          {settings.autoGenEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <Label htmlFor="autoGenTime">Generation Time</Label>
                <Input
                  id="autoGenTime"
                  type="time"
                  value={settings.autoGenTime}
                  onChange={(e) => updateSettings({ autoGenTime: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="postsPerRun">Posts Per Run</Label>
                <Input
                  id="postsPerRun"
                  type="number"
                  min="3"
                  max="10"
                  value={settings.postsPerRun}
                  onChange={(e) => updateSettings({ postsPerRun: parseInt(e.target.value) })}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {saving && (
        <p className="text-sm text-muted-foreground text-center">Saving...</p>
      )}
    </div>
  );
}
