using HOPTranscribe.Api.Models.Matching;
using HOPTranscribe.Api.Validation;
using Microsoft.Extensions.Logging.Abstractions;

namespace HOPTranscribe.Api.Tests.Validation;

public class ScriptureValidatorTests
{
    private readonly ScriptureValidator _validator;

    public ScriptureValidatorTests()
    {
        var catalog = new BibleBookCatalog();
        _validator = new ScriptureValidator(catalog, NullLogger<ScriptureValidator>.Instance);
    }

    private static ScriptureMatch NewMatch(
        string book = "John",
        int chapter = 3,
        int verseStart = 16,
        int? verseEnd = null,
        string version = "NKJV",
        double confidence = 0.9,
        string quote = "For God so loved the world…")
        => new()
        {
            Book = book,
            Chapter = chapter,
            VerseStart = verseStart,
            VerseEnd = verseEnd,
            Version = version,
            Confidence = confidence,
            Quote = quote,
        };

    [Fact]
    public void Validate_Canonicalizes_Book_Name()
    {
        var result = _validator.Validate(NewMatch(book: "rev", chapter: 1, verseStart: 1));
        result.Should().NotBeNull();
        result!.Book.Should().Be("Revelation");
    }

    [Fact]
    public void Validate_Formats_Single_Verse_Reference()
    {
        var result = _validator.Validate(NewMatch(book: "John", chapter: 3, verseStart: 16));
        result!.Reference.Should().Be("John 3:16");
    }

    [Fact]
    public void Validate_Formats_Range_Reference()
    {
        var result = _validator.Validate(NewMatch(book: "John", chapter: 3, verseStart: 16, verseEnd: 17));
        result!.Reference.Should().Be("John 3:16-17");
        result.VerseEnd.Should().Be(17);
    }

    [Fact]
    public void Validate_Drops_Match_When_Book_Is_Non_Canonical()
    {
        var result = _validator.Validate(NewMatch(book: "Hezekiah", chapter: 1, verseStart: 1));
        result.Should().BeNull();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(22)] // Revelation has 22 chapters - valid
    [InlineData(23)] // 23 is out of range
    public void Validate_Rejects_Out_Of_Range_Chapter(int chapter)
    {
        var result = _validator.Validate(NewMatch(book: "Revelation", chapter: chapter, verseStart: 1));
        if (chapter is >= 1 and <= 22)
        {
            result.Should().NotBeNull();
        }
        else
        {
            result.Should().BeNull();
        }
    }

    [Fact]
    public void Validate_Rejects_Verse_Start_Below_1()
    {
        var result = _validator.Validate(NewMatch(book: "John", chapter: 3, verseStart: 0));
        result.Should().BeNull();
    }

    [Fact]
    public void Validate_Rejects_Verse_Start_Above_Max()
    {
        // John 3 has 36 verses
        var result = _validator.Validate(NewMatch(book: "John", chapter: 3, verseStart: 37));
        result.Should().BeNull();
    }

    [Fact]
    public void Validate_Accepts_Verse_At_Chapter_Maximum()
    {
        var result = _validator.Validate(NewMatch(book: "John", chapter: 3, verseStart: 36));
        result.Should().NotBeNull();
        result!.VerseStart.Should().Be(36);
    }

    [Fact]
    public void Validate_Clamps_VerseEnd_When_Below_VerseStart()
    {
        var result = _validator.Validate(NewMatch(book: "John", chapter: 3, verseStart: 16, verseEnd: 5));
        result.Should().NotBeNull();
        result!.VerseEnd.Should().BeNull();
        result.Reference.Should().Be("John 3:16");
    }

    [Fact]
    public void Validate_Clamps_VerseEnd_When_Above_Chapter_Max()
    {
        // John 3 has 36 verses; 99 should be clamped to null
        var result = _validator.Validate(NewMatch(book: "John", chapter: 3, verseStart: 16, verseEnd: 99));
        result.Should().NotBeNull();
        result!.VerseEnd.Should().BeNull();
        result.Reference.Should().Be("John 3:16");
    }

    [Fact]
    public void Validate_Preserves_Equal_VerseEnd_As_Single_Verse_Reference()
    {
        var result = _validator.Validate(NewMatch(book: "John", chapter: 3, verseStart: 16, verseEnd: 16));
        result.Should().NotBeNull();
        result!.Reference.Should().Be("John 3:16");
    }

    [Theory]
    [InlineData(-0.5, 0.0)]
    [InlineData(1.5, 1.0)]
    [InlineData(0.5, 0.5)]
    public void Validate_Clamps_Confidence_To_0_1(double input, double expected)
    {
        var result = _validator.Validate(NewMatch(confidence: input));
        result.Should().NotBeNull();
        result!.Confidence.Should().Be(expected);
    }

    [Theory]
    [InlineData("nkjv", "NKJV")]
    [InlineData("  niv  ", "NIV")]
    [InlineData("esv", "ESV")]
    public void Validate_Normalizes_Version_To_Uppercase_Trimmed(string version, string expected)
    {
        var result = _validator.Validate(NewMatch(version: version));
        result.Should().NotBeNull();
        result!.Version.Should().Be(expected);
    }

    [Fact]
    public void Validate_Keeps_Unknown_Version_As_Uppercase()
    {
        var result = _validator.Validate(NewMatch(version: "xyz"));
        result.Should().NotBeNull();
        result!.Version.Should().Be("XYZ");
    }

    [Fact]
    public void Validate_Returns_Null_For_Null_Input()
    {
        _validator.Validate(null!).Should().BeNull();
    }

    [Theory]
    [InlineData(null, "NKJV")]
    [InlineData("", "NKJV")]
    [InlineData("John", null)]
    [InlineData("John", "")]
    public void Validate_Returns_Null_For_Missing_Book_Or_Version(string? book, string? version)
    {
        var result = _validator.Validate(new ScriptureMatch
        {
            Book = book!,
            Chapter = 3,
            VerseStart = 16,
            Version = version!,
        });
        result.Should().BeNull();
    }

    [Fact]
    public void Validate_Roundtrips_Quote_And_Confidence()
    {
        var result = _validator.Validate(NewMatch(quote: "Hello there", confidence: 0.73));
        result.Should().NotBeNull();
        result!.Quote.Should().Be("Hello there");
        result.Confidence.Should().Be(0.73);
    }

    [Fact]
    public void Validate_Defaults_Quote_To_Empty_When_Null()
    {
        var result = _validator.Validate(new ScriptureMatch
        {
            Book = "John",
            Chapter = 3,
            VerseStart = 16,
            Version = "NKJV",
            Quote = null!,
            Confidence = 0.9,
        });
        result.Should().NotBeNull();
        result!.Quote.Should().BeEmpty();
    }
}
