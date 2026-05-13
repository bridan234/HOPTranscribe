# HOPTranscribe v2

**Sermon & Reference Assistant — v2.0 Rewrite Plan**

Real-time sermon transcription with AI-powered Bible scripture suggestions. Built with a split-stage realtime pipeline: dedicated streaming STT for speech and a separate text LLM for scripture matching.

> Status: **planning / scaffolding**. This README is the source of truth for the v2 rewrite. The v1 implementation lives in `../src/` (will be archived to `../v1/` during Phase 0).

---

## Table of contents

1. [Why a v2 rewrite](#1-why-a-v2-rewrite)
2. [What's changing from v1](#2-whats-changing-from-v1)
3. [Architecture](#3-architecture)
4. [Tech stack](#4-tech-stack)
5. [AI pipeline detail](#5-ai-pipeline-detail)
6. [Repository layout](#6-repository-layout)
7. [Configuration & environment variables](#7-configuration--environment-variables)
8. [API surface](#8-api-surface)
9. [Data model](#9-data-model)
10. [Decisions log](#10-decisions-log)
11. [Phased delivery plan](#11-phased-delivery-plan)
12. [Local development (target)](#12-local-development-target)
13. [Deployment](#13-deployment)
14. [Cost model](#14-cost-model)
15. [Out of scope for v2](#15-out-of-scope-for-v2)
16. [References](#16-references)

---

## 1. Why a v2 rewrite

The v1 implementation conflates **transcription** and **scripture matching** into a single OpenAI Realtime voice-agent call (`gpt-realtime-mini-2025-12-15`). That has four problems:

1. **Cost** — the realtime voice model bills audio input/output tokens at premium rates (~$32/M input audio tokens) for a workload that never uses voice output. We're paying for capabilities we never use.
2. **Latency** — the model "debates" between speaking, calling a tool, and staying silent, even though instructions explicitly forbid speaking. This adds latency vs. a dedicated STT model.
3. **Accuracy** — asking one model to (a) be a passive listener, (b) transcribe, AND (c) return exactly 3 ranked scripture matches mid-stream produces false positives and hallucinated quotes.
4. **Operational risk** — production currently runs `InMemorySessionService` (data lost on container restart), uses an "insecure-api-key" WebSocket subprotocol, has no auth on the SignalR hub, and contains a latent JSON-parsing bug (`jsonToParse` is undefined → the catch path always runs).

v2 splits the pipeline, swaps in a transcription-only model, moves matching server-side with structured outputs, and fixes the operational gaps.

## 2. What's changing from v1

| Area | v1 (today) | v2 (target) |
|---|---|---|
| STT model | `gpt-realtime-mini-2025-12-15` (voice agent) | **`gpt-realtime-whisper`** (streaming STT, $0.017/min) |
| Scripture matching | Same realtime model, function call mid-stream | **`gpt-5-mini`** (configurable) on finalized utterances, structured outputs, server-side |
| Voice TTS | Enabled (`voice = "marin"`) but never played | **Removed entirely** |
| Transport | WebSocket with `openai-insecure-api-key.<token>` subprotocol | **WebRTC** with ephemeral client_secret + SDP exchange |
| Auth | None | **JWT (HS256)** with per-session ownership |
| Persistence | `InMemorySessionService` in prod (data loss on restart) | **SQLite via EF Core**, mounted volume, single source of truth |
| Languages supported | 10 (English, Spanish, French, …) | **English only** for v2 (multi-lang deferred) |
| Scripture version handling | Preferred version only | **Best match across all versions, weighted toward preferred** |
| Backend → frontend tool schema | Drift (`reference/transcript/quote` vs `transcript/matches[]`) | Single source of truth in `Constants/Prompts.cs` |
| Dead code | `webrtcService.ts`, `SessionManager.tsx`, `sanitize-json` endpoint, `TranscriptionModel` constant | Gone — fresh rewrite under `v2/` |
| Deployment targets | Azure + AWS + GCP Terraform | **Azure Container Apps only** |
| Tests | None | xUnit (backend) + Vitest + RTL (frontend); CI gate per phase |

## 3. Architecture

### Diagram

```
┌──────────────────────── BROWSER (React 18 / Vite 4 / Tailwind 3 / shadcn) ────────────────────────┐
│                                                                                                    │
│  1. POST /api/auth/claim   { username }          ─────▶  JWT (HttpOnly cookie + CSRF token)        │
│  2. POST /api/sessions     { title, language }   ─────▶  { sessionCode, ownerToken }               │
│  3. POST /api/openai/transcription-session       ─────▶  { client_secret, sdp_url, model }         │
│  4. Establish WebRTC PeerConnection (RTCPeerConnection + RTCDataChannel "oai-events")              │
│     - pc.addTrack(micStream.audioTrack)                                                            │
│     - POST SDP offer to sdp_url with Bearer client_secret → answer SDP                             │
│     - dc.send( transcription_session.update { server_vad, language: "en", model: whisper } )      │
│                                                                                                    │
│  5. On 'conversation.item.input_audio_transcription.completed'                                     │
│     → POST /api/match { sessionCode, utterance, preferredVersion, n = 3 }                          │
│     → backend returns { matches[] }; SignalR fans out to viewers                                   │
│                                                                                                    │
│  6. UI: live transcript panel + scripture cards (reference, version, quote, confidence)            │
└────────────────┬──────────────────────────────────────────────────────────────┬────────────────────┘
                 │                                                              │
                 │ JWT-authed REST + SignalR                                    │ Ephemeral-authed WebRTC
                 ▼                                                              ▼
┌─────────────────── .NET 10 backend ──────────────────┐         ┌─────────── OpenAI APIs ───────────┐
│ AuthController       /api/auth/claim                  │         │ /v1/realtime/transcription_       │
│ SessionController    /api/sessions{,/{code},/end}     │         │   sessions    (gpt-realtime-      │
│ OpenAIController     /api/openai/transcription-       │         │                whisper)           │
│                      session                          │  ◀────  │ /v1/realtime/calls  (SDP)         │
│ MatchController      /api/match                       │         │ /v1/chat/completions             │
│ SessionHub           /sessionHub  [Authorize]         │  ────▶  │   (gpt-5-mini, json_schema)      │
│                                                       │         │                                   │
│ Services:                                             │         │                                   │
│   • JwtService                                        │         │                                   │
│   • OpenAIRealtimeService (mints ephemeral tokens)    │         │                                   │
│   • ScriptureMatchService (gpt-5-mini, structured)    │         │                                   │
│   • ScriptureValidator   (66-book catalog, ranges)    │         │                                   │
│   • SessionService       (EF Core / SQLite)           │         │                                   │
│   • RateLimiter          (per-session /api/match)     │         │                                   │
│                                                       │         │                                   │
│ EF Core 10 + SQLite (Docker volume /data/sessions.db) │         │                                   │
└───────────────────────────────────────────────────────┘         └───────────────────────────────────┘
```

### Data flow (recording session)

```
mic getUserMedia → WebRTC PeerConnection → gpt-realtime-whisper
                                              │
                                              │ transcript deltas (DataChannel)
                                              ▼
                                  TranscriptionPanel (live)
                                              │
                                              │ on `input_audio_transcription.completed`
                                              ▼
                                  POST /api/match (debounced + rate-limited)
                                              │
                                              ▼
                          ScriptureMatchService → gpt-5-mini (structured outputs)
                                              │
                                              ▼
                          ScriptureValidator (book ∈ canon, chapter/verse ranges)
                                              │
                                              ▼
                          Persist (SQLite) + SignalR broadcast to session group
                                              │
                                              ▼
                          UI renders ScriptureReferences cards
```

## 4. Tech stack

### Frontend
- **React 18.2** + TypeScript
- **Vite 4.4** (build)
- **Tailwind CSS 3.4** + **shadcn/ui** (Radix UI primitives)
- **@microsoft/signalr 9.0** (collaboration channel)
- **WebRTC** (native browser) for OpenAI Realtime
- **Vitest** + **React Testing Library** for tests
- **lucide-react** icons; **sonner** toasts

### Backend
- **.NET 10** / ASP.NET Core
- **EF Core 10** + **Microsoft.EntityFrameworkCore.Sqlite**
- **SignalR** (real-time fan-out to viewers)
- **Serilog** (console + file)
- **Microsoft.ApplicationInsights.AspNetCore** (when connection string present)
- **System.IdentityModel.Tokens.Jwt** for JWT issuance
- **xUnit** + **Microsoft.AspNetCore.Mvc.Testing** for tests

### AI services (OpenAI)
- **`gpt-realtime-whisper`** — streaming STT via `/v1/realtime/transcription_sessions` + WebRTC (`$0.017/min` audio).
- **`gpt-5-mini`** (configurable; falls back to `gpt-4o-mini`) — scripture matching via `/v1/chat/completions` with `response_format = json_schema` (text tokens only).

### Infrastructure
- **Docker Compose** for local dev
- **Azure Container Apps** for production (Terraform under `v2/infra/azure/`)
- **GitHub Actions** CI/CD

## 5. AI pipeline detail

### 5.1 Transcription (`gpt-realtime-whisper`)

- **Endpoint**: `POST https://api.openai.com/v1/realtime/transcription_sessions` returns `client_secret` (~60s TTL) + SDP exchange URL.
- **Transport**: WebRTC. Browser creates `RTCPeerConnection`, adds microphone audio track, opens an `RTCDataChannel('oai-events')`, POSTs SDP offer to OpenAI with `Authorization: Bearer <client_secret>`, sets answer as remote description.
- **Session config** (sent over the data channel after the connection opens):
  ```json
  {
    "type": "transcription_session.update",
    "input_audio_format": "pcm16",
    "input_audio_transcription": { "model": "gpt-realtime-whisper", "language": "en" },
    "turn_detection": { "type": "server_vad", "threshold": 0.5,
                        "prefix_padding_ms": 300, "silence_duration_ms": 500 }
  }
  ```
- **Events consumed**:
  - `conversation.item.input_audio_transcription.delta` → live partial text in UI
  - `conversation.item.input_audio_transcription.completed` → triggers a `/api/match` call
  - `error` → toast + reconnect with backoff
- **No audio output**: transcription-only model; no TTS modality enabled.

### 5.2 Scripture matching (`gpt-5-mini`)

Server-side only. Browser never sees the prompt or the verse-validation map.

**Request** (`POST /api/match`):
```jsonc
{
  "sessionCode": "abc123",
  "utterance": "For God so loved the world that he gave his only son",
  "preferredVersion": "NKJV",
  "n": 3
}
```

**System prompt** (lives in `Constants/Prompts.cs`):
> You are a Bible scripture matcher. Given an utterance from a sermon or Bible study, return up to N relevant scripture references. Rules:
> - Only include references from the canonical 66-book Protestant Bible.
> - **Best match across all versions, weighted toward the user's preferred version** when a comparable match exists. If a different version is a clearly better semantic match, return it and explain via confidence.
> - Quote text must be from the named version verbatim. If unsure of the exact wording, return a slightly lower confidence rather than fabricate.
> - If the utterance is not Bible-related, return an empty `matches` array.
> - `confidence` is your honest estimate the verse semantically matches the utterance (0.0–1.0).

**Structured output** (`response_format = { type: "json_schema", json_schema: { strict: true, schema: ... } }`):
```ts
{
  matches: Array<{
    reference: string;        // "John 3:16"
    book: string;             // canonical, e.g. "John"
    chapter: number;
    verseStart: number;
    verseEnd?: number;
    version: string;          // "NKJV", "ESV", ...
    quote: string;
    confidence: number;       // 0..1
  }>
}
```

**Validators** (`ScriptureValidator`):
1. `book ∈ BibleBookCatalog.CanonicalBooks` (66 entries).
2. `1 ≤ chapter ≤ BibleBookCatalog.MaxChapter[book]`.
3. `1 ≤ verseStart ≤ BibleBookCatalog.MaxVerse[book][chapter]`.
4. `verseEnd`, if set, must satisfy `verseStart ≤ verseEnd ≤ MaxVerse[book][chapter]`.
5. `version ∈ KnownVersions` (warn if unknown but don't reject).
6. Any failing match is dropped before persisting / broadcasting.

Verse-count map is embedded as a static JSON resource in the assembly (~80 KB; counts only, not verse text).

### 5.3 Configurable matching model

`appsettings.json`:
```json
"OpenAI": {
  "TranscriptionModel": "gpt-realtime-whisper",
  "MatchingModel": "gpt-5-mini",
  "MatchingFallbackModel": "gpt-4o-mini",
  "MatchingTemperature": 0.2,
  "MatchingMaxOutputTokens": 1200
}
```

If the configured `MatchingModel` returns a model-not-found error, `OpenAIRealtimeService` automatically retries once with `MatchingFallbackModel`.

### 5.4 Rate limiting

- Per session: max **30 `/api/match` calls/min** (sliding window).
- Per IP: max **120 `/api/match` calls/min** (anti-abuse).
- Implemented via `Microsoft.AspNetCore.RateLimiting` (`AddRateLimiter` in .NET 10).

## 6. Repository layout

```
HOPTranscribe/
├── v1/                              # archived current code (Phase 0)
├── v2/
│   ├── README.md                    # ← you are here
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── api/                         # .NET 10 backend
│   │   ├── HOPTranscribe.Api.csproj
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   ├── Dockerfile
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs
│   │   │   ├── SessionController.cs
│   │   │   ├── OpenAIController.cs
│   │   │   └── MatchController.cs
│   │   ├── Hubs/
│   │   │   └── SessionHub.cs
│   │   ├── Services/
│   │   │   ├── Auth/{IJwtService,JwtService}.cs
│   │   │   ├── OpenAI/{IOpenAIRealtimeService,OpenAIRealtimeService}.cs
│   │   │   ├── Matching/{IScriptureMatchService,ScriptureMatchService,ScriptureValidator}.cs
│   │   │   └── Sessions/{ISessionService,SqliteSessionService}.cs
│   │   ├── Data/
│   │   │   ├── HopDbContext.cs
│   │   │   ├── Entities/{Session,TranscriptSegment,ScriptureMatch}Entity.cs
│   │   │   └── Migrations/
│   │   ├── Models/
│   │   │   ├── Auth/{ClaimRequest,ClaimResponse}.cs
│   │   │   ├── Sessions/{CreateSessionRequest,SessionDto,UpdateSessionRequest}.cs
│   │   │   ├── OpenAI/{TranscriptionSessionRequest,TranscriptionSessionResponse}.cs
│   │   │   ├── Matching/{MatchRequest,MatchResponse,ScriptureMatch}.cs
│   │   │   └── Common/{ApiResponse,PaginatedResult}.cs
│   │   ├── Validation/
│   │   │   ├── BibleBookCatalog.cs
│   │   │   ├── BibleVerseCounts.json   (~80KB embedded resource)
│   │   │   └── ScriptureValidator.cs
│   │   ├── Constants/
│   │   │   ├── ApiConstants.cs
│   │   │   └── Prompts.cs
│   │   ├── Middleware/
│   │   │   ├── ExceptionHandlingMiddleware.cs
│   │   │   └── RequestLoggingMiddleware.cs
│   │   └── tests/
│   │       └── HOPTranscribe.Api.Tests/
│   │
│   ├── web/                         # React 18 + Vite 4
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   ├── public/
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── routes/
│   │       │   ├── HistoryPage.tsx
│   │       │   ├── SessionPage.tsx
│   │       │   └── TranscriptionPage.tsx
│   │       ├── components/
│   │       │   ├── TranscriptionPanel.tsx
│   │       │   ├── ScriptureReferences.tsx
│   │       │   ├── RecordingControls.tsx
│   │       │   ├── SessionView.tsx
│   │       │   ├── SettingsPanel.tsx
│   │       │   ├── StatusBar.tsx
│   │       │   └── ui/                   (shadcn primitives)
│   │       ├── hooks/
│   │       │   ├── useAuth.ts
│   │       │   ├── useRealtimeWebRTC.ts
│   │       │   ├── useScriptureMatcher.ts
│   │       │   ├── useSession.ts
│   │       │   └── useSignalR.ts
│   │       ├── services/
│   │       │   ├── apiClient.ts
│   │       │   ├── authService.ts
│   │       │   ├── webrtcService.ts
│   │       │   ├── signalRService.ts
│   │       │   └── sessionService.ts
│   │       ├── types/
│   │       │   ├── auth.ts
│   │       │   ├── session.ts
│   │       │   ├── scripture.ts
│   │       │   └── realtime.ts
│   │       └── constants/
│   │           ├── apiConstants.ts
│   │           ├── scriptureConstants.ts
│   │           └── storageKeys.ts
│   │
│   └── infra/
│       └── azure/                   # Container Apps Terraform
│           ├── main.tf
│           ├── variables.tf
│           ├── outputs.tf
│           └── terraform.tfvars.example
└── docs/
    └── v2/
        ├── architecture.md
        └── decisions.md
```

## 7. Configuration & environment variables

### Backend (`api/`)
```bash
# OpenAI
OpenAI__ApiKey=sk-proj-...
OpenAI__TranscriptionModel=gpt-realtime-whisper
OpenAI__MatchingModel=gpt-5-mini
OpenAI__MatchingFallbackModel=gpt-4o-mini
OpenAI__MatchingTemperature=0.2
OpenAI__TimeoutSeconds=30

# JWT
Jwt__Issuer=hoptranscribe-api
Jwt__Audience=hoptranscribe-web
Jwt__SigningKey=<min 32 chars>      # HS256
Jwt__ExpiryMinutes=720

# Database
ConnectionStrings__SessionDb=Data Source=/data/sessions.db

# CORS
AllowedOrigins__0=http://localhost:3000
AllowedOrigins__1=https://<yourdomain>

# Rate limiting
RateLimits__MatchPerSessionPerMinute=30
RateLimits__MatchPerIpPerMinute=120

# Telemetry (optional)
APPLICATIONINSIGHTS_CONNECTION_STRING=
```

### Frontend (`web/`)
```bash
VITE_API_BASE_URL=http://localhost:5001
```

## 8. API surface

### Auth
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/claim` | `{ username }` | `{ token, expiresAt, username }` (also sets HttpOnly cookie) |
| POST | `/api/auth/refresh` | — (cookie) | `{ token, expiresAt }` |

### Sessions (JWT required)
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/sessions` | — | `PaginatedResult<SessionDto>` |
| GET | `/api/sessions/{code}` | — | `SessionDto` |
| POST | `/api/sessions` | `{ title }` | `SessionDto` (caller becomes owner) |
| PATCH | `/api/sessions/{code}/end` | — | `SessionDto` (owner only) |
| DELETE | `/api/sessions/{code}` | — | `204` (owner only) |
| POST | `/api/sessions/{code}/transcripts` | `{ text, startedAt, endedAt }` | `TranscriptDto` (owner only) |
| GET | `/api/sessions/{code}/transcripts` | — | `TranscriptDto[]` |

### OpenAI / matching (JWT required)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/openai/transcription-session` | `{ sessionCode }` | `{ clientSecret, sdpUrl, model, expiresAt }` (owner only) |
| POST | `/api/match` | `{ sessionCode, utterance, preferredVersion, n }` | `{ matches: ScriptureMatch[] }` (owner only, rate-limited) |

### SignalR hub (`/sessionHub`, JWT required)
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `JoinSession(sessionCode)` | adds to group; verifies session exists |
| Client → Server | `LeaveSession(sessionCode)` | removes from group |
| Server → Client | `TranscriptAppended` | `{ sessionCode, segment }` |
| Server → Client | `ScripturesMatched` | `{ sessionCode, utteranceId, matches[] }` |
| Server → Client | `SessionUpdated` | `{ sessionCode, status, endedAt? }` |

> Server-initiated broadcasts only — clients never push transcripts/scriptures over the hub. This eliminates the v1 vector where any client knowing a `sessionCode` could pollute the stream.

## 9. Data model

### SQLite schema (EF Core)

```csharp
public class SessionEntity {
    public Guid Id { get; set; }
    public string Code { get; set; } = "";        // 6-char human shareable
    public string Title { get; set; } = "";
    public string OwnerUsername { get; set; } = "";
    public string Status { get; set; } = "active"; // active | ended
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public List<TranscriptSegmentEntity> Segments { get; set; } = new();
}

public class TranscriptSegmentEntity {
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Text { get; set; } = "";
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset EndedAt { get; set; }
    public List<ScriptureMatchEntity> Matches { get; set; } = new();
}

public class ScriptureMatchEntity {
    public Guid Id { get; set; }
    public Guid SegmentId { get; set; }
    public string Reference { get; set; } = "";    // "John 3:16"
    public string Book { get; set; } = "";
    public int Chapter { get; set; }
    public int VerseStart { get; set; }
    public int? VerseEnd { get; set; }
    public string Version { get; set; } = "";
    public string Quote { get; set; } = "";
    public double Confidence { get; set; }
    public int Rank { get; set; }                  // 0..n-1
}
```

Indexes: `Sessions.Code` (unique), `Sessions.OwnerUsername`, `TranscriptSegments.SessionId`, `ScriptureMatches.SegmentId`.

## 10. Decisions log

| # | Decision | Choice | Notes |
|---|---|---|---|
| 1 | Scope of rewrite | **Full rewrite** in `v2/` | v1 archived to `v1/` |
| 2 | STT model | **`gpt-realtime-whisper`** | $0.017/min, streaming deltas, transcription-only |
| 3 | Matching approach | **Pure LLM** (`gpt-5-mini`) | No RAG/embeddings; structured outputs + validators guard against hallucination |
| 4 | Browser ↔ OpenAI transport | **WebRTC** | Ephemeral tokens; no insecure subprotocol |
| 5 | Persistence | **SQLite + EF Core** | Mounted Docker volume; multi-instance deferred |
| 6 | Auth | **JWT (HS256)** | Per-session ownership; anonymous-but-pseudonymous |
| 7 | Stack | **Keep current** | .NET 10 + React 18 + Vite 4 + Tailwind 3 + shadcn |
| 8 | Deployment | **Azure Container Apps only** | AWS/GCP Terraform deferred |
| 9 | Voice TTS in v2 | **Removed entirely** | Future "ask the sermon" feature would reintroduce `gpt-realtime-2` |
| 10 | Languages | **English only** | Multi-language deferred to v2.x |
| 11 | Multi-version Bible matching | **Best match across all versions, weighted toward preferred** | Prompt directs the model to prefer the user's choice when comparable |
| 12 | Username model (JWT) | **Per-session ownership** (recommended default) | Session creator's username bound to that session; viewers join read-only with their own pseudonym |
| 13 | Matching trigger | **Every finalized utterance**, server-side rate-limited (30/min/session, 120/min/IP) (recommended default) | Avoids stuttering UX; protects cost |
| 14 | Configurable matching model | **Yes** | `OpenAI:MatchingModel` config; auto-fallback to `gpt-4o-mini` on `model_not_found` |

## 11. Phased delivery plan

Each phase is independently demoable and gated by passing CI.

### Phase 0 — Scaffold
- Create `v2/` skeleton matching the [layout](#6-repository-layout).
- Archive v1 (`git mv src/ v1/`, update root README pointer).
- Initialize `HOPTranscribe.Api.csproj` (empty Program.cs, packages restored).
- Initialize Vite project with React/TS/Tailwind/shadcn.
- Stub `docker-compose.yml` for the new layout.
- CI: `dotnet build` + `npm run build` green.

### Phase 1 — Auth + sessions
- `AuthController` (`/api/auth/claim`, `/api/auth/refresh`).
- `JwtService` (HS256, configurable key + expiry).
- `HopDbContext` + `SessionEntity` + initial migration.
- `SqliteSessionService` (CRUD by `Code`).
- `SessionController` (create, get, list, end, delete).
- Tests: xUnit (`AuthService`, `SessionService`, controllers).
- Demo: claim username, create session, restart container, session still there.

### Phase 2 — STT pipeline (WebRTC)
- `OpenAIRealtimeService.CreateTranscriptionSessionAsync()` → calls OpenAI `/v1/realtime/transcription_sessions`.
- `OpenAIController.CreateTranscriptionSession` (owner-only).
- Frontend: `webrtcService.ts` (clean rewrite), `useRealtimeWebRTC` hook, `RecordingControls` + `TranscriptionPanel`.
- Demo: speak → live transcript appears. No scripture yet.

### Phase 3 — Matching service
- `ScriptureMatchService.GetMatchesAsync(utterance, preferredVersion, n)` → `gpt-5-mini` with `json_schema`.
- `BibleBookCatalog` + `BibleVerseCounts.json` (embedded resource) + `ScriptureValidator`.
- `MatchController` (`/api/match`) with rate limiter.
- Tests: validator unit tests (canonical books, edge verses, ranges, version case-insensitive matching).
- Fallback model logic + retry policy.
- Demo: `curl /api/match` with a sample utterance → returns validated matches.

### Phase 4 — Wire end-to-end
- `useScriptureMatcher` hook (debounced, calls `/api/match` on utterance finalization).
- `ScriptureReferences` component (cards with reference, version, quote, confidence).
- `SessionService.AppendTranscriptAsync(sessionCode, segment, matches)`.
- Demo: speak "For God so loved the world" → see John 3:16 card.

### Phase 5 — Collaboration
- `SessionHub` with `[Authorize]`, owner-only broadcast methods.
- `useSignalR` hook on viewer side (joins group, listens for events).
- Read-only view for non-owners.
- Tests: hub integration test (two clients, owner sends, viewer receives).
- Demo: two browsers, one speaks, both see transcript + scripture in sync.

### Phase 6 — Polish + hardening
- `ExceptionHandlingMiddleware`, `RequestLoggingMiddleware`.
- Frontend error boundaries, toast notifications, reconnect with backoff.
- Settings panel (preferred version, max references, min confidence, auto-scroll).
- App Insights wired when connection string present.
- Production logging (Serilog file rotation).
- Load tests: 5 concurrent sessions, sustained 10 min.

### Phase 7 — Azure deploy
- `infra/azure/main.tf` — Container Apps environment, ACR, Log Analytics, Application Insights, persistent volume for SQLite (or migrate to Azure SQL/Postgres if v2.x).
- GitHub Actions workflow: build → push to ACR → `terraform apply` → smoke test.
- Demo: `terraform apply` produces a working `*.azurecontainerapps.io` URL.

## 12. Local development (target)

> These commands are the **target experience** post-Phase 0. They will not work until scaffolding is complete.

### Prereqs
- Docker Desktop, or Node 18+ and .NET 10 SDK
- OpenAI API key with Realtime access

### Docker Compose (one shot)
```bash
cd v2
cp .env.example .env
# edit .env — set OPENAI_API_KEY and JWT_SIGNING_KEY
docker compose up -d
# web   → http://localhost:3000
# api   → http://localhost:5001/health/status
```

### Backend only
```bash
cd v2/api
dotnet restore
dotnet ef database update                 # apply migrations
dotnet run                                # http://localhost:5001
```

### Frontend only
```bash
cd v2/web
npm install
npm run dev                               # http://localhost:5173
```

### Tests
```bash
# backend
cd v2/api && dotnet test

# frontend
cd v2/web && npm test
```

## 13. Deployment

Single target: **Azure Container Apps**. Two apps (`api`, `web`) behind a shared environment + Log Analytics + Application Insights.

- SQLite database persisted on a Container Apps storage mount (Azure Files). Acceptable for single-replica.
- For multi-replica scale-out, swap `SqliteSessionService` for a Postgres-backed implementation (v2.x).
- Secrets (`OpenAI__ApiKey`, `Jwt__SigningKey`) stored as Container Apps secrets or Key Vault references.
- Ingress: `api` internal (or external behind APIM), `web` external.
- Custom domain via Container Apps managed certs.

Terraform lives under `v2/infra/azure/`. Deploy via GitHub Actions or manually:
```bash
cd v2/infra/azure
terraform init
terraform apply -var "openai_api_key=$OPENAI_API_KEY" -var "jwt_signing_key=$JWT_SIGNING_KEY"
```

## 14. Cost model

**Assumptions**: 10 hours of sermon transcription/month, ~60 utterances/hour (≈600 matching calls/month), each match call ~600 input tokens + ~400 output tokens.

| Item | Rate | Monthly cost |
|---|---|---|
| `gpt-realtime-whisper` transcription | $0.017/min × 600 min | **$10.20** |
| `gpt-5-mini` matching (input)¹ | ~$0.40/M tokens × 360K tokens | **$0.14** |
| `gpt-5-mini` matching (output)¹ | ~$1.60/M tokens × 240K tokens | **$0.38** |
| Azure Container Apps (single replica, consumption tier) | — | ~$15–25 |
| Azure Files (SQLite volume) | — | ~$2 |
| Application Insights (small) | — | ~$5 |
| **Total estimated** | | **~$33–43 / month** |

¹ Approximate; verify current `gpt-5-mini` pricing at deploy time. The `MatchingModel` config makes this swappable if rates change.

**Compare to v1** at 10 hours/month: ~$180/month (per architecture doc). v2 is **~80% cheaper** with better security and accuracy.

## 15. Out of scope for v2

Deferred to v2.x or later:
- Multi-language transcription (Spanish, French, etc.)
- PDF/DOCX export of sermons
- Analytics dashboard (most-referenced verses, speaker stats)
- Multi-user / shared sermon libraries (beyond per-session owner)
- Bible verse-text storage on backend (currently quotes come from the LLM)
- RAG-backed matching with embeddings
- AWS / GCP Terraform
- Voice TTS / "ask the sermon" feature using `gpt-realtime-2`
- Mobile apps (web app remains mobile-responsive)

## 16. References

- [OpenAI `gpt-realtime-whisper` model card](https://developers.openai.com/api/docs/models/gpt-realtime-whisper)
- [OpenAI `gpt-realtime-2` model card](https://developers.openai.com/api/docs/models/gpt-realtime-2) (future use)
- [OpenAI Realtime API guide](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Realtime transcription guide](https://platform.openai.com/docs/guides/realtime-transcription)
- [OpenAI Structured outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [WebRTC for browser realtime](https://platform.openai.com/docs/guides/realtime#connect-with-webrtc)
- v1 architecture doc: `../docs/architecture.md`

---

**Plan version**: 1.0
**Last updated**: 2026-05-13
**Owner**: HOPTranscribe v2 rewrite
