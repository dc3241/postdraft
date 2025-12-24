'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Mic2, Plus, X, Trash2, Star, Sparkles } from 'lucide-react';

interface BrandVoice {
  id: string;
  name: string;
  tone: string;
  sampleTweets: string;
  analyzedStyle: string;
  isDefault: boolean;
}

interface Props {
  voices: BrandVoice[];
  onAdd: (data: any) => void;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onAnalyze: (id: string) => void;
}

export function BrandVoiceSetup({ voices, onAdd, onUpdate, onDelete, onAnalyze }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    tone: 'professional',
    sampleTweets: ['', '', ''],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    
    const filledTweets = form.sampleTweets.filter(t => t.trim());
    if (filledTweets.length < 3) {
      alert('Please provide at least 3 sample tweets');
      return;
    }
    
    onAdd({
      name: form.name,
      tone: form.tone,
      sampleTweets: filledTweets,
      isDefault: voices.length === 0,
    });
    
    setForm({ name: '', tone: 'professional', sampleTweets: ['', '', ''] });
    setShowForm(false);
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzing(id);
    await onAnalyze(id);
    setAnalyzing(null);
  };

  const updateTweet = (index: number, value: string) => {
    const newTweets = [...form.sampleTweets];
    newTweets[index] = value;
    setForm({ ...form, sampleTweets: newTweets });
  };

  const addTweetField = () => {
    if (form.sampleTweets.length < 10) {
      setForm({ ...form, sampleTweets: [...form.sampleTweets, ''] });
    }
  };

  const removeTweetField = (index: number) => {
    if (form.sampleTweets.length > 3) {
      const newTweets = form.sampleTweets.filter((_, i) => i !== index);
      setForm({ ...form, sampleTweets: newTweets });
    }
  };

  const parseTweets = (voice: BrandVoice): string[] => {
    try {
      return JSON.parse(voice.sampleTweets || '[]');
    } catch {
      return [];
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base">Brand Voices</CardTitle>
              <CardDescription>Create different voices for your content by providing sample tweets</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="voiceName">Voice Name</Label>
                <Input
                  id="voiceName"
                  placeholder="e.g., Professional, Casual"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="voiceTone">Base Tone</Label>
                <Select
                  id="voiceTone"
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="authoritative">Authoritative</option>
                  <option value="humorous">Humorous</option>
                  <option value="inspirational">Inspirational</option>
                </Select>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sample Tweets (3-10 required)</Label>
                {form.sampleTweets.length < 10 && (
                  <Button type="button" variant="ghost" size="sm" onClick={addTweetField}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {form.sampleTweets.map((tweet, i) => (
                  <div key={i} className="flex gap-2">
                    <Textarea
                      placeholder={`Sample tweet ${i + 1}...`}
                      value={tweet}
                      onChange={(e) => updateTweet(i, e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    {form.sampleTweets.length > 3 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTweetField(i)}
                        className="text-muted-foreground"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <Button type="submit" size="sm">Create Voice</Button>
          </form>
        )}

        {voices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No brand voices created yet. Add sample tweets to create your first voice.
          </p>
        ) : (
          <div className="space-y-3">
            {voices.map((voice) => {
              const tweets = parseTweets(voice);
              return (
                <div
                  key={voice.id}
                  className="p-4 bg-muted/30 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{voice.name}</h4>
                      {voice.isDefault && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          <Star className="w-3 h-3" /> Default
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {voice.tone}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!voice.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdate(voice.id, { isDefault: true })}
                          title="Set as default"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAnalyze(voice.id)}
                        disabled={analyzing === voice.id}
                        title="Analyze style with AI"
                      >
                        <Sparkles className={`w-4 h-4 ${analyzing === voice.id ? 'animate-pulse' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(voice.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {tweets.length} sample tweets
                  </p>
                  
                  {voice.analyzedStyle && (
                    <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-800">
                      <strong>AI Analysis:</strong> {voice.analyzedStyle}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
