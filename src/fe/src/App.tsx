import { useEffect } from 'react';
import { TranscriptionPage } from './pages/TranscriptionPage';
import { startConsoleInterception } from './utils/consoleInterceptor';

export default function App() {
  useEffect(() => {
    startConsoleInterception();
  }, []);
  
  return <TranscriptionPage />;
}

