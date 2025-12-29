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
import { Loader2 } from 'lucide-react';

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSession: (userName: string, title: string) => void;
  apiErrors?: { userName?: string[]; title?: string[] };
  isLoading?: boolean;
}

export function CreateSessionDialog({ open, onOpenChange, onCreateSession, apiErrors, isLoading = false }: CreateSessionDialogProps) {
  const [userName, setUserName] = useState('');
  const [title, setTitle] = useState('');
  const [errors, setErrors] = useState<{ userName?: string; title?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { userName?: string; title?: string } = {};
    
    if (!userName.trim()) {
      newErrors.userName = 'Name is required';
    }
    
    if (!title.trim()) {
      newErrors.title = 'Session title is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onCreateSession(userName.trim(), title.trim());
    setUserName('');
    setTitle('');
    setErrors({});
  };

  const handleCancel = () => {
    setUserName('');
    setTitle('');
    setErrors({});
    onOpenChange(false);
  };
  
  const displayErrors = {
    userName: errors.userName || apiErrors?.userName?.[0],
    title: errors.title || apiErrors?.title?.[0],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
            <DialogDescription>
              Start a new transcription session. You'll receive a session ID that others can use to join.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Your Name</Label>
              <Input
                id="userName"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  if (errors.userName) {
                    setErrors({ ...errors, userName: undefined });
                  }
                }}
                className={displayErrors.userName ? 'border-red-500' : ''}
              />
              {displayErrors.userName && (
                <p className="text-sm text-red-500">{displayErrors.userName}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Session Title</Label>
              <Input
                id="title"
                placeholder="e.g., Sunday Morning Service"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) {
                    setErrors({ ...errors, title: undefined });
                  }
                }}
                className={displayErrors.title ? 'border-red-500' : ''}
              />
              {displayErrors.title && (
                <p className="text-sm text-red-500">{displayErrors.title}</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Session'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
