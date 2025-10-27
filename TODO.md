# HOPTranscribe MVP - Development Todo

**Goal**: Real-time sermon transcription with AI-powered scripture detection  
**Target**: Working prototype in 2 weeks  
**Approach**: OpenAI Realtime API (WebRTC) for security + speed

---

## ✅ Completed

- [x] Project structure setup (src/fe, src/be, docs)
- [x] React frontend with Vite + Tailwind CSS
- [x] .NET 9 backend with CORS configured
- [x] Architecture documentation
- [x] shadcn/ui components migrated
- [x] All styling issues resolved

---

## 🚀 Phase 1: Audio Capture & OpenAI Connection (Week 1)

### Backend: Ephemeral Token Endpoint
- [x] **Task 1.1**: Create `/api/openai/session` endpoint ✅ **TESTED & VERIFIED**
  - [x] Add OpenAI API key to backend appsettings
  - [x] Install HttpClient for OpenAI API calls
  - [x] POST to `https://api.openai.com/v1/realtime/client_secrets`
  - [x] Return ephemeral key (60s expiry) with session details
  - [x] Add error handling for OpenAI failures
  - [x] Implement proper C# standards (DI, constants, appsettings)
  - [x] Add Serilog logging (console + file)
  - [x] Create middleware (exception handling, request logging)
  - [x] Fix response model to match OpenAI's actual structure
  - [x] Test endpoint successfully returns ephemeral key
  - **Files**: `src/be/Controllers/OpenAIController.cs`, `src/be/Services/OpenAIService.cs`, `src/be/Constants/ApiConstants.cs`, `src/be/Configuration/OpenAISettings.cs`, `src/be/Middleware/*`, `src/be/Models/OpenAI/*`
  - **Completed**: ✅ October 21, 2025
  - **Test Result**: Returns `{"success":true,"data":{"ephemeral_key":{"value":"ek_...","expires_at":...},"session_id":"sess_...","model":"gpt-realtime"}}`

### Frontend: Audio Capture
- [x] **Task 1.2**: Create `useMediaRecorder` hook ✅ **COMPLETE**
  - [x] Request microphone permission
  - [x] Configure audio constraints (mono, 24kHz, echo cancellation)
  - [x] Handle permission denied errors
  - [x] Add start/stop recording controls
  - [x] Display recording indicator
  - [x] Service layer for media APIs (`mediaService.ts`)
  - [x] Type definitions for audio config
  - [x] Demo component (`AudioRecorder.tsx`)
  - **Files**: `src/fe/src/hooks/useMediaRecorder.ts`, `src/fe/src/services/mediaService.ts`, `src/fe/src/types/media.ts`, `src/fe/src/components/AudioRecorder.tsx`
  - **Completed**: ✅ October 21, 2025

- [x] **Task 1.3**: Create `useRealtimeWebRTC` hook ✅ **COMPLETE**
  - [x] Fetch ephemeral token from backend
  - [x] Create RTCPeerConnection
  - [x] Add audio track from MediaStream
  - [x] Create data channel for events ('oai-events')
  - [x] Handle ICE candidates
  - [x] Create and send SDP offer to OpenAI
  - [x] Set remote SDP answer
  - [x] Handle connection state changes
  - [x] Service layer for API calls (`apiService.ts`)
  - [x] Service layer for WebRTC management (`webrtcService.ts`)
  - [x] Type definitions for WebRTC (`types/webrtc.ts`)
  - [x] Auto-connect when audio stream available
  - [x] Cleanup on unmount
  - [x] Integrated into `App.tsx` with `StatusBar` callbacks
  - **Files**: `src/fe/src/hooks/useRealtimeWebRTC.ts`, `src/fe/src/services/apiService.ts`, `src/fe/src/services/webrtcService.ts`, `src/fe/src/types/webrtc.ts`
  - **Completed**: ✅ October 21, 2025
  - **Implementation**: Using ephemeral token approach (as per OpenAI WebRTC docs)

