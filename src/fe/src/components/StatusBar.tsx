import { Mic, MicOff, Circle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useEffect, useState } from 'react';

interface StatusBarProps {
  onStreamChange?: (stream: MediaStream | null) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  selectedDevice?: string;
  referenceCount?: number;
  wordCount?: number;
}

export function StatusBar({ 
  onStreamChange, 
  onRecordingChange, 
  selectedDevice,
  referenceCount = 0,
  wordCount = 0
}: StatusBarProps) {
  const { stream, isRecording, error, isLoading, startRecording, stopRecording } = useMediaRecorder({
    deviceId: selectedDevice && selectedDevice !== 'default' ? selectedDevice : undefined
  });
  
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  // Notify parent of stream changes
  useEffect(() => {
    onStreamChange?.(stream);
  }, [stream, onStreamChange]);

  // Track recording duration
  useEffect(() => {
    if (isRecording) {
      setStartTime(Date.now());
      const interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setDuration(0);
      setStartTime(null);
    }
  }, [isRecording, startTime]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStop = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button
            size="sm"
            onClick={handleStartStop}
            disabled={isLoading}
            className={isRecording 
              ? "bg-red-600 hover:bg-red-700 text-white shadow-md w-full sm:w-auto" 
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-md w-full sm:w-auto"
            }
          >
            {isLoading ? (
              <>
                <Circle className="w-4 h-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : isRecording ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Status:</span>
              <div className="flex items-center gap-2">
                <Circle 
                  className={`w-2 h-2 ${isRecording ? 'fill-green-500 text-green-500 animate-pulse' : 'fill-slate-300 text-slate-300'}`} 
                />
                <span className={`text-sm ${isRecording ? 'text-green-700' : 'text-slate-500'}`}>
                  {isRecording ? 'Recording' : 'Idle'}
                </span>
              </div>
            </div>

            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Duration:</span>
                <span className="text-sm text-slate-700 font-mono">{formatDuration(duration)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-sm text-slate-500">
          <div>
            <span className="text-slate-400">References: </span>
            <span className="text-slate-700 font-medium">{referenceCount}</span>
          </div>
          <div className="w-px h-4 bg-slate-300 hidden sm:block" />
          <div>
            <span className="text-slate-400">Words: </span>
            <span className="text-slate-700 font-medium">{wordCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
