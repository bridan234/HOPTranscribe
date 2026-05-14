import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsProvider } from './hooks/useSettings';
import { TranscriptionPage } from './routes/TranscriptionPage';

export function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <TranscriptionPage />
        <Toaster richColors position="top-right" />
      </SettingsProvider>
    </ErrorBoundary>
  );
}
