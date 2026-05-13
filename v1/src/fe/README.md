# HOPTranscribe Frontend

React + TypeScript + Vite application for real-time sermon transcription.

---

## Recent Updates

### Task 1.2: Audio Capture (✅ Complete - Oct 21, 2025)

Implemented microphone access with clean separation of concerns:

**Files:**
- `services/mediaService.ts` - Browser Media API handling
- `hooks/useMediaRecorder.ts` - React state management hook
- `components/StatusBar.tsx` - Integrated with existing UI (uses hook internally)
- `types/media.ts` - TypeScript definitions

**Audio Config (OpenAI Realtime API):**
- Mono channel (1)
- 24kHz sample rate
- Echo cancellation, noise suppression, auto-gain enabled

**Integration:**
```tsx
// StatusBar component uses useMediaRecorder internally
// Exposes callbacks to parent component
<StatusBar 
  onStreamChange={setAudioStream}      // MediaStream for WebRTC
  onRecordingChange={setIsRecording}   // Boolean state for UI
/>
```

---

## Project Structure

```
src/
├── components/     # UI components
├── hooks/         # Custom React hooks
├── services/      # API and browser APIs
├── types/         # TypeScript types
└── utils/         # Helper functions
```

---

## Development Standards

See `/.github/agents.md` for:
- Service/Hook/Component separation
- TypeScript patterns
- Project organization

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