- [ ] **Task 1.4**: Configure OpenAI session
  - [ ] Send session.update via data channel
  - [ ] Set instructions for sermon transcription
  - [ ] Configure VAD (Voice Activity Detection)
  - [ ] Set input_audio_transcription enabled
  - [ ] Test connection with console logs
  - **Files**: `src/fe/src/lib/openai-webrtc.ts`
  - **Est**: 2 hours

### UI: Basic Recording Interface
- [ ] **Task 1.5**: Update TranscriptionPanel
  - [ ] Add "Start Recording" button
  - [ ] Add "Stop Recording" button
  - [ ] Show connection status (disconnected/connecting/connected/error)
  - [ ] Display recording duration timer
  - [ ] Add microphone permission prompt UI
  - **Files**: `src/fe/src/components/TranscriptionPanel.tsx`
  - **Est**: 2 hours

- [ ] **Task 1.6**: Update StatusBar
  - [ ] Show WebRTC connection status
  - [ ] Display audio input level meter
  - [ ] Show recording duration
  - [ ] Add error messages display
  - **Files**: `src/fe/src/components/StatusBar.tsx`
  - **Est**: 1 hour

### Testing
- [ ] **Task 1.7**: Test audio capture
  - [ ] Verify microphone permission flow
  - [ ] Check audio constraints applied correctly
  - [ ] Test start/stop recording
  - [ ] Verify no audio leaks after stop

- [ ] **Task 1.8**: Test OpenAI connection
  - [ ] Verify ephemeral token generation
  - [ ] Check RTCPeerConnection established
  - [ ] Confirm data channel opens
  - [ ] Test session configuration sent

**Phase 1 Deliverable**: Audio streams to OpenAI, connection established

---

## 🎯 Phase 2: Live Transcription Display (Week 1)

### Frontend: Transcription Handling
- [ ] **Task 2.1**: Handle transcription events
  - [ ] Listen for `conversation.item.input_audio_transcription.completed`
  - [ ] Parse transcript text from events
  - [ ] Append to transcript state
  - [ ] Handle interim vs final transcripts
  - [ ] Add timestamps to each segment
  - **Files**: `src/fe/src/hooks/useRealtimeWebRTC.ts`
  - **Est**: 2 hours

- [ ] **Task 2.2**: Create transcript state management
  - [ ] Create TranscriptContext
  - [ ] Store segments with timestamps
  - [ ] Handle segment updates
  - [ ] Implement auto-scroll logic
  - **Files**: `src/fe/src/contexts/TranscriptContext.tsx`
  - **Est**: 2 hours

### UI: Transcription Display
- [ ] **Task 2.3**: Update TranscriptionPanel UI
  - [ ] Display live transcript with auto-scroll
  - [ ] Show timestamps per segment
  - [ ] Add pause indicator during silence
  - [ ] Style interim vs final text differently
  - [ ] Add "Clear Transcript" button
  - **Files**: `src/fe/src/components/TranscriptionPanel.tsx`
  - **Est**: 3 hours

- [ ] **Task 2.4**: Add transcript export
  - [ ] "Copy to Clipboard" button
  - [ ] "Download as TXT" button
  - [ ] Include timestamps in export
  - **Files**: `src/fe/src/components/TranscriptionPanel.tsx`
  - **Est**: 1 hour

### Testing
- [ ] **Task 2.5**: Test transcription accuracy
  - [ ] Speak sample text and verify output
  - [ ] Test with different accents
  - [ ] Check punctuation and capitalization
  - [ ] Verify timestamps correct

- [ ] **Task 2.6**: Test UI responsiveness
  - [ ] Verify auto-scroll works
  - [ ] Check transcript doesn't lag with long sessions
  - [ ] Test export functionality

**Phase 2 Deliverable**: Live transcription appears in real-time

---

