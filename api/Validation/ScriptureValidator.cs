using HOPTranscribe.Api.Models.Matching;

namespace HOPTranscribe.Api.Validation;

public class ScriptureValidator
{
    private static readonly HashSet<string> KnownVersions = new(StringComparer.OrdinalIgnoreCase)
    {
        "KJV", "NKJV", "NIV", "ESV", "NLT", "NASB", "AMP", "MSG", "TPT", "GNT", "TLB", "CSB", "RSV", "ASV", "WEB"
    };

    private readonly BibleBookCatalog _catalog;
    private readonly ILogger<ScriptureValidator> _logger;

    public ScriptureValidator(BibleBookCatalog catalog, ILogger<ScriptureValidator> logger)
    {
        _catalog = catalog;
        _logger = logger;
    }

    public ScriptureMatch? Validate(ScriptureMatch raw)
    {
        if (raw is null) return null;
        if (string.IsNullOrWhiteSpace(raw.Book) || string.IsNullOrWhiteSpace(raw.Version))
        {
            _logger.LogDebug("Dropping match with missing book/version: {Ref}", raw.Reference);
            return null;
        }

        if (!_catalog.TryGetCanonical(raw.Book, out var canonicalBook))
        {
            _logger.LogDebug("Dropping match with non-canonical book '{Book}'", raw.Book);
            return null;
        }

        var chapterMax = _catalog.GetChapterCount(canonicalBook);
        if (raw.Chapter < 1 || raw.Chapter > chapterMax)
        {
            _logger.LogDebug("Dropping match with out-of-range chapter {Book} {Chapter}/{Max}", canonicalBook, raw.Chapter, chapterMax);
            return null;
        }

        var verseMax = _catalog.GetVerseCount(canonicalBook, raw.Chapter);
        if (raw.VerseStart < 1 || raw.VerseStart > verseMax)
        {
            _logger.LogDebug("Dropping match with out-of-range verseStart {Book} {Chapter}:{V}/{Max}", canonicalBook, raw.Chapter, raw.VerseStart, verseMax);
            return null;
        }

        int? verseEnd = raw.VerseEnd;
        if (verseEnd.HasValue)
        {
            if (verseEnd.Value < raw.VerseStart || verseEnd.Value > verseMax)
            {
                _logger.LogDebug("Clamping out-of-range verseEnd for {Book} {Chapter}:{Start}-{End}", canonicalBook, raw.Chapter, raw.VerseStart, verseEnd);
                verseEnd = null;
            }
        }

        if (raw.Confidence < 0 || raw.Confidence > 1)
        {
            raw.Confidence = Math.Clamp(raw.Confidence, 0, 1);
        }

        var version = raw.Version.Trim().ToUpperInvariant();
        if (!KnownVersions.Contains(version))
        {
            _logger.LogDebug("Unknown version '{Version}' kept as-is", version);
        }

        var reference = FormatReference(canonicalBook, raw.Chapter, raw.VerseStart, verseEnd);

        return new ScriptureMatch
        {
            Reference = reference,
            Book = canonicalBook,
            Chapter = raw.Chapter,
            VerseStart = raw.VerseStart,
            VerseEnd = verseEnd,
            Version = version,
            Quote = raw.Quote ?? string.Empty,
            Confidence = raw.Confidence,
        };
    }

    private static string FormatReference(string book, int chapter, int verseStart, int? verseEnd)
    {
        if (verseEnd.HasValue && verseEnd.Value != verseStart)
            return $"{book} {chapter}:{verseStart}-{verseEnd.Value}";
        return $"{book} {chapter}:{verseStart}";
    }
}
