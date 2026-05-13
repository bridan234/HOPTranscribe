# HOPTranscribe Architecture

**Project**: Real-time Audio Transcription with AI-Powered Scripture Reference Detection  
**Version**: 1.0  
**Date**: October 21, 2025  
**Architecture Pattern**: Frontend-First with Optional Backend Persistence

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Technology Stack](#technology-stack)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [OpenAI Realtime API Integration](#openai-realtime-api-integration)
8. [Scripture Detection System](#scripture-detection-system)
9. [Data Flow](#data-flow)
10. [Security Considerations](#security-considerations)
11. [Deployment Strategy](#deployment-strategy)
12. [Development Roadmap](#development-roadmap)
13. [Cost Analysis](#cost-analysis)
14. [Performance Optimization](#performance-optimization)
15. [Testing Strategy](#testing-strategy)

---

## Executive Summary

HOPTranscribe is a real-time transcription application designed for religious services (sermons, Bible studies, etc.) that automatically detects and enriches scripture references as they're spoken. 

**Key Innovation**: Direct frontend-to-OpenAI streaming eliminates traditional backend audio processing, reducing latency to ~320ms and simplifying architecture.

**Primary Use Case**: Pastor preaches → Audio captured in browser → OpenAI Realtime API transcribes + detects references → Scripture cards appear in real-time

**Backend Role**: Optional persistence layer for sermon history, analytics, and export features. NOT required for real-time processing.

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │ MediaRecorder│───▶│  WebSocket   │───▶│  UI State    │ │
│  │  (Audio)     │    │  Connection  │    │  Management  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         │                    ▼                    ▼         │
│         │           ┌──────────────┐    ┌──────────────┐  │
│         │           │ OpenAI Keys  │    │  Scripture   │  │
│         │           │ (Env Vars)   │    │  UI Cards    │  │
│         │           └──────────────┘    └──────────────┘  │
│         │                                         │         │
│         │                                         ▼         │
│         │                                ┌──────────────┐  │
│         │                                │  IndexedDB   │  │
│         │                                │ (Bible Cache)│  │
│         │                                └──────────────┘  │
│         │                                         │         │
└─────────┼─────────────────────────────────────────┼─────────┘
          │                                         │
          ▼                                         │
┌──────────────────────┐                           │
│  OpenAI Realtime API │                           │
│  (WebSocket Server)  │                           │
│                      │                           │
│  • Audio Input       │                           │
│  • Transcription     │                           │
│  • Function Calling  │                           │
│  • Text Output       │                           │
└──────────────────────┘                           │
                                                    │
          Optional Backend Features ────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (.NET 9 API)                        │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Sermon     │    │  Analytics   │    │   Export     │ │
│  │   Storage    │    │  Tracking    │    │   (PDF/TXT)  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         └────────────────────┴────────────────────┘         │
│                              │                               │
│                              ▼                               │
│                     ┌──────────────┐                        │
│                     │  PostgreSQL  │                        │
│                     │   Database   │                        │
│                     └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Core Flow

1. **Audio Capture**: MediaRecorder API captures microphone input in browser
2. **Streaming**: WebSocket connection sends audio chunks to OpenAI Realtime API
3. **Processing**: OpenAI transcribes audio and calls custom functions when detecting scripture patterns
4. **Display**: React components render transcription + scripture cards in real-time
5. **Persistence**: (Optional) Backend stores completed sermons for history/analytics

---

## Architecture Principles

### 1. Frontend-First Philosophy
- **Real-time processing happens entirely in browser**
- Backend is optional enhancement, not critical path
- Enables offline-first capabilities (with cached Bible data)
- Reduces infrastructure complexity and maintenance

### 2. Cost-Latency Trade-off
- **Chosen**: OpenAI Realtime API (~$180/month for 10 hours of sermons)
- **Alternative**: Traditional pipeline (Whisper API ~$14/month) with higher latency
- **Justification**: User experience (320ms vs 2-5s delay) worth premium cost for live sermons

### 3. Separation of Concerns
- **Frontend**: Real-time streaming, UI state, Bible verse rendering
- **Backend**: Persistence, analytics, export, user management
- **OpenAI**: Transcription, entity extraction, function calling

### 4. Progressive Enhancement
- **Tier 1**: Core functionality works without backend (transcription + scripture detection)
- **Tier 2**: Backend adds sermon history and analytics
- **Tier 3**: Backend adds multi-user support and advanced features

---

## Technology Stack

### Frontend
```json
{
  "runtime": "React 18.2 + TypeScript",
  "buildTool": "Vite 4.4",
  "styling": "Tailwind CSS 3.4.13",
  "components": "shadcn/ui (Radix UI primitives)",
  "stateManagement": "React hooks (useState, useEffect, useContext)",
  "audioCapture": "MediaRecorder API (native browser)",
  "networking": "WebSocket (native browser)",
  "storage": "IndexedDB (for Bible verse caching)",
  "icons": "lucide-react",
  "notifications": "sonner"
}
```

### Backend
```json
{
  "runtime": ".NET 9",
  "database": "PostgreSQL 16",
  "orm": "Entity Framework Core",
  "api": "ASP.NET Core Web API",
  "authentication": "JWT (future)",
  "cors": "Configured for http://localhost:5173"
}
```

### AI Services
```json
{
  "transcription": "OpenAI Realtime API (gpt-4o-realtime-preview)",
  "protocol": "WebSocket (wss://api.openai.com/v1/realtime)",
  "features": [
    "Voice Activity Detection (VAD)",
    "Function calling",
    "Real-time transcription",
    "Configurable voice/instructions"
  ],
  "latency": "~320ms average",
  "pricing": "$0.06/min audio input + $0.24/min audio output"
}
```

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── App.tsx                          # Root component
│   ├── TranscriptionPanel.tsx           # Live transcription display
│   ├── ScriptureReferences.tsx          # Detected scripture cards
│   ├── SettingsPanel.tsx                # User preferences
│   ├── StatusBar.tsx                    # Connection status
│   └── ui/                              # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       └── ...
├── hooks/
│   ├── useRealtimeAudio.ts             # OpenAI WebSocket hook
│   ├── useBibleVerses.ts               # IndexedDB Bible cache
│   └── useSermonRecording.ts           # Recording state management
├── lib/
│   ├── openai-client.ts                # WebSocket connection manager
│   ├── bible-data.ts                   # Bible verse lookup utilities
│   └── scripture-parser.ts             # Reference parsing logic
├── types/
│   ├── openai.types.ts                 # OpenAI API types
│   ├── scripture.types.ts              # Scripture reference types
│   └── sermon.types.ts                 # Sermon data types
└── data/
    └── bible-kjv.json                  # Preloaded Bible text (optional)
```

### Key Hooks

#### `useRealtimeAudio.ts`
```typescript
interface UseRealtimeAudioReturn {
  isConnected: boolean;
  isRecording: boolean;
  transcript: string;
  detectedReferences: ScriptureReference[];
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: Error | null;
}

export function useRealtimeAudio(): UseRealtimeAudioReturn {
  // 1. Establish WebSocket connection to OpenAI
  // 2. Configure session with function calling
  // 3. Capture audio via MediaRecorder
  // 4. Stream audio chunks to OpenAI
  // 5. Handle transcription events
  // 6. Handle function_call events for scripture detection
  // 7. Return state and controls
}
```

#### `useBibleVerses.ts`
```typescript
interface UseBibleVersesReturn {
  getVerse: (book: string, chapter: number, verse: number, version: string) => Promise<string>;
  preloadBible: (version: string) => Promise<void>;
  isLoaded: boolean;
}

export function useBibleVerses(): UseBibleVersesReturn {
  // 1. Check IndexedDB for cached Bible data
  // 2. If not cached, fetch from backend or static JSON
  // 3. Store in IndexedDB for offline access
  // 4. Provide fast verse lookup
}
```

### State Management

```typescript
// Global app state (React Context)
interface AppState {
  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  
  // Transcription state
  currentTranscript: string;
  finalTranscript: string;
  
  // Scripture detection
  detectedReferences: ScriptureReference[];
  enrichedReferences: EnrichedReference[]; // with verse text
  
  // User preferences
  settings: {
    bibleVersion: 'KJV' | 'NIV' | 'ESV';
    autoScroll: boolean;
    showConfidence: boolean;
    saveToBackend: boolean;
  };
  
  // Connection state
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  // Sermon metadata
  currentSermon: {
    id: string;
    title: string;
    speaker: string;
    date: Date;
    duration: number;
  } | null;
}
```

---

## Backend Architecture

### Purpose
The backend is **optional** for core functionality. It provides:
1. **Persistence**: Store sermon transcripts and metadata
2. **Analytics**: Track sermon statistics, scripture usage frequency
3. **Export**: Generate PDF/Word documents with formatted transcripts
4. **Multi-user**: (Future) User accounts and shared sermon libraries
5. **Enrichment**: (Future) Additional AI features like sermon summaries

### API Endpoints

```csharp
// Sermon Management
POST   /api/sermons                    // Create new sermon
GET    /api/sermons                    // List all sermons
GET    /api/sermons/{id}               // Get sermon details
PUT    /api/sermons/{id}               // Update sermon
DELETE /api/sermons/{id}               // Delete sermon

// Scripture Analytics
GET    /api/analytics/scriptures       // Most referenced verses
GET    /api/analytics/books            // Most referenced books
GET    /api/analytics/speakers         // Speaker statistics

// Export
GET    /api/export/pdf/{sermonId}      // Download sermon as PDF
GET    /api/export/docx/{sermonId}     // Download sermon as Word doc
GET    /api/export/txt/{sermonId}      // Download sermon as plain text

// Health
GET    /health                         // Health check
```

### Database Schema

```sql
-- Sermons table
CREATE TABLE sermons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(255),
    date TIMESTAMP NOT NULL,
    duration_seconds INT NOT NULL,
    transcript TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scripture references table
CREATE TABLE scripture_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sermon_id UUID REFERENCES sermons(id) ON DELETE CASCADE,
    book VARCHAR(50) NOT NULL,
    chapter INT NOT NULL,
    verse_start INT NOT NULL,
    verse_end INT,
    version VARCHAR(10) DEFAULT 'KJV',
    confidence DECIMAL(3,2), -- 0.00 to 1.00
    timestamp_seconds INT NOT NULL, -- when mentioned in sermon
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics cache (for performance)
CREATE TABLE scripture_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., "John 3:16"
    mention_count INT DEFAULT 1,
    last_mentioned TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sermons_date ON sermons(date DESC);
CREATE INDEX idx_references_sermon ON scripture_references(sermon_id);
CREATE INDEX idx_references_book ON scripture_references(book, chapter, verse_start);
CREATE INDEX idx_stats_count ON scripture_stats(mention_count DESC);
```

---

## OpenAI Realtime API Integration

### Connection Options

#### Option A: WebRTC (Recommended - More Secure)

```typescript
// 1. Get ephemeral token from backend
const response = await fetch('/api/openai/session', {
  method: 'POST'
});
const { client_secret } = await response.json();

// 2. Create RTCPeerConnection
const pc = new RTCPeerConnection();

// 3. Add microphone audio track
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    channelCount: 1,
    sampleRate: 24000,
    echoCancellation: true,
    noiseSuppression: true
  } 
});
pc.addTrack(stream.getAudioTracks()[0], stream);

// 4. Create data channel for events
const dc = pc.createDataChannel('oai-events');

dc.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);
  
  if (event.type === 'response.audio_transcript.done') {
    setTranscript(prev => prev + ' ' + event.transcript);
  }
  
  if (event.type === 'response.function_call_arguments.done') {
    const reference = JSON.parse(event.arguments);
    handleScriptureDetection(reference);
  }
});

// 5. Create offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// 6. Send offer to OpenAI
const sdpResponse = await fetch(
  'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${client_secret}`,
      'Content-Type': 'application/sdp'
    },
    body: offer.sdp
  }
);

// 7. Set remote description
const answer = await sdpResponse.text();
await pc.setRemoteDescription({
  type: 'answer',
  sdp: answer
});

// 8. Send session configuration via data channel
dc.send(JSON.stringify({
  type: 'session.update',
  session: {
    instructions: 'Transcribe sermon and detect scripture references',
    tools: [scriptureDetectionTool],
    turn_detection: { type: 'server_vad' }
  }
}));
```

**Backend endpoint for ephemeral tokens**:
```csharp
[HttpPost("api/openai/session")]
public async Task<IActionResult> CreateRealtimeSession()
{
    var client = new HttpClient();
    var response = await client.PostAsync(
        "https://api.openai.com/v1/realtime/sessions",
        new StringContent("{\"model\":\"gpt-4o-realtime-preview-2024-10-01\"}", 
            Encoding.UTF8, 
            "application/json"),
        new Dictionary<string, string> {
            { "Authorization", $"Bearer {_config.OpenAIApiKey}" }
        }
    );
    
    var session = await response.Content.ReadAsStringAsync();
    return Ok(session); // Contains client_secret (expires in 60s)
}
```

#### Option B: WebSocket (Simpler, Less Secure)

```typescript
// 1. Initialize WebSocket connection
const ws = new WebSocket(
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
  {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  }
);

// 2. Configure session with function calling
ws.send(JSON.stringify({
  type: 'session.update',
  session: {
    modalities: ['text', 'audio'],
    instructions: `You are transcribing a religious sermon. 
      When you detect scripture references (e.g., "John 3:16", "First Corinthians chapter 13"),
      call the detect_scripture function with the book, chapter, and verse numbers.
      Continue transcribing naturally.`,
    voice: 'alloy',
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
    input_audio_transcription: {
      model: 'whisper-1'
    },
    turn_detection: {
      type: 'server_vad', // Voice Activity Detection
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    },
    tools: [
      {
        type: 'function',
        name: 'detect_scripture',
        description: 'Call this when a Bible verse reference is mentioned',
        parameters: {
          type: 'object',
          properties: {
            book: { type: 'string', description: 'Bible book name (e.g., John, Genesis)' },
            chapter: { type: 'integer', description: 'Chapter number' },
            verse_start: { type: 'integer', description: 'Starting verse number' },
            verse_end: { type: 'integer', description: 'Ending verse number (if range)' },
            version: { type: 'string', enum: ['KJV', 'NIV', 'ESV'], default: 'KJV' }
          },
          required: ['book', 'chapter', 'verse_start']
        }
      }
    ],
    tool_choice: 'auto'
  }
}));

// 3. Start audio capture
const mediaStream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    channelCount: 1,
    sampleRate: 24000,
    echoCancellation: true,
    noiseSuppression: true
  } 
});

