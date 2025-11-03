/**
 * Session Code Display Component
 * Shows the active session code prominently with copy functionality
 */

import { useState } from 'react';
import { Copy, Check, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface SessionCodeDisplayProps {
  sessionCode: string;
  username: string;
  title: string;
}

export function SessionCodeDisplay({ sessionCode, username, title }: SessionCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy session code:', error);
      alert('Failed to copy session code');
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="default" className="bg-blue-600">
                🔴 Live Session
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                @{username}
              </Badge>
            </div>
            <h3 className="font-medium text-slate-900 truncate">{title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">Session Code:</span>
              <code className="text-sm font-mono font-bold text-blue-600 bg-white px-2 py-1 rounded border border-blue-200">
                {sessionCode}
              </code>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy Code
              </>
            )}
          </Button>
        </div>
        
        <p className="text-xs text-slate-500 mt-3 border-t border-blue-200 pt-2">
          💡 Share this code with others to join your session (collaborative feature coming in v1.1)
        </p>
      </CardContent>
    </Card>
  );
}
