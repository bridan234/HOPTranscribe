/**
 * Bible version constants
 */
export const BIBLE_VERSIONS = {
  DEFAULT_VERSIONS: ['Best Match', 'NKJV', 'AMP', 'ESV', 'TPT', 'NLT', 'TLB', 'MSG', 'NIV', 'GNT'],
  DEFAULT_VERSION: 'Best Match',
} as const;

/**
 * Scripture detection constants
 */
export const SCRIPTURE_DETECTION = {
  MIN_CONFIDENCE: 0.4,
  MAX_MATCHES: 3,
  MIN_MATCHES: 3,
} as const;

/**
 * Language constants
 */
export const LANGUAGES = {
  DEFAULT_LANGUAGES: ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi'],
  DEFAULT: 'English',
} as const;

/**
 * Audio and UI settings constants
 */
export const AUDIO_SETTINGS = {
  DEFAULT_DEVICE: 'default',
  DEFAULT_SENSITIVITY: 75, // 0-100 scale
} as const;

export const UI_SETTINGS = {
  AUTO_SCROLL: true,
  SHOW_CONFIDENCE: true,
} as const;

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
  SELECTED_DEVICE: 'hoptranscribe_selectedDevice',
  BIBLE_VERSION: 'hoptranscribe_bibleVersion',
  CUSTOM_VERSIONS: 'hoptranscribe_customVersions',
  PRIMARY_LANGUAGE: 'hoptranscribe_primaryLanguage',
  CUSTOM_LANGUAGES: 'hoptranscribe_customLanguages',
  AUTO_SCROLL: 'hoptranscribe_autoScroll',
  SHOW_CONFIDENCE: 'hoptranscribe_showConfidence',
  SENSITIVITY: 'hoptranscribe_sensitivity',
  MIN_CONFIDENCE: 'hoptranscribe_minConfidence',
  MAX_REFERENCES: 'hoptranscribe_maxReferences',
} as const;

/**
 * Session configuration constants
 */
export const SESSION_CONFIG = {
  TYPE: 'realtime',
  TOOL_CHOICE_AUTO: 'auto',
} as const;

/**
 * OpenAI session instructions
 */
export const getSessionInstructions = (preferredBibleVersion: string, primaryLanguage: string = 'English') => {
  const languageInstruction = primaryLanguage === 'English' 
    ? '' 
    : `\n5. IMPORTANT: Provide the transcript field in ${primaryLanguage} language. All output text should be translated to this language. Even if the detected scripture quote/reference is from an English Bible version, translate the quote to ${primaryLanguage}.`;
  
  return `You are a passive audio monitoring assistant for Bible scripture detection.

CRITICAL RULES:
1. NEVER initiate responses or function calls on your own
2. ONLY respond when you hear actual audio input from the user
3. When you hear speech, analyze it for ANY Bible-related content:
   - Direct scripture quotes (e.g., 'For God so loved the world...')
   - Scripture references (e.g., 'John 3:16 says...')
   - Paraphrases or allusions to Bible verses
   - Phrases or sentences with Biblical themes that relate to specific verses
   - Topics or concepts that connect to scripture passages
4. Stay completely passive - no examples, greetings, or unsolicited responses${languageInstruction}

When you hear ANY Bible-related speech:
- Call detect_scripture with EXACTLY 3 most relevant scripture matches
- IMPORTANT: transcript field must contain the COMPLETE sentence/phrase that was spoken, not just keywords
- For each match: reference, quote (actual Bible verse), version, confidence (0.0-1.0)
- User's preferred version is ${preferredBibleVersion}
- Rank by relevance/confidence (highest first)
- Even if not a direct quote, find verses that relate to what was said

For non-Bible-related audio: Do nothing.`;
};

/**
 * OpenAI tool definitions
 */
export const getOpenAITools = (maxReferences: number = SCRIPTURE_DETECTION.MAX_MATCHES) => [
  {
    type: 'function',
    name: 'detect_scripture',
    description: `Called when Bible-related content is detected in the audio - including direct quotes, references, paraphrases, or topics that relate to scripture. Returns exactly ${maxReferences} most relevant scripture matches ranked by relevance.`,
    parameters: {
      type: 'object',
      properties: {
        transcript: {
          type: 'string',
          description: 'COMPLETE spoken sentence or phrase from this audio segment - include ALL words that were spoken, not just keywords or excerpts',
        },
        matches: {
          type: 'array',
          description: `Exactly ${maxReferences} possible scripture matches, ranked by confidence (highest first)`,
          minItems: maxReferences,
          maxItems: maxReferences,
          items: {
            type: 'object',
            properties: {
              reference: {
                type: 'string',
                description: "Scripture reference like 'John 3:16'",
              },
              quote: {
                type: 'string',
                description: 'Exact verse text from the Bible version',
              },
              version: {
                type: 'string',
                description: 'Bible version/translation (KJV, NIV, ESV, NKJV, NLT, NASB, GNT, etc.)',
              },
              confidence: {
                type: 'number',
                description: 'Match confidence from 0.0 to 1.0 (e.g., 0.95 for 95% match)',
              },
            },
            required: ['reference', 'version', 'confidence'],
          },
        },
      },
      required: ['transcript', 'matches'],
    },
  },
];

