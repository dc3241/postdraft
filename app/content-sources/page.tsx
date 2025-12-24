'use client';

import { useEffect, useState } from 'react';
import { ContentSourceSetup } from '@/components/ContentSourceSetup';
import { NewsletterSetup } from '@/components/NewsletterSetup';

export default function ContentSourcesPage() {
  const [settings, setSettings] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'gmail_connected') {
      alert('Gmail connected successfully!');
    }
    if (params.get('error')) {
      alert('Error: ' + params.get('error'));
    }
  }, []);

  async function fetchAll() {
    await Promise.all([
      fetchSettings(),
      fetchSources(),
      fetchNewsletters(),
    ]);
    setLoading(false);
  }

  async function fetchSettings() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }

  async function fetchSources() {
    try {
      const response = await fetch('/api/sources');
      const data = await response.json();
      setSources(data);
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  }

  async function fetchNewsletters() {
    try {
      const response = await fetch('/api/newsletters');
      const data = await response.json();
      setNewsletters(data);
    } catch (error) {
      console.error('Error fetching newsletters:', error);
    }
  }

  async function connectGmail() {
    try {
      const response = await fetch('/api/auth/gmail');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      alert('Failed to connect Gmail');
    }
  }

  // Content source handlers
  async function addSource(data: any) {
    try {
      await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchSources();
    } catch (error) {
      console.error('Error adding source:', error);
    }
  }

  async function updateSource(id: string, data: any) {
    try {
      await fetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchSources();
    } catch (error) {
      console.error('Error updating source:', error);
    }
  }

  async function deleteSource(id: string) {
    try {
      await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      fetchSources();
    } catch (error) {
      console.error('Error deleting source:', error);
    }
  }

  async function scrapeSource(id: string) {
    try {
      await fetch(`/api/sources/${id}/scrape`, { method: 'POST' });
      fetchSources();
    } catch (error) {
      console.error('Error scraping source:', error);
    }
  }

  // Newsletter handlers
  async function addNewsletter(data: any) {
    try {
      await fetch('/api/newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchNewsletters();
    } catch (error) {
      console.error('Error adding newsletter:', error);
    }
  }

  async function updateNewsletter(id: string, data: any) {
    try {
      await fetch(`/api/newsletters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchNewsletters();
    } catch (error) {
      console.error('Error updating newsletter:', error);
    }
  }

  async function deleteNewsletter(id: string) {
    try {
      await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
      fetchNewsletters();
    } catch (error) {
      console.error('Error deleting newsletter:', error);
    }
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-8 w-full space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Content Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect and manage your content sources for post generation
        </p>
      </div>

      {/* Content Sources */}
      <ContentSourceSetup
        sources={sources}
        onAdd={addSource}
        onUpdate={updateSource}
        onDelete={deleteSource}
        onScrape={scrapeSource}
      />

      {/* Newsletters */}
      <NewsletterSetup
        newsletters={newsletters}
        onAdd={addNewsletter}
        onUpdate={updateNewsletter}
        onDelete={deleteNewsletter}
        gmailConnected={!!settings?.gmailAccessToken}
        onConnectGmail={connectGmail}
      />
    </div>
  );
}

