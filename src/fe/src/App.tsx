import { useState, useEffect } from 'react';
import TranscriptionPage from './pages/TranscriptionPage';
import { Layout } from './components/Layout';
import { BIBLE_VERSIONS, SCRIPTURE_DETECTION, LANGUAGES, AUDIO_SETTINGS, UI_SETTINGS, STORAGE_KEYS } from './constants/openaiConstants';
import { loggingService } from './services/loggingService';

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    loggingService.error(`Error loading ${key} from localStorage`, 'Storage', error as Error);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    loggingService.error(`Error saving ${key} to localStorage`, 'Storage', error as Error);
  }
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const [selectedDevice, setSelectedDevice] = useState<string>(() => 
    loadFromStorage(STORAGE_KEYS.SELECTED_DEVICE, AUDIO_SETTINGS.DEFAULT_DEVICE)
  );
  const [bibleVersion, setBibleVersion] = useState<string>(() => 
    loadFromStorage(STORAGE_KEYS.BIBLE_VERSION, BIBLE_VERSIONS.DEFAULT_VERSION)
  );
  const [customVersions, setCustomVersions] = useState<string[]>(() => 
    loadFromStorage(STORAGE_KEYS.CUSTOM_VERSIONS, [...BIBLE_VERSIONS.DEFAULT_VERSIONS])
  );
  const [primaryLanguage, setPrimaryLanguage] = useState<string>(() => 
    loadFromStorage(STORAGE_KEYS.PRIMARY_LANGUAGE, LANGUAGES.DEFAULT)
  );
  const [customLanguages, setCustomLanguages] = useState<Array<{ code: string; name: string }>>(() => 
    loadFromStorage(STORAGE_KEYS.CUSTOM_LANGUAGES, [])
  );
  const [autoScroll, setAutoScroll] = useState<boolean>(() => 
    loadFromStorage(STORAGE_KEYS.AUTO_SCROLL, UI_SETTINGS.AUTO_SCROLL)
  );
  const [showConfidence, setShowConfidence] = useState<boolean>(() => 
    loadFromStorage(STORAGE_KEYS.SHOW_CONFIDENCE, UI_SETTINGS.SHOW_CONFIDENCE)
  );
  const [sensitivity, setSensitivity] = useState<number>(() => 
    loadFromStorage(STORAGE_KEYS.SENSITIVITY, AUDIO_SETTINGS.DEFAULT_SENSITIVITY)
  );
  const [minConfidence, setMinConfidence] = useState<number>(() => 
    loadFromStorage(STORAGE_KEYS.MIN_CONFIDENCE, SCRIPTURE_DETECTION.MIN_CONFIDENCE * 100)
  );
  const [maxReferences, setMaxReferences] = useState<number>(() => 
    loadFromStorage(STORAGE_KEYS.MAX_REFERENCES, SCRIPTURE_DETECTION.MAX_MATCHES)
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem('hoptranscribe_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => { saveToStorage(STORAGE_KEYS.SELECTED_DEVICE, selectedDevice); }, [selectedDevice]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.BIBLE_VERSION, bibleVersion); }, [bibleVersion]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CUSTOM_VERSIONS, customVersions); }, [customVersions]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PRIMARY_LANGUAGE, primaryLanguage); }, [primaryLanguage]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CUSTOM_LANGUAGES, customLanguages); }, [customLanguages]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.AUTO_SCROLL, autoScroll); }, [autoScroll]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SHOW_CONFIDENCE, showConfidence); }, [showConfidence]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SENSITIVITY, sensitivity); }, [sensitivity]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.MIN_CONFIDENCE, minConfidence); }, [minConfidence]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.MAX_REFERENCES, maxReferences); }, [maxReferences]);

  const handleToggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('hoptranscribe_theme', newTheme);
  };

  return (
    <Layout 
      theme={theme} 
      onToggleTheme={handleToggleTheme}
      selectedDevice={selectedDevice}
      onDeviceChange={setSelectedDevice}
      bibleVersion={bibleVersion}
      onBibleVersionChange={setBibleVersion}
      customVersions={customVersions}
      onCustomVersionsChange={setCustomVersions}
      primaryLanguage={primaryLanguage}
      onPrimaryLanguageChange={setPrimaryLanguage}
      customLanguages={customLanguages}
      onCustomLanguagesChange={setCustomLanguages}
      autoScroll={autoScroll}
      onAutoScrollChange={setAutoScroll}
      showConfidence={showConfidence}
      onShowConfidenceChange={setShowConfidence}
      sensitivity={sensitivity}
      onSensitivityChange={setSensitivity}
      minConfidence={minConfidence}
      onMinConfidenceChange={setMinConfidence}
      maxReferences={maxReferences}
      onMaxReferencesChange={setMaxReferences}
    >
      <TranscriptionPage 
        selectedDevice={selectedDevice}
        bibleVersion={bibleVersion}
        primaryLanguage={primaryLanguage}
        minConfidence={minConfidence}
        maxReferences={maxReferences}
      />
    </Layout>
  );
}