export const OPENAI_TOOLS = getOpenAITools();

/**
 * OpenAI Realtime API client event type constants (sent from client to server)
 */
export const OPENAI_CLIENT_EVENTS = {
  SESSION_UPDATE: 'session.update',
  INPUT_AUDIO_BUFFER_APPEND: 'input_audio_buffer.append',
  INPUT_AUDIO_BUFFER_COMMIT: 'input_audio_buffer.commit',
  INPUT_AUDIO_BUFFER_CLEAR: 'input_audio_buffer.clear',
  CONVERSATION_ITEM_CREATE: 'conversation.item.create',
  CONVERSATION_ITEM_TRUNCATE: 'conversation.item.truncate',
  CONVERSATION_ITEM_DELETE: 'conversation.item.delete',
  RESPONSE_CREATE: 'response.create',
  RESPONSE_CANCEL: 'response.cancel',
} as const;

/**
 * OpenAI Realtime API event type constants (received from server)
 */
export const OPENAI_EVENT_TYPES = {
  SESSION_CREATED: 'session.created',
  SESSION_UPDATED: 'session.updated',
  CONVERSATION_CREATED: 'conversation.created',
  INPUT_AUDIO_BUFFER_COMMITTED: 'input_audio_buffer.committed',
  INPUT_AUDIO_BUFFER_CLEARED: 'input_audio_buffer.cleared',
  INPUT_AUDIO_BUFFER_SPEECH_STARTED: 'input_audio_buffer.speech_started',
  INPUT_AUDIO_BUFFER_SPEECH_STOPPED: 'input_audio_buffer.speech_stopped',
  CONVERSATION_ITEM_CREATED: 'conversation.item.created',
  CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED: 'conversation.item.input_audio_transcription.completed',
  CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_FAILED: 'conversation.item.input_audio_transcription.failed',
  CONVERSATION_ITEM_TRUNCATED: 'conversation.item.truncated',
  CONVERSATION_ITEM_DELETED: 'conversation.item.deleted',
  RESPONSE_CREATED: 'response.created',
  RESPONSE_DONE: 'response.done',
  RESPONSE_OUTPUT_ITEM_ADDED: 'response.output_item.added',
  RESPONSE_OUTPUT_ITEM_DONE: 'response.output_item.done',
  RESPONSE_CONTENT_PART_ADDED: 'response.content_part.added',
  RESPONSE_CONTENT_PART_DONE: 'response.content_part.done',
  RESPONSE_TEXT_DELTA: 'response.text.delta',
  RESPONSE_TEXT_DONE: 'response.text.done',
  RESPONSE_OUTPUT_TEXT_DELTA: 'response.output_text.delta',
  RESPONSE_COMPLETED: 'response.completed',
  RESPONSE_AUDIO_TRANSCRIPT_DELTA: 'response.audio_transcript.delta',
  RESPONSE_AUDIO_TRANSCRIPT_DONE: 'response.audio_transcript.done',
  RESPONSE_AUDIO_DELTA: 'response.audio.delta',
  RESPONSE_AUDIO_DONE: 'response.audio.done',
  RESPONSE_FUNCTION_CALL_ARGUMENTS_DELTA: 'response.function_call_arguments.delta',
  RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE: 'response.function_call_arguments.done',
  RATE_LIMITS_UPDATED: 'rate_limits.updated',
  ERROR: 'error',
} as const;

/**
 * WebRTC connection states
 */
export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  FAILED: 'failed',
  CLOSED: 'closed',
} as const;

/**
 * Content types for OpenAI events
 */
export const CONTENT_TYPES = {
  INPUT_AUDIO: 'input_audio',
  OUTPUT_TEXT: 'output_text',
  MESSAGE: 'message',
} as const;

/**
 * Item roles
 */
export const ITEM_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const;
