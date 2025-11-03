import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle } from 'lucide-react';

interface JoinSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinSession: (sessionId: string) => void;
}

export function JoinSessionDialog({ open, onOpenChange, onJoinSession }: JoinSessionDialogProps) {
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionId.trim()) {
      setError('Session ID is required');
      return;
    }
    
    onJoinSession(sessionId.trim());
  };

  const handleCancel = () => {
    setSessionId('');
    setError('');
    onOpenChange(false);
  };

  const handleChange = (value: string) => {
    setSessionId(value);
    if (error) setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Join Ongoing Session</DialogTitle>
            <DialogDescription>
              Enter the session ID to join an active transcription session in read-only mode.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Session ID</Label>
              <Input
                id="sessionId"
                placeholder="e.g., a23h-username"
                value={sessionId}
                onChange={(e) => handleChange(e.target.value)}
                className={error ? 'border-red-500' : ''}
              />
              <p className="text-sm text-gray-500">
                Format: 4 alphanumeric characters, dash, and username (e.g., a23h-john)
              </p>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">Join Session</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