## 📖 Phase 3: Scripture Detection (Week 2)

### Backend: Bible Data Setup
- [ ] **Task 3.1**: Set up Bible verse storage
  - [ ] Choose approach (IndexedDB vs Backend API)
  - [ ] Download KJV Bible JSON
  - [ ] Create verse lookup utility
  - [ ] Add book name normalization
  - **Files**: `src/fe/src/lib/bible-data.ts` OR `src/be/Services/BibleService.cs`
  - **Est**: 3 hours

### Frontend: Function Calling Setup
- [ ] **Task 3.2**: Define scripture detection tool
  - [ ] Create function definition JSON
  - [ ] Add to session configuration
  - [ ] Test function appears in OpenAI dashboard
  - **Files**: `src/fe/src/lib/openai-tools.ts`
  - **Est**: 1 hour

- [ ] **Task 3.3**: Handle function call events
  - [ ] Listen for `response.function_call_arguments.done`
  - [ ] Parse scripture reference from arguments
  - [ ] Validate book/chapter/verse format
  - [ ] Add to detected references list
  - **Files**: `src/fe/src/hooks/useRealtimeWebRTC.ts`
  - **Est**: 2 hours

- [ ] **Task 3.4**: Create scripture enrichment
  - [ ] Lookup verse text from Bible data
  - [ ] Handle multiple Bible versions (KJV, NIV, ESV)
  - [ ] Get surrounding context verses
  - [ ] Calculate confidence score
  - **Files**: `src/fe/src/lib/scripture-enrichment.ts`
  - **Est**: 3 hours

### UI: Scripture Cards
- [ ] **Task 3.5**: Create ScriptureCard component
  - [ ] Display book, chapter, verse reference
  - [ ] Show verse text with formatting
  - [ ] Add confidence indicator
  - [ ] Include "Copy" button
  - [ ] Add version selector dropdown
  - **Files**: `src/fe/src/components/ScriptureCard.tsx`
  - **Est**: 3 hours

- [ ] **Task 3.6**: Update ScriptureReferences panel
  - [ ] List all detected scriptures
  - [ ] Show timestamp when mentioned
  - [ ] Add filter by book
  - [ ] Sort by timestamp or reference
  - [ ] Handle duplicate references
  - **Files**: `src/fe/src/components/ScriptureReferences.tsx`
  - **Est**: 2 hours

### Fallback: Regex Detection
- [ ] **Task 3.7**: Add regex fallback
  - [ ] Create patterns for common formats ("John 3:16", "1 Corinthians 13")
  - [ ] Run on transcript segments
  - [ ] Only trigger if OpenAI misses it
  - [ ] Lower confidence score for regex matches
  - **Files**: `src/fe/src/lib/scripture-parser.ts`
  - **Est**: 2 hours

### Testing
- [ ] **Task 3.8**: Test scripture detection
  - [ ] Speak "John 3:16" and verify detection
  - [ ] Test variations ("John chapter 3 verse 16")
  - [ ] Try multiple references in one sentence
  - [ ] Check verse text displays correctly
  - [ ] Verify confidence scores reasonable

**Phase 3 Deliverable**: Scripture references detected and displayed with verse text

---

## ⚙️ Phase 4: Settings & Polish (Week 2)

### Settings Panel
- [ ] **Task 4.1**: Add user preferences
  - [ ] Bible version selector (KJV/NIV/ESV)
  - [ ] Auto-scroll toggle
  - [ ] Show/hide confidence scores
  - [ ] Audio input device selector
  - [ ] Save settings to localStorage
  - **Files**: `src/fe/src/components/SettingsPanel.tsx`
  - **Est**: 3 hours

### Error Handling
- [ ] **Task 4.2**: Improve error handling
  - [ ] Connection lost → show reconnect button
  - [ ] Token expired → fetch new token
  - [ ] Microphone access denied → show help
  - [ ] OpenAI API error → display message
  - [ ] Add error boundary component
  - **Files**: `src/fe/src/components/ErrorBoundary.tsx`
  - **Est**: 2 hours