const mediaRecorder = new MediaRecorder(mediaStream, {
  mimeType: 'audio/webm;codecs=opus'
});

// 4. Send audio chunks to OpenAI
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = btoa(
        new Uint8Array(reader.result as ArrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio
      }));
    };
    reader.readAsArrayBuffer(event.data);
  }
};

mediaRecorder.start(100); // Send chunks every 100ms
```

### Comparison: WebRTC vs WebSocket

| Feature | WebRTC | WebSocket |
|---------|--------|-----------|
| **API Key Security** | ✅ Backend only (ephemeral tokens) | ⚠️ Exposed in browser |
| **Latency** | ~200ms | ~320ms |
| **Audio Quality** | ✅ Native tracks | Base64-encoded |
| **Setup Complexity** | Medium | Simple |
| **Network Resilience** | ✅ Built-in (STUN/TURN) | Manual retry |
| **Browser Support** | Modern browsers | Universal |
| **Recommended For** | Production | Prototyping |

### Event Handling (WebSocket)

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    // Transcription events
    case 'conversation.item.input_audio_transcription.completed':
      // Update UI with transcribed text
      setTranscript(prev => prev + ' ' + message.transcript);
      break;
    
    // Function calling events
    case 'response.function_call_arguments.done':
      // Scripture reference detected
      const reference = JSON.parse(message.arguments);
      handleScriptureDetection(reference);
      break;
    
    // Error handling
    case 'error':
      console.error('OpenAI error:', message.error);
      setError(message.error);
      break;
    
    // Session events
    case 'session.created':
      console.log('OpenAI session created');
      setConnectionStatus('connected');
      break;
  }
};
```

### Function Calling Response

When OpenAI detects a scripture reference, it sends:

```json
{
  "type": "response.function_call_arguments.done",
  "event_id": "event_abc123",
  "response_id": "resp_xyz789",
  "item_id": "item_456",
  "output_index": 0,
  "call_id": "call_789",
  "name": "detect_scripture",
  "arguments": "{\"book\":\"John\",\"chapter\":3,\"verse_start\":16,\"version\":\"KJV\"}"
}
```

Frontend then:
1. Parses the arguments
2. Looks up verse text from IndexedDB or backend
3. Displays scripture card in UI
4. (Optional) Sends to backend for persistence

---

## Scripture Detection System

### Detection Strategies

#### 1. OpenAI Function Calling (Primary)
- **Mechanism**: LLM trained to recognize scripture references in natural language
- **Advantages**: Handles variations ("John chapter 3 verse 16", "third chapter of John")
- **Accuracy**: ~95% for explicit references
- **Latency**: Real-time (part of transcription)

#### 2. Regex Fallback (Secondary)
```typescript
const scripturePatterns = [
  // "John 3:16"
  /\b([1-3]?\s*[A-Z][a-z]+)\s+(\d+):(\d+)(?:-(\d+))?\b/g,
  
  // "First Corinthians chapter 13"
  /\b(First|Second|Third|1|2|3)?\s*([A-Z][a-z]+)\s+chapter\s+(\d+)(?:\s+verse\s+(\d+)(?:\s*(?:to|through|-)\s*(\d+))?)?\b/gi,
  
  // "Genesis chapter 1 verses 1 through 3"
  /\b([A-Z][a-z]+)\s+chapter\s+(\d+)\s+verses?\s+(\d+)\s+(?:to|through|-)\s+(\d+)\b/gi
];
```

### Scripture Enrichment

```typescript
interface ScriptureReference {
  book: string;          // "John"
  chapter: number;       // 3
  verseStart: number;    // 16
  verseEnd?: number;     // 17 (if range)
  version: string;       // "KJV"
  confidence?: number;   // 0.95 (if from AI)
  timestamp: number;     // seconds into sermon
}

interface EnrichedReference extends ScriptureReference {
  verseText: string;     // "For God so loved the world..."
  context?: string;      // Surrounding verses for context
  bookFullName: string;  // "The Gospel According to John"
}

async function enrichReference(ref: ScriptureReference): Promise<EnrichedReference> {
  // 1. Normalize book name (handle variations)
  const normalizedBook = normalizeBookName(ref.book);
  
  // 2. Fetch verse text from IndexedDB
  const verseText = await bibleDB.getVerse(
    normalizedBook,
    ref.chapter,
    ref.verseStart,
    ref.version
  );
  
  // 3. Optionally fetch surrounding context
  const context = await bibleDB.getVerseRange(
    normalizedBook,
    ref.chapter,
    ref.verseStart - 1,
    ref.verseEnd ? ref.verseEnd + 1 : ref.verseStart + 1,
    ref.version
  );
  
  return {
    ...ref,
    verseText,
    context,
    bookFullName: getFullBookName(normalizedBook)
  };
}
```

