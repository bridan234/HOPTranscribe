import { useCallback, useRef } from 'react';
import { matchService } from '@/services/matchService';
import type { ScriptureMatchDto } from '@/types/api';

export interface MatchAttemptResult {
  matches: ScriptureMatchDto[];
  error?: Error;
}

interface UseScriptureMatcherOptions {
  sessionCode: string;
  preferredVersion: string;
  n?: number;
  minLength?: number;
}

export function useScriptureMatcher({
  sessionCode,
  preferredVersion,
  n = 3,
  minLength = 8,
}: UseScriptureMatcherOptions) {
  const inflightRef = useRef<AbortController | null>(null);

  const requestMatches = useCallback(
    async (utterance: string): Promise<MatchAttemptResult> => {
      const text = utterance.trim();
      if (text.length < minLength) return { matches: [] };

      inflightRef.current?.abort();
      const ctrl = new AbortController();
      inflightRef.current = ctrl;
      try {
        const result = await matchService.match({
          sessionCode,
          utterance: text,
          preferredVersion,
          n,
        });
        if (ctrl.signal.aborted) return { matches: [] };
        return { matches: result.matches ?? [] };
      } catch (err) {
        if (ctrl.signal.aborted) return { matches: [] };
        return { matches: [], error: err instanceof Error ? err : new Error(String(err)) };
      } finally {
        if (inflightRef.current === ctrl) inflightRef.current = null;
      }
    },
    [sessionCode, preferredVersion, n, minLength],
  );

  const cancel = useCallback(() => {
    inflightRef.current?.abort();
    inflightRef.current = null;
  }, []);

  return { requestMatches, cancel };
}
