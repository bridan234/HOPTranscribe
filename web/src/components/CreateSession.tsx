import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sessionService } from '@/services/sessionService';
import type { SessionDto } from '@/types/api';

interface CreateSessionProps {
  username: string;
  onCreated: (session: SessionDto) => void;
  onJoin: (code: string) => void;
  onSignOut: () => void;
}

export function CreateSession({ username, onCreated, onJoin, onSignOut }: CreateSessionProps) {
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 1) {
      toast.error('Title is required.');
      return;
    }
    setBusy('create');
    try {
      const session = await sessionService.create({ title: trimmed, language: 'en' });
      onCreated(session);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create session.');
    } finally {
      setBusy(null);
    }
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      toast.error('Enter a session code.');
      return;
    }
    setBusy('join');
    try {
      await sessionService.get(code);
      onJoin(code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Session not found.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">HOPTranscribe v2</h1>
            <p className="text-sm text-muted-foreground">Signed in as {username}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Start a new session</CardTitle>
              <CardDescription>Create a session to record and transcribe.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Sunday morning service"
                    disabled={busy === 'create'}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy === 'create'}>
                  {busy === 'create' ? 'Creating...' : 'Create session'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join an existing session</CardTitle>
              <CardDescription>Enter the 6-character session code to view live.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={join} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Session code</Label>
                  <Input
                    id="code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="A1B2C3"
                    maxLength={6}
                    disabled={busy === 'join'}
                  />
                </div>
                <Button type="submit" className="w-full" variant="secondary" disabled={busy === 'join'}>
                  {busy === 'join' ? 'Looking up...' : 'Join session'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
