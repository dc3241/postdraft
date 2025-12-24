'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Globe, Trash2, RefreshCw, Plus, X } from 'lucide-react';

interface ContentSource {
  id: string;
  url: string;
  name: string;
  type: string;
  scrapeFreq: string;
  lastScraped: string | null;
  enabled: boolean;
}

interface Props {
  sources: ContentSource[];
  onAdd: (data: any) => void;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onScrape: (id: string) => void;
}

export function ContentSourceSetup({ sources, onAdd, onUpdate, onDelete, onScrape }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [scraping, setScraping] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    url: '',
    type: 'website',
    scrapeFreq: 'daily',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    onAdd(form);
    setForm({ name: '', url: '', type: 'website', scrapeFreq: 'daily' });
    setShowForm(false);
  };

  const handleScrape = async (id: string) => {
    setScraping(id);
    await onScrape(id);
    setScraping(null);
  };

  const formatLastScraped = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center">
              <Globe className="w-4 h-4 text-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-base">Content Sources</CardTitle>
              <CardDescription>Add websites, subreddits, or RSS feeds to scrape for content ideas</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sourceName">Name</Label>
                <Input
                  id="sourceName"
                  placeholder="e.g., Tech News"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sourceUrl">URL</Label>
                <Input
                  id="sourceUrl"
                  placeholder="https://..."
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sourceType">Type</Label>
                <Select
                  id="sourceType"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="website">Website</option>
                  <option value="reddit">Reddit</option>
                  <option value="rss">RSS Feed</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="sourceFreq">Scrape Frequency</Label>
                <Select
                  id="sourceFreq"
                  value={form.scrapeFreq}
                  onChange={(e) => setForm({ ...form, scrapeFreq: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </div>
            </div>
            <Button type="submit" size="sm">Add Source</Button>
          </form>
        )}

        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No content sources added yet. Add websites or subreddits to scrape for content ideas.
          </p>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={source.enabled}
                    onChange={(checked) => onUpdate(source.id, { enabled: checked })}
                  />
                  <div>
                    <p className="font-medium text-sm">{source.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.type} · {source.scrapeFreq} · Last: {formatLastScraped(source.lastScraped)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleScrape(source.id)}
                    disabled={scraping === source.id}
                  >
                    <RefreshCw className={`w-4 h-4 ${scraping === source.id ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(source.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

