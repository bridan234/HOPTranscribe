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
import { toast } from 'sonner';

interface SettingsPanelProps {
  onClose: () => void;
  selectedDevice: string;
  onDeviceChange: (device: string) => void;
  bibleVersion: string;
  onBibleVersionChange: (version: string) => void;
  customVersions: string[];
  onCustomVersionsChange: (versions: string[]) => void;
  primaryLanguage?: string;
  onPrimaryLanguageChange?: (language: string) => void;
  customLanguages?: Array<{ code: string; name: string }>;
  onCustomLanguagesChange?: (languages: Array<{ code: string; name: string }>) => void;
  // Additional settings
  autoScroll?: boolean;
  onAutoScrollChange?: (value: boolean) => void;
  showConfidence?: boolean;
  onShowConfidenceChange?: (value: boolean) => void;
  sensitivity?: number;
  onSensitivityChange?: (value: number) => void;
  minConfidence?: number;
  onMinConfidenceChange?: (value: number) => void;
  maxReferences?: number;
  onMaxReferencesChange?: (value: number) => void;
}

export function SettingsPanel({ 
  onClose, 
  selectedDevice, 
  onDeviceChange, 
  bibleVersion, 
  onBibleVersionChange,
  customVersions,
  onCustomVersionsChange,
  primaryLanguage: initialPrimaryLanguage = 'English',
  onPrimaryLanguageChange,
  customLanguages: initialCustomLanguages = [],
  onCustomLanguagesChange,
  autoScroll: initialAutoScroll = true,
  onAutoScrollChange,
  showConfidence: initialShowConfidence = true,
  onShowConfidenceChange,
  sensitivity: initialSensitivity = 75,
  onSensitivityChange,
  minConfidence: initialMinConfidence = 40,
  onMinConfidenceChange,
  maxReferences: initialMaxReferences = 3,
  onMaxReferencesChange
}: SettingsPanelProps) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState(initialPrimaryLanguage);
  const [customLanguages, setCustomLanguages] = useState<Array<{ code: string; name: string }>>(initialCustomLanguages);
  const [newLanguageName, setNewLanguageName] = useState('');
  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [showConfidence, setShowConfidence] = useState(initialShowConfidence);
  const [sensitivity, setSensitivity] = useState([initialSensitivity]);
  const [minConfidence, setMinConfidence] = useState([initialMinConfidence]);
  const [maxReferences, setMaxReferences] = useState([initialMaxReferences]);
  const [newVersion, setNewVersion] = useState('');
  const [editableVersions, setEditableVersions] = useState<string[]>(customVersions);

  // Default languages
  const defaultLanguages = [
    { code: 'English', name: 'English' },
    { code: 'Spanish', name: 'Spanish (Español)' },
    { code: 'French', name: 'French (Français)' },
    { code: 'German', name: 'German (Deutsch)' },
    { code: 'Italian', name: 'Italian (Italiano)' },
    { code: 'Portuguese', name: 'Portuguese (Português)' },
    { code: 'Chinese', name: 'Chinese (中文)' },
    { code: 'Japanese', name: 'Japanese (日本語)' },
    { code: 'Korean', name: 'Korean (한국어)' },
    { code: 'Arabic', name: 'Arabic (العربية)' },
    { code: 'Hindi', name: 'Hindi (हिन्दी)' },
    { code: 'Russian', name: 'Russian (Русский)' },
  ];

  // Combine default and custom languages
  const allLanguages = [...defaultLanguages, ...customLanguages];

  // Sync internal state with prop changes
  useEffect(() => {
    setPrimaryLanguage(initialPrimaryLanguage);
  }, [initialPrimaryLanguage]);

  useEffect(() => {
    setCustomLanguages(initialCustomLanguages);
  }, [initialCustomLanguages]);

  useEffect(() => {
    setAutoScroll(initialAutoScroll);
  }, [initialAutoScroll]);

  useEffect(() => {
    setShowConfidence(initialShowConfidence);
  }, [initialShowConfidence]);

  useEffect(() => {
    setSensitivity([initialSensitivity]);
  }, [initialSensitivity]);

  useEffect(() => {
    setMinConfidence([initialMinConfidence]);
  }, [initialMinConfidence]);

  useEffect(() => {
    setMaxReferences([initialMaxReferences]);
  }, [initialMaxReferences]);

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

  const handleAddLanguage = () => {
    const name = newLanguageName.trim();
    
    if (!name) {
      toast.error('Please provide a language name');
      return;
    }
    
    const code = name;
    
    if (allLanguages.some(lang => lang.name.toLowerCase() === name.toLowerCase())) {
      toast.error('This language already exists');
      return;
    }
    
    setCustomLanguages([...customLanguages, { code, name }]);
    setNewLanguageName('');
    toast.success(`Added ${name}`);
  };

  const handleRemoveLanguage = (code: string) => {
    setCustomLanguages(customLanguages.filter(lang => lang.code !== code));
    // If current language was removed, switch to English
    if (primaryLanguage === code) {
      setPrimaryLanguage('English');
    }
    toast.success('Language removed');
  };

  const handleSaveSettings = () => {
    onCustomVersionsChange(editableVersions);
    // If current selected version was removed, switch to first available
    if (!editableVersions.includes(bibleVersion)) {
      onBibleVersionChange(editableVersions[0]);
    }
    // Save custom languages
    onCustomLanguagesChange?.(customLanguages);
    // Save other settings
    onPrimaryLanguageChange?.(primaryLanguage);
    onAutoScrollChange?.(autoScroll);
    onShowConfidenceChange?.(showConfidence);
    onSensitivityChange?.(sensitivity[0]);
    onMinConfidenceChange?.(minConfidence[0]);
    onMaxReferencesChange?.(maxReferences[0]);
    
    toast.success('Settings saved successfully!');
    onClose();
    
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-2xl mx-4 border-slate-200 shadow-xl max-h-[85vh] overflow-hidden flex flex-col bg-white">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2>C-Panel</h2>
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
                  <SelectContent className="bg-white border-slate-200">
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
                <Label htmlFor="sensitivity" className="text-slate-400">
                  Audio Sensitivity: {sensitivity[0]}% (Coming Soon)
                </Label>
                <Slider
                  id="sensitivity"
                  value={sensitivity}
                  onValueChange={setSensitivity}
                  max={100}
                  step={5}
                  className="w-full opacity-50 pointer-events-none"
                  disabled
                />
                <p className="text-xs text-slate-400">
                  Audio sensitivity adjustment will be available in a future update
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-language">Primary Output Language</Label>
                <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                  <SelectTrigger id="primary-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 max-h-[300px]">
                    {allLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Transcription output will be provided in this language
                </p>
              </div>

              {/* Manage Custom Languages */}
              {customLanguages.length > 0 && (
                <div className="space-y-2">
                  <Label>Custom Languages</Label>
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2 max-h-32 overflow-y-auto">
                    {customLanguages.map((lang) => (
                      <div key={lang.code} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200">
                        <span className="text-sm">{lang.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLanguage(lang.code)}
                          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Add Custom Language</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Language name (e.g., Swahili, Amharic)"
                    value={newLanguageName}
                    onChange={(e) => setNewLanguageName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddLanguage()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddLanguage}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Add any language by name (e.g., Swahili, Amharic, Yoruba, Tamil)
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
                  <SelectContent className="bg-white border-slate-200">
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

              <div className="space-y-3">
                <Label htmlFor="confidence">
                  Minimum Confidence: {minConfidence[0]}%
                </Label>
                <div className="py-2">
                  <Slider
                    id="confidence"
                    value={minConfidence}
                    onValueChange={setMinConfidence}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Only show scripture references with confidence above this threshold
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="maxReferences">
                  Max References: {maxReferences[0]}
                </Label>
                <div className="py-2">
                  <Slider
                    id="maxReferences"
                    value={maxReferences}
                    onValueChange={setMaxReferences}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Maximum number of scripture references to return per detection
                </p>
              </div>

              <div className="flex items-center justify-between py-3">
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

              <div className="flex items-center justify-between py-3">
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