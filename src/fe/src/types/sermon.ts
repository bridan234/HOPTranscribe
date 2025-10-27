export interface SermonResult {
  transcript: string;
  scripture_reference: string | null;
  scripture_quote: string; // exact verse text or empty if unknown
}
