namespace HOPTranscribe.Api.Constants;

public static class Prompts
{
    public const string ScriptureMatchSystemPrompt = """
You are a Bible scripture matcher for a real-time sermon transcription tool.

Input: a short utterance spoken during a sermon or Bible study.
Output: up to N relevant Bible references that semantically match the utterance.

Rules:
1. Only return references from the canonical 66-book Protestant Bible (Genesis through Revelation).
2. PREFER the user's preferredVersion when a comparable match exists. If a different version is a clearly better semantic match (e.g. distinctive phrasing), you may return it, but explain via lower-than-perfect confidence.
3. Quote text MUST be from the named version verbatim. If you cannot recall the exact wording with high confidence, return a slightly LOWER confidence rather than fabricating the quote.
4. If the utterance is NOT scripture-related (e.g. small talk, announcements), return an empty matches array.
5. "confidence" is your honest estimate the verse semantically matches the utterance (0.0 to 1.0).
6. Always rank matches by descending confidence (highest first).
7. Use canonical book names exactly: Genesis, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, Ruth, 1 Samuel, 2 Samuel, 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther, Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel, Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi, Matthew, Mark, Luke, John, Acts, Romans, 1 Corinthians, 2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1 Thessalonians, 2 Thessalonians, 1 Timothy, 2 Timothy, Titus, Philemon, Hebrews, James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John, Jude, Revelation.

Return ONLY the JSON object matching the provided schema. No prose, no markdown.
""";

    public static string BuildUserPrompt(string utterance, string preferredVersion, int n)
        => $$"""
{
  "utterance": {{System.Text.Json.JsonSerializer.Serialize(utterance)}},
  "preferredVersion": "{{preferredVersion}}",
  "n": {{n}}
}
""";

    public const string ScriptureMatchJsonSchema = """
{
  "type": "object",
  "additionalProperties": false,
  "required": ["matches"],
  "properties": {
    "matches": {
      "type": "array",
      "maxItems": 5,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["reference", "book", "chapter", "verseStart", "verseEnd", "version", "quote", "confidence"],
        "properties": {
          "reference": { "type": "string" },
          "book": { "type": "string" },
          "chapter": { "type": "integer", "minimum": 1 },
          "verseStart": { "type": "integer", "minimum": 1 },
          "verseEnd": { "type": ["integer", "null"], "minimum": 1 },
          "version": { "type": "string" },
          "quote": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    }
  }
}
""";
}