### Bible Book Normalization

```typescript
const bookAliases: Record<string, string> = {
  // Variations to canonical name
  'gen': 'Genesis',
  'genesis': 'Genesis',
  'exo': 'Exodus',
  'exodus': 'Exodus',
  'lev': 'Leviticus',
  'leviticus': 'Leviticus',
  // ...
  'john': 'John',
  '1 john': '1 John',
  'first john': '1 John',
  '1john': '1 John',
  '2 john': '2 John',
  'second john': '2 John',
  // ...
  'rev': 'Revelation',
  'revelation': 'Revelation',
  'revelations': 'Revelation' // common mistake
};

function normalizeBookName(input: string): string {
  const normalized = input.toLowerCase().trim();
  return bookAliases[normalized] || input;
}
```

---

## Data Flow

### Real-time Transcription Flow

```
User speaks into microphone
         │
         ▼
MediaRecorder captures audio
         │
         ▼
Audio chunks encoded to base64
         │
         ▼
WebSocket sends to OpenAI
         │
         ▼
OpenAI Realtime API processes
    ┌────┴────┐
    │         │
    ▼         ▼
Transcription  Function Call (scripture detected)
    │         │
    ▼         ▼
Update       Parse reference
transcript   │
UI           ▼
             Lookup verse in IndexedDB
             │
             ▼
             Display scripture card
             │
             ▼
             (Optional) Send to backend for persistence
```

### Sermon Save Flow (Backend Persistence)

```
User clicks "Save Sermon"
         │
         ▼
Frontend prepares payload:
{
  title: "Sunday Morning Service",
  speaker: "Pastor John",
  date: "2025-10-21T10:00:00Z",
  duration: 3600,
  transcript: "Full transcription text...",
  references: [
    { book: "John", chapter: 3, verse: 16, timestamp: 120 },
    { book: "Romans", chapter: 8, verse: 28, timestamp: 450 }
  ]
}
         │
         ▼
POST /api/sermons
         │
         ▼
Backend validates data
         │
         ▼
Save sermon to PostgreSQL
         │
         ▼
Save references to scripture_references table
         │
         ▼
Update analytics (scripture_stats)
         │
         ▼
Return sermon ID to frontend
         │
         ▼
Frontend shows success notification
```

---

## Security Considerations

### API Key Management

**Frontend (.env.local)**
```bash
# Backend API URL only (no OpenAI key exposure with WebRTC)
VITE_API_URL=http://localhost:5000

# DEPRECATED: Only for WebSocket approach
# VITE_OPENAI_API_KEY=sk-proj-xxx
```

✅ **WebRTC Approach (Recommended)**:
- Backend creates ephemeral tokens (expire in 60 seconds)
- Frontend never sees actual API key
- Each session gets unique token
- No key rotation needed

⚠️ **WebSocket Approach (Quick Prototyping)**:
- API key exposed in browser
- Use key rotation monthly
- Set OpenAI budget alerts
- Implement rate limiting

**Backend (.env)**
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hoptranscribe