### UI Polish
- [ ] **Task 4.3**: Improve visual design
  - [ ] Add loading skeletons
  - [ ] Smooth transitions for scripture cards
  - [ ] Better color scheme for dark mode
  - [ ] Add icons to buttons
  - [ ] Improve spacing and typography
  - **Files**: Various component files
  - **Est**: 3 hours

- [ ] **Task 4.4**: Add keyboard shortcuts
  - [ ] Space = Start/Stop recording
  - [ ] Cmd/Ctrl + K = Clear transcript
  - [ ] Cmd/Ctrl + S = Download transcript
  - [ ] Cmd/Ctrl + , = Open settings
  - **Files**: `src/fe/src/hooks/useKeyboardShortcuts.ts`
  - **Est**: 1 hour

### Testing
- [ ] **Task 4.5**: End-to-end testing
  - [ ] Record full 5-minute sermon clip
  - [ ] Verify all scriptures detected
  - [ ] Check no memory leaks
  - [ ] Test on different browsers (Chrome, Safari, Firefox)
  - [ ] Verify mobile responsive (if applicable)

**Phase 4 Deliverable**: Polished, user-friendly MVP

---

## 🚀 Deployment Preparation

### Environment Setup
- [ ] **Task 5.1**: Configure production environment
  - [ ] Set up Vercel project for frontend
  - [ ] Set up Railway/Azure for backend
  - [ ] Add production environment variables
  - [ ] Configure CORS for production domain
  - **Est**: 2 hours

### Documentation
- [ ] **Task 5.2**: Create user documentation
  - [ ] Write README.md with setup instructions
  - [ ] Create user guide with screenshots
  - [ ] Document known limitations
  - [ ] Add troubleshooting section
  - **Est**: 2 hours

### Performance
- [ ] **Task 5.3**: Optimize performance
  - [ ] Add code splitting
  - [ ] Lazy load Bible data
  - [ ] Optimize bundle size
  - [ ] Add service worker for offline support
  - **Est**: 3 hours

---

## 📊 Success Criteria

**MVP is complete when:**
1. ✅ User can click "Start Recording" and speak
2. ✅ Transcript appears in real-time
3. ✅ Scripture references automatically detected
4. ✅ Verse text displayed in cards
5. ✅ Can export transcript as TXT
6. ✅ Works in Chrome/Safari/Firefox
7. ✅ No API key exposed in browser
8. ✅ Handles errors gracefully

---

## 🔮 Future Enhancements (Post-MVP)

- [ ] Backend persistence (save sermons to PostgreSQL)
- [ ] Sermon history and search
- [ ] Speaker diarization
- [ ] Analytics dashboard (most-referenced verses)
- [ ] PDF export with formatting
- [ ] Multi-user support with authentication
- [ ] Mobile app (React Native)
- [ ] Phone call recording integration
- [ ] Migrate to Deepgram for cost savings
- [ ] Multi-language support

---

## 📝 Notes

**Current Stack:**
- Frontend: React 18 + Vite + Tailwind CSS + shadcn/ui
- Backend: .NET 9 Web API
- AI: OpenAI Realtime API (WebRTC)
- Estimated Cost: $36/month (10 hours of sermons)

**Key Decisions:**
- Using WebRTC (not WebSocket) for API key security
- Starting with OpenAI for speed, can migrate to Deepgram later
- IndexedDB for Bible caching (no backend database needed for MVP)
- Frontend-first approach (backend optional for persistence)

**Risks:**
- Browser compatibility (WebRTC requires modern browsers)
- Audio quality in noisy environments
- OpenAI rate limits during testing
- Cost if usage exceeds 10 hours/month

---

**Last Updated**: October 21, 2025  
**Target Completion**: November 4, 2025 (2 weeks)
