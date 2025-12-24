'use client';

import { useEffect, useState } from 'react';
import { BrandVoiceSetup } from '@/components/BrandVoiceSetup';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export default function BrandVoicesPage() {
  const [brandVoices, setBrandVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrandVoices();
  }, []);

  async function fetchBrandVoices() {
    try {
      const response = await fetch('/api/brand-voices');
      const data = await response.json();
      setBrandVoices(data);
    } catch (error) {
      console.error('Error fetching brand voices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addBrandVoice(data: any) {
    try {
      await fetch('/api/brand-voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchBrandVoices();
    } catch (error) {
      console.error('Error adding brand voice:', error);
    }
  }

  async function updateBrandVoice(id: string, data: any) {
    try {
      await fetch(`/api/brand-voices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchBrandVoices();
    } catch (error) {
      console.error('Error updating brand voice:', error);
    }
  }

  async function deleteBrandVoice(id: string) {
    try {
      await fetch(`/api/brand-voices/${id}`, { method: 'DELETE' });
      fetchBrandVoices();
    } catch (error) {
      console.error('Error deleting brand voice:', error);
    }
  }

  async function analyzeBrandVoice(id: string) {
    try {
      await fetch(`/api/brand-voices/${id}/analyze`, { method: 'POST' });
      fetchBrandVoices();
    } catch (error) {
      console.error('Error analyzing brand voice:', error);
    }
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-8 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Brand Voices</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage different writing styles for your content
        </p>
      </div>

      {/* Tips Card */}
      <Card className="border-border shadow-sm mb-6 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-amber-900 mb-1">Tips for effective brand voices</p>
              <ul className="text-amber-800 space-y-1">
                <li>• Provide 5-10 sample tweets that represent your ideal voice</li>
                <li>• Include variety - different topics but consistent tone</li>
                <li>• Click "Analyze" to let AI understand your style patterns</li>
                <li>• Set one voice as default for automatic generation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <BrandVoiceSetup
        voices={brandVoices}
        onAdd={addBrandVoice}
        onUpdate={updateBrandVoice}
        onDelete={deleteBrandVoice}
        onAnalyze={analyzeBrandVoice}
      />
    </div>
  );
}

