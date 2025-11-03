import { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { Settings } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';

interface LayoutProps {
  children: ReactNode;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  selectedDevice: string;
  onDeviceChange: (device: string) => void;
  bibleVersion: string;
  onBibleVersionChange: (version: string) => void;
  customVersions: string[];
  onCustomVersionsChange: (versions: string[]) => void;
  primaryLanguage: string;
  onPrimaryLanguageChange: (language: string) => void;
  customLanguages: Array<{ code: string; name: string }>;
  onCustomLanguagesChange: (languages: Array<{ code: string; name: string }>) => void;
  autoScroll: boolean;
  onAutoScrollChange: (value: boolean) => void;
  showConfidence: boolean;
  onShowConfidenceChange: (value: boolean) => void;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  minConfidence: number;
  onMinConfidenceChange: (value: number) => void;
  maxReferences: number;
  onMaxReferencesChange: (value: number) => void;
}

export function Layout({ 
  children, 
  theme, 
  onToggleTheme,
  selectedDevice,
  onDeviceChange,
  bibleVersion,
  onBibleVersionChange,
  customVersions,
  onCustomVersionsChange,
  primaryLanguage,
  onPrimaryLanguageChange,
  customLanguages,
  onCustomLanguagesChange,
  autoScroll,
  onAutoScrollChange,
  showConfidence,
  onShowConfidenceChange,
  sensitivity,
  onSensitivityChange,
  minConfidence,
  onMinConfidenceChange,
  maxReferences,
  onMaxReferencesChange
}: LayoutProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">HOP Transcribe</h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Real-time audio transcription with AI-powered scripture reference detection
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="shrink-0 gap-2"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Preferences</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-4">
        <div className="container mx-auto px-4 sm:px-6">
          <p className="text-center text-xs sm:text-sm text-gray-600">
            © {new Date().getFullYear()} HOP Transcribe. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          selectedDevice={selectedDevice}
          onDeviceChange={onDeviceChange}
          bibleVersion={bibleVersion}
          onBibleVersionChange={onBibleVersionChange}
          customVersions={customVersions}
          onCustomVersionsChange={onCustomVersionsChange}
          primaryLanguage={primaryLanguage}
          onPrimaryLanguageChange={onPrimaryLanguageChange}
          customLanguages={customLanguages}
          onCustomLanguagesChange={onCustomLanguagesChange}
          autoScroll={autoScroll}
          onAutoScrollChange={onAutoScrollChange}
          showConfidence={showConfidence}
          onShowConfidenceChange={onShowConfidenceChange}
          sensitivity={sensitivity}
          onSensitivityChange={onSensitivityChange}
          minConfidence={minConfidence}
          onMinConfidenceChange={onMinConfidenceChange}
          maxReferences={maxReferences}
          onMaxReferencesChange={onMaxReferencesChange}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
      )}
    </div>
  );
}
