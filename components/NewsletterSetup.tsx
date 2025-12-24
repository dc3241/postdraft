'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Mail } from 'lucide-react';
import { useState } from 'react';

interface Props {
  newsletters: any[];
  onAdd: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  gmailConnected: boolean;
  onConnectGmail: () => void;
}

export function NewsletterSetup({ newsletters, onAdd, onUpdate, onDelete, gmailConnected, onConnectGmail }: Props) {
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');

  async function handleAdd() {
    if (!senderEmail || !senderName) return;
    await onAdd({ senderEmail, senderName });
    setSenderEmail('');
    setSenderName('');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Newsletters</CardTitle>
        <CardDescription>Connect Gmail and manage which newsletters to monitor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gmail Connection */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Gmail Connection</p>
              <p className="text-xs text-muted-foreground">
                {gmailConnected ? '✓ Connected' : 'Required to fetch newsletters'}
              </p>
            </div>
          </div>
          <Button onClick={onConnectGmail} variant="outline" size="sm">
            {gmailConnected ? 'Reconnect' : 'Connect Gmail'}
          </Button>
        </div>

        <div className="border-t pt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="senderName">Sender Name</Label>
          <Input
            id="senderName"
            placeholder="e.g., WhatTheAI"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senderEmail">Sender Email</Label>
          <Input
            id="senderEmail"
            type="email"
            placeholder="newsletter@example.com"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
          />
        </div>
        <Button onClick={handleAdd}>Add Newsletter</Button>

        </div>

        <div className="space-y-2">
          {newsletters.map((newsletter: any) => (
            <div key={newsletter.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{newsletter.senderName}</div>
                <div className="text-sm text-gray-500">{newsletter.senderEmail}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newsletter.enabled}
                  onChange={(checked) => onUpdate(newsletter.id, { enabled: checked })}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(newsletter.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