# JWT secret (future)
JWT_SECRET=your-secret-key

# OpenAI (if proxying requests)
OPENAI_API_KEY=sk-xxx
```

### CORS Configuration

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://yourdomain.com")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

app.UseCors("AllowFrontend");
```

### Data Privacy

1. **Audio is NOT stored**: Audio streams to OpenAI and is discarded
2. **Transcripts stored locally**: User controls backend saving
3. **No PII collection**: No user data beyond sermon metadata
4. **OpenAI policy**: Audio used for transcription only (not training)

---

## Deployment Strategy

### Frontend Deployment

**Option 1: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd src/fe
vercel --prod
```

**Option 2: Netlify**
```bash
# Build
npm run build

# Deploy dist/ folder to Netlify
```

**Environment Variables** (Production):
```bash
VITE_OPENAI_API_KEY=sk-proj-xxx
VITE_API_URL=https://api.yourdomain.com
```

### Backend Deployment

**Option 1: Railway**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
cd src/be
railway login
railway init
railway up
```

**Option 2: Azure App Service**
```bash
# Publish to Azure
dotnet publish -c Release
az webapp deploy --name hoptranscribe-api --resource-group YourResourceGroup --src-path ./bin/Release/net9.0/publish
```

**Database**: PostgreSQL on Railway, Supabase, or Azure Database

### Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                          │
│                                                              │
│  Frontend (React App)                                        │
│  https://hoptranscribe.vercel.app                           │
└───────────────┬────────────────────────────┬─────────────────┘
                │                            │
                │ WebSocket                  │ HTTPS (optional)
                │                            │
                ▼                            ▼
┌──────────────────────┐         ┌──────────────────────┐
│  OpenAI Realtime API │         │  Backend API         │
│  (Production)        │         │  (Railway/Azure)     │
│                      │         │                      │
│  wss://api.openai    │         │  https://api.domain  │
│  .com/v1/realtime    │         │  .com                │
└──────────────────────┘         └──────────┬───────────┘
                                            │
                                            ▼
                                 ┌──────────────────────┐
                                 │  PostgreSQL Database │
                                 │  (Railway/Supabase)  │
                                 └──────────────────────┘
```

---

## Development Roadmap

### Phase 1: Core Real-time Transcription (Week 1)
- [ ] Implement `useRealtimeAudio` hook
- [ ] Set up WebSocket connection to OpenAI
- [ ] Configure MediaRecorder for audio capture
- [ ] Display live transcription in UI
- [ ] Add start/stop recording controls
- [ ] Handle connection errors gracefully

**Deliverable**: User can speak and see transcription appear in real-time

### Phase 2: Scripture Detection (Week 2)
- [ ] Configure OpenAI function calling for scripture detection
- [ ] Implement scripture reference parsing
- [ ] Create `useBibleVerses` hook with IndexedDB
- [ ] Preload KJV Bible JSON into IndexedDB
- [ ] Display detected scripture references as cards
- [ ] Add verse text lookup and display

**Deliverable**: Scripture references automatically detected and displayed with verse text

### Phase 3: UI Polish (Week 3)
- [ ] Implement settings panel (Bible version, auto-scroll)
- [ ] Add status bar (connection status, recording duration)
- [ ] Create scripture card interactions (expand/collapse, copy text)
- [ ] Add transcript export (plain text, JSON)
- [ ] Implement dark mode support
- [ ] Add keyboard shortcuts

**Deliverable**: Production-quality user experience

### Phase 4: Backend Integration (Week 4)
- [ ] Implement sermon storage endpoints
- [ ] Create sermon history view
- [ ] Add sermon metadata editing
- [ ] Implement PDF export
- [ ] Add analytics dashboard (most referenced verses)
- [ ] Create sermon search functionality

**Deliverable**: Persistent sermon library with analytics

### Phase 5: Production Hardening (Week 5)
- [ ] Add error boundaries and retry logic
- [ ] Implement connection status indicators
- [ ] Add audio quality warnings
- [ ] Create onboarding tutorial
- [ ] Write comprehensive documentation
- [ ] Deploy to production (Vercel + Railway)
- [ ] Set up monitoring and alerts

**Deliverable**: Production-ready application

---

## Cost Analysis

### OpenAI Realtime API Pricing

**Rates**:
- Input audio: **$100 per 1M tokens** = **$0.06 per minute**
- Output audio: **$200 per 1M tokens** = **$0.24 per minute**
- Text input: $5 per 1M tokens
- Text output: $20 per 1M tokens

**Monthly Cost Estimates** (assuming 10 hours of sermons per month):

| Usage Scenario | Input Cost | Output Cost | Total/Month |
|---------------|------------|-------------|-------------|
| Transcription only (no audio output) | $36 | $0 | **$36** |
| With audio playback feedback | $36 | $144 | **$180** |
| 20 hours/month | $72 | $288 | **$360** |

**Cost Optimization**:
1. Disable audio output (text-only mode) → **$36/month**
2. Use text-based responses for scripture detection (no audio) → **$40/month**
3. Implement session length limits (e.g., 1-hour max recording)

### Traditional Pipeline Comparison (Alternative)

**Whisper API + GPT-4 + Embeddings**:
- Whisper: $0.006/minute = $3.60 for 10 hours
- GPT-4: ~$10/month for scripture detection (100K tokens)
- Total: **~$14/month** (BUT: 2-5 second latency, more complexity)

**Trade-off Summary**:
- **Realtime API**: $36-180/month, 320ms latency, simpler architecture
- **Traditional**: $14/month, 2-5s latency, requires backend audio processing

**Recommendation**: Start with Realtime API for best UX, consider cost optimization later if budget constrained.

### Infrastructure Costs

| Service | Cost | Notes |
|---------|------|-------|
| Frontend (Vercel) | Free | Hobby tier sufficient |
| Backend (Railway) | $5/month | Starter plan |
| Database (Railway) | Included | 1GB storage |
| Total Infrastructure | **$5/month** | |

**Grand Total**: $41-185/month depending on audio output configuration

---

## Performance Optimization

### Audio Streaming Optimization

```typescript
// Use appropriate chunk size for balance between latency and overhead
const CHUNK_DURATION_MS = 100; // 100ms chunks
mediaRecorder.start(CHUNK_DURATION_MS);

