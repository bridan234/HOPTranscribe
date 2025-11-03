import React from 'react';
import { Button } from './ui/button';
import { Mic, Pause, Play, Square } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onEndSession: () => void;
  isReadOnly?: boolean;
}

export function RecordingControls({
  isRecording,
  isPaused,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onEndSession,
  isReadOnly = false
}: RecordingControlsProps) {
  if (isReadOnly) {
    return null;
  }

  // Session active but not recording yet
  if (!isRecording && !isPaused) {
    return (
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Button onClick={onStartRecording} className="gap-2 text-sm">
          <Mic className="w-4 h-4" />
          <span className="hidden sm:inline">Start Recording</span>
          <span className="sm:hidden">Start</span>
        </Button>
      </div>
    );
  }

  // Currently recording
  if (isRecording && !isPaused) {
    return (
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        <div className="flex items-center gap-2 px-2 py-1 bg-red-100 rounded-lg">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs sm:text-sm text-red-700">Recording</span>
        </div>
        <Button onClick={onPauseRecording} variant="outline" className="gap-1 sm:gap-2 text-sm" size="sm">
          <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Pause</span>
        </Button>
        <Button onClick={onEndSession} variant="destructive" className="gap-1 sm:gap-2 text-sm" size="sm">
          <Square className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">End</span>
          <span className="sm:hidden">End</span>
        </Button>
      </div>
    );
  }

  // Paused
  if (isPaused) {
    return (
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        <div className="flex items-center gap-2 px-2 py-1 bg-yellow-100 rounded-lg">
          <Pause className="w-3 h-3 text-yellow-700" />
          <span className="text-xs sm:text-sm text-yellow-700">Paused</span>
        </div>
        <Button onClick={onResumeRecording} className="gap-1 sm:gap-2 text-sm" size="sm">
          <Play className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Continue</span>
          <span className="sm:hidden">Resume</span>
        </Button>
        <Button onClick={onEndSession} variant="destructive" className="gap-1 sm:gap-2 text-sm" size="sm">
          <Square className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">End Session</span>
          <span className="sm:hidden">End</span>
        </Button>
      </div>
    );
  }

  return null;
}
