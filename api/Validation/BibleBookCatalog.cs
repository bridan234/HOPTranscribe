using System.Reflection;
using System.Text.Json;

namespace HOPTranscribe.Api.Validation;

public class BibleBookCatalog
{
    private readonly Dictionary<string, int[]> _verseCounts;
    private readonly Dictionary<string, string> _canonicalLookup;

    public BibleBookCatalog()
    {
        var assembly = typeof(BibleBookCatalog).GetTypeInfo().Assembly;
        var resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("BibleVerseCounts.json", StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("BibleVerseCounts.json embedded resource not found.");

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException("Failed to open BibleVerseCounts.json resource stream.");
        using var doc = JsonDocument.Parse(stream);

        var books = doc.RootElement.GetProperty("books");
        _verseCounts = new Dictionary<string, int[]>(StringComparer.OrdinalIgnoreCase);
        _canonicalLookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var book in books.EnumerateObject())
        {
            var name = book.Name;
            var counts = book.Value.EnumerateArray().Select(v => v.GetInt32()).ToArray();
            _verseCounts[name] = counts;
            _canonicalLookup[name] = name;
            _canonicalLookup[name.Replace(" ", "")] = name;
        }

        // Aliases
        AddAlias("Song of Solomon", "Song of Songs", "Canticles", "Cant");
        AddAlias("Psalms", "Psalm", "Ps");
        AddAlias("Revelation", "Revelations", "Rev");
        AddAlias("1 Samuel", "First Samuel", "I Samuel", "1Sam", "1 Sam");
        AddAlias("2 Samuel", "Second Samuel", "II Samuel", "2Sam", "2 Sam");
        AddAlias("1 Kings", "First Kings", "I Kings", "1Kgs");
        AddAlias("2 Kings", "Second Kings", "II Kings", "2Kgs");
        AddAlias("1 Chronicles", "First Chronicles", "I Chronicles", "1Chr");
        AddAlias("2 Chronicles", "Second Chronicles", "II Chronicles", "2Chr");
        AddAlias("1 Corinthians", "First Corinthians", "I Corinthians", "1Cor");
        AddAlias("2 Corinthians", "Second Corinthians", "II Corinthians", "2Cor");
        AddAlias("1 Thessalonians", "First Thessalonians", "I Thessalonians", "1Thess");
        AddAlias("2 Thessalonians", "Second Thessalonians", "II Thessalonians", "2Thess");
        AddAlias("1 Timothy", "First Timothy", "I Timothy", "1Tim");
        AddAlias("2 Timothy", "Second Timothy", "II Timothy", "2Tim");
        AddAlias("1 Peter", "First Peter", "I Peter", "1Pet");
        AddAlias("2 Peter", "Second Peter", "II Peter", "2Pet");
        AddAlias("1 John", "First John", "I John", "1Jn", "1 Jn");
        AddAlias("2 John", "Second John", "II John", "2Jn");
        AddAlias("3 John", "Third John", "III John", "3Jn");
    }

    private void AddAlias(string canonical, params string[] aliases)
    {
        if (!_verseCounts.ContainsKey(canonical)) return;
        foreach (var a in aliases)
        {
            _canonicalLookup[a] = canonical;
            _canonicalLookup[a.Replace(" ", "")] = canonical;
        }
    }

    public IReadOnlyCollection<string> CanonicalBooks => _verseCounts.Keys.ToArray();

    public bool TryGetCanonical(string book, out string canonical)
    {
        if (string.IsNullOrWhiteSpace(book))
        {
            canonical = string.Empty;
            return false;
        }

        var key = book.Trim();
        if (_canonicalLookup.TryGetValue(key, out var hit))
        {
            canonical = hit;
            return true;
        }
        canonical = string.Empty;
        return false;
    }

    public int GetChapterCount(string canonicalBook) =>
        _verseCounts.TryGetValue(canonicalBook, out var counts) ? counts.Length : 0;

    public int GetVerseCount(string canonicalBook, int chapter)
    {
        if (!_verseCounts.TryGetValue(canonicalBook, out var counts)) return 0;
        if (chapter < 1 || chapter > counts.Length) return 0;
        return counts[chapter - 1];
    }
}
