import { useEffect } from 'react';
import { Mic, MicOff, Circle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useMediaRecorder } from '../../../src/fe/src/hooks/useMediaRecorder';

interface StatusBarProps {
  onStreamChange?: (stream: MediaStream | null) => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

export function StatusBar({ onStreamChange, onRecordingChange }: StatusBarProps) {
  const { stream, isRecording, error, isLoading, startRecording, stopRecording } = useMediaRecorder();

  // Notify parent of stream changes
  useEffect(() => {
    onStreamChange?.(stream);
  }, [stream, onStreamChange]);

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  const handleStartStop = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
      <div className="flex items-center gap-4">
        <Button
          size="sm"
          onClick={handleStartStop}
          disabled={isLoading}
          className={isRecording 
            ? "bg-red-600 hover:bg-red-700 text-white shadow-md" 
            : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
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

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Status:</span>
            <div className="flex items-center gap-2">
              <Circle 
                className={`w-2 h-2 ${isRecording ? 'fill-green-500 text-green-500 animate-pulse' : 'fill-slate-300 text-slate-300'}`} 
              />
              <span className={`text-sm ${isRecording ? 'text-green-700' : 'text-slate-500'}`}>
                {isLoading ? 'Loading...' : isRecording ? 'Recording' : 'Idle'}
              </span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}

          {isRecording && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Duration:</span>
                <span className="text-sm text-slate-700">45:23</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Audio Level:</span>
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-200" 
                    style={{ width: '70%' }} 
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-500">
        <div>
          <span className="text-slate-400">References: </span>
          <span className="text-slate-700">3</span>
        </div>
        <div className="w-px h-4 bg-slate-300" />
        <div>
          <span className="text-slate-400">Words: </span>
          <span className="text-slate-700">1,247</span>
        </div>
      </div>
    </div>
  );
}