// Compress audio before sending
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(mediaStream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);

processor.onaudioprocess = (e) => {
  const inputData = e.inputBuffer.getChannelData(0);
  // Apply noise gate to reduce silence transmission
  const filtered = applyNoiseGate(inputData, threshold: -40);
  sendToOpenAI(filtered);
};
```

### IndexedDB Caching Strategy

```typescript
// Preload entire Bible on first use (one-time ~5MB download)
async function preloadBible(version: string) {
  const db = await openDB('BibleCache', 1);
  
  // Check if already loaded
  const exists = await db.count('verses', version);
  if (exists > 0) return;
  
  // Fetch and store
  const response = await fetch(`/data/bible-${version}.json`);
  const bible = await response.json();
  
  const tx = db.transaction('verses', 'readwrite');
  for (const verse of bible) {
    await tx.store.put({
      version,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text
    });
  }
  await tx.done;
}

// Ultra-fast verse lookup (no network needed)
async function getVerse(book: string, chapter: number, verse: number, version: string) {
  const db = await openDB('BibleCache', 1);
  return db.get('verses', [version, book, chapter, verse]);
}
```

### UI Rendering Optimization

```typescript
// Virtualize long transcripts
import { useVirtualizer } from '@tanstack/react-virtual';

function TranscriptionPanel({ transcript }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const sentences = transcript.split(/[.!?]+/);
  
  const virtualizer = useVirtualizer({
    count: sentences.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated height per sentence
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(item => (
          <div key={item.key} style={{ transform: `translateY(${item.start}px)` }}>
            {sentences[item.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Testing Strategy

### Frontend Testing

**Unit Tests** (Vitest + React Testing Library):
```typescript
// hooks/useRealtimeAudio.test.ts
describe('useRealtimeAudio', () => {
  it('should establish WebSocket connection', async () => {
    const { result } = renderHook(() => useRealtimeAudio());
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isConnected).toBe(true);
  });
  
  it('should detect scripture references from function calls', () => {
    // Mock OpenAI function_call event
    // Assert scripture reference added to state
  });
});
```

**Integration Tests**:
```typescript
// App.test.tsx
describe('App Integration', () => {
  it('should transcribe audio and display scripture cards', async () => {
    render(<App />);
    
    // Mock MediaRecorder and WebSocket
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);
    
    // Simulate OpenAI transcript event
    mockWebSocket.emit('message', {
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: 'Today we look at John 3:16'
    });
    
    // Simulate function call event
    mockWebSocket.emit('message', {
      type: 'response.function_call_arguments.done',
      name: 'detect_scripture',
      arguments: '{"book":"John","chapter":3,"verse_start":16}'
    });
    
    // Assert UI updates
    expect(screen.getByText(/John 3:16/i)).toBeInTheDocument();
    expect(screen.getByText(/For God so loved/i)).toBeInTheDocument();
  });
});
```

### Backend Testing

**Unit Tests** (xUnit):
```csharp
[Fact]
public async Task CreateSermon_ShouldPersistToDatabase()
{
    // Arrange
    var sermon = new Sermon {
        Title = "Test Sermon",
        Speaker = "Test Speaker",
        Date = DateTime.UtcNow,
        Transcript = "Test transcript",
        References = new List<ScriptureReference> {
            new() { Book = "John", Chapter = 3, VerseStart = 16 }
        }
    };
    
    // Act
    var result = await _controller.CreateSermon(sermon);
    
    // Assert
    Assert.NotNull(result.Value.Id);
    var saved = await _dbContext.Sermons.FindAsync(result.Value.Id);
    Assert.Equal("Test Sermon", saved.Title);
}
```

**Integration Tests** (WebApplicationFactory):
```csharp
[Fact]
public async Task GetSermons_ShouldReturnAllSermons()
{
    // Arrange
    await SeedDatabase();
    
    // Act
    var response = await _client.GetAsync("/api/sermons");
    
    // Assert
    response.EnsureSuccessStatusCode();
    var sermons = await response.Content.ReadFromJsonAsync<List<Sermon>>();
    Assert.Equal(3, sermons.Count);
}
```

### End-to-End Testing

**Playwright**:
```typescript
test('complete sermon recording workflow', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Grant microphone permission
  await page.context().grantPermissions(['microphone']);
  
  // Start recording
  await page.click('button:has-text("Start Recording")');
  await expect(page.locator('.status-bar')).toContainText('Recording');
  
  // Wait for transcription to appear
  await expect(page.locator('.transcript-panel')).toContainText(/\w+/);
  
  // Check for scripture card
  await expect(page.locator('.scripture-card')).toBeVisible();
  
  // Stop and save
  await page.click('button:has-text("Stop")');
  await page.click('button:has-text("Save Sermon")');
  await expect(page.locator('.toast')).toContainText('Saved');
});
```

---

## Appendix

### Bible Book Reference

**Old Testament** (39 books):
```
Genesis, Exodus, Leviticus, Numbers, Deuteronomy
Joshua, Judges, Ruth, 1 Samuel, 2 Samuel, 1 Kings, 2 Kings
1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther
Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon
Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel
Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum
Habakkuk, Zephaniah, Haggai, Zechariah, Malachi
```

**New Testament** (27 books):
```
Matthew, Mark, Luke, John, Acts
Romans, 1 Corinthians, 2 Corinthians, Galatians, Ephesians
Philippians, Colossians, 1 Thessalonians, 2 Thessalonians
1 Timothy, 2 Timothy, Titus, Philemon
Hebrews, James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John
Jude, Revelation
```

### OpenAI Realtime API Reference

**Official Docs**: https://platform.openai.com/docs/guides/realtime

**WebSocket Endpoint**:
```
wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01
```

**Key Events**:
- `session.created`
- `session.updated`
- `input_audio_buffer.append`
- `input_audio_buffer.speech_started`
- `input_audio_buffer.speech_stopped`
- `conversation.item.created`
- `conversation.item.input_audio_transcription.completed`
- `response.created`
- `response.function_call_arguments.done`
- `response.done`
- `error`

**Rate Limits**:
- 100 requests per minute (RPM)
- 10,000 tokens per minute (TPM)

---

## Conclusion

This architecture provides a **simple, cost-effective, and high-performance** solution for real-time sermon transcription with AI-powered scripture detection.

**Key Advantages**:
1. ✅ **Low Latency**: ~320ms audio-to-transcription via OpenAI Realtime API
2. ✅ **Simple Architecture**: Frontend-first reduces backend complexity
3. ✅ **Offline Capable**: IndexedDB caching enables offline verse lookup
4. ✅ **Production Ready**: OpenAI Realtime API is GA (not experimental)
5. ✅ **Progressive Enhancement**: Core features work without backend

**Next Steps**:
1. Implement Phase 1 (WebSocket + MediaRecorder)
2. Test with real sermon audio
3. Iterate on scripture detection accuracy
4. Deploy MVP to production
5. Gather user feedback

**Questions to Resolve**:
- Preferred Bible version (KJV, NIV, ESV)?
- Backend persistence required for MVP or Phase 2?
- Budget constraint ($36/month vs $180/month)?
- Target deployment timeline?

---

**Document Version**: 1.0  
**Last Updated**: October 21, 2025  
**Author**: HOPTranscribe Development Team
