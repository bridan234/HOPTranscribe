import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/authService';

interface AuthGateProps {
  onAuthenticated: (username: string) => void;
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      toast.error('Username must be at least 2 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = await authService.claim(trimmed);
      onAuthenticated(result.username);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to claim username.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>HOPTranscribe v2</CardTitle>
          <CardDescription>
            Claim a username to start transcribing sermons. No password required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. pastor-john"
                autoFocus
                autoComplete="off"
                disabled={busy}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Claiming...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
