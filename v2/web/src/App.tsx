import { Toaster } from 'sonner';
import { TranscriptionPage } from './routes/TranscriptionPage';

export function App() {
  return (
    <>
      <TranscriptionPage />
      <Toaster richColors position="top-right" />
    </>
  );
}
