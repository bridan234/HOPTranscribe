import { useState, useEffect } from 'react';
import { X, Mic, Volume2, Sliders, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';

interface SettingsPanelProps {
  onClose: () => void;
  selectedDevice: string;
  onDeviceChange: (device: string) => void;
  bibleVersion: string;
  onBibleVersionChange: (version: string) => void;
  customVersions: string[];
  onCustomVersionsChange: (versions: string[]) => void;
}

export function SettingsPanel({ 
  onClose, 
  selectedDevice, 
  onDeviceChange, 
  bibleVersion, 
  onBibleVersionChange,
  customVersions,
  onCustomVersionsChange
}: SettingsPanelProps) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [sensitivity, setSensitivity] = useState([75]);
  const [minConfidence, setMinConfidence] = useState([70]);
  const [newVersion, setNewVersion] = useState('');
  const [editableVersions, setEditableVersions] = useState<string[]>(customVersions);

  useEffect(() => {
    // Request microphone permissions and get available audio devices
    const getAudioDevices = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get all devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
      } catch (error) {
        console.error('Error accessing audio devices:', error);
        toast.error('Unable to access audio devices. Please check permissions.');
      }
    };

    getAudioDevices();
  }, []);

  const handleAddVersion = () => {
    if (newVersion.trim() && !editableVersions.includes(newVersion.trim().toUpperCase())) {
      setEditableVersions([...editableVersions, newVersion.trim().toUpperCase()]);
      setNewVersion('');
    } else if (editableVersions.includes(newVersion.trim().toUpperCase())) {
      toast.error('This version already exists');
    }
  };

  const handleRemoveVersion = (version: string) => {
    if (editableVersions.length > 1) {
      setEditableVersions(editableVersions.filter(v => v !== version));
    } else {
      toast.error('You must have at least one Bible version');
    }
  };

  const handleSaveSettings = () => {
    onCustomVersionsChange(editableVersions);
    // If current selected version was removed, switch to first available
    if (!editableVersions.includes(bibleVersion)) {
      onBibleVersionChange(editableVersions[0]);
    }
    toast.success('Settings saved successfully!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-2xl mx-4 border-slate-200 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2>Settings</h2>
              <p className="text-sm text-slate-500 mt-1">Configure audio input and transcription options</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Audio Input Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-slate-600" />
                <h3>Audio Input</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="audio-device">Audio Input Device</Label>
                <Select value={selectedDevice} onValueChange={onDeviceChange}>
                  <SelectTrigger id="audio-device">
                    <SelectValue placeholder="Select audio device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">System Default</SelectItem>
                    {audioDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Select the audio source for transcription
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sensitivity">
                  Audio Sensitivity: {sensitivity[0]}%
                </Label>
                <Slider
                  id="sensitivity"
                  value={sensitivity}
                  onValueChange={setSensitivity}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-slate-500">
                  Adjust how sensitive the microphone should be to audio input
                </p>
              </div>
            </div>

            <Separator />

            {/* Bible Versions Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-slate-600" />
                <h3>Bible Versions</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bible-version-setting">Default Bible Version</Label>
                <Select value={bibleVersion} onValueChange={onBibleVersionChange}>
                  <SelectTrigger id="bible-version-setting">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editableVersions.map(version => (
                      <SelectItem key={version} value={version}>{version}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Choose which Bible translation to prioritize for references
                </p>
              </div>

              <div className="space-y-2">
                <Label>Manage Bible Versions</Label>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2 max-h-48 overflow-y-auto">
                  {editableVersions.map((version) => (
                    <div key={version} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200">
                      <span className="text-sm">{version}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVersion(version)}
                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new version (e.g., MSG, AMP)"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddVersion()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddVersion}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Add custom Bible versions to the list
                </p>
              </div>
            </div>

            <Separator />

            {/* Scripture Detection Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-slate-600" />
                <h3>Scripture Detection</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confidence">
                  Minimum Confidence: {minConfidence[0]}%
                </Label>
                <Slider
                  id="confidence"
                  value={minConfidence}
                  onValueChange={setMinConfidence}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-slate-500">
                  Only show scripture references with confidence above this threshold
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="show-confidence">Show Confidence Scores</Label>
                  <p className="text-xs text-slate-500">
                    Display match confidence percentage on references
                  </p>
                </div>
                <Switch
                  id="show-confidence"
                  checked={showConfidence}
                  onCheckedChange={setShowConfidence}
                />
              </div>
            </div>

            <Separator />

            {/* Display Options Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-slate-600" />
                <h3>Display Options</h3>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-scroll">Auto-scroll Transcription</Label>
                  <p className="text-xs text-slate-500">
                    Automatically scroll to latest transcribed text
                  </p>
                </div>
                <Switch
                  id="auto-scroll"
                  checked={autoScroll}
                  onCheckedChange={setAutoScroll}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings}>
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}