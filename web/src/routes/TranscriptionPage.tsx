import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AuthGate } from '@/components/AuthGate';
import { CreateSession } from '@/components/CreateSession';
import { SessionView } from '@/components/SessionView';
import { authService } from '@/services/authService';
import { sessionService } from '@/services/sessionService';
import type { SessionDto } from '@/types/api';

type Phase = 'auth' | 'lobby' | 'session';

export function TranscriptionPage() {
  const [phase, setPhase] = useState<Phase>('auth');
  const [username, setUsername] = useState<string>('');
  const [session, setSession] = useState<SessionDto | null>(null);

  useEffect(() => {
    const storedUser = authService.getStoredUsername();
    const storedToken = authService.getStoredToken();
    if (storedUser && storedToken) {
      setUsername(storedUser);
      setPhase('lobby');
    }
  }, []);

  if (phase === 'auth') {
    return (
      <AuthGate
        onAuthenticated={(name) => {
          setUsername(name);
          setPhase('lobby');
        }}
      />
    );
  }

  if (phase === 'lobby' || !session) {
    return (
      <CreateSession
        username={username}
        onCreated={(s) => {
          setSession(s);
          setPhase('session');
        }}
        onJoin={async (code) => {
          try {
            const s = await sessionService.get(code);
            setSession(s);
            setPhase('session');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to join session.');
          }
        }}
        onSignOut={() => {
          authService.signOut();
          setUsername('');
          setSession(null);
          setPhase('auth');
        }}
      />
    );
  }

  return (
    <SessionView
      session={session}
      username={username}
      onBack={() => {
        setSession(null);
        setPhase('lobby');
      }}
    />
  );
}
