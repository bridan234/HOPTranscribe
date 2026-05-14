using HOPTranscribe.Api.Validation;

namespace HOPTranscribe.Api.Tests.Validation;

public class BibleBookCatalogTests
{
    private readonly BibleBookCatalog _catalog = new();

    [Fact]
    public void Catalog_Has_All_66_Canonical_Books()
    {
        _catalog.CanonicalBooks.Should().HaveCount(66);
    }

    [Theory]
    [InlineData("Genesis", "Genesis")]
    [InlineData("genesis", "Genesis")]
    [InlineData("  Genesis  ", "Genesis")]
    [InlineData("John", "John")]
    [InlineData("Revelation", "Revelation")]
    public void TryGetCanonical_Resolves_Exact_Name_Case_Insensitively(string input, string expected)
    {
        _catalog.TryGetCanonical(input, out var hit).Should().BeTrue();
        hit.Should().Be(expected);
    }

    [Theory]
    [InlineData("Revelations", "Revelation")]
    [InlineData("Rev", "Revelation")]
    [InlineData("Psalm", "Psalms")]
    [InlineData("Ps", "Psalms")]
    [InlineData("Cant", "Song of Solomon")]
    [InlineData("Song of Songs", "Song of Solomon")]
    [InlineData("Canticles", "Song of Solomon")]
    public void TryGetCanonical_Resolves_Aliases(string alias, string expected)
    {
        _catalog.TryGetCanonical(alias, out var hit).Should().BeTrue();
        hit.Should().Be(expected);
    }

    [Theory]
    [InlineData("First John", "1 John")]
    [InlineData("I John", "1 John")]
    [InlineData("1Jn", "1 John")]
    [InlineData("1 Jn", "1 John")]
    [InlineData("Second Samuel", "2 Samuel")]
    [InlineData("II Samuel", "2 Samuel")]
    [InlineData("Third John", "3 John")]
    [InlineData("III John", "3 John")]
    public void TryGetCanonical_Resolves_Numbered_Book_Aliases(string alias, string expected)
    {
        _catalog.TryGetCanonical(alias, out var hit).Should().BeTrue();
        hit.Should().Be(expected);
    }

    [Theory]
    [InlineData("1John", "1 John")]
    [InlineData("1Corinthians", "1 Corinthians")]
    [InlineData("SongofSolomon", "Song of Solomon")]
    public void TryGetCanonical_Resolves_Names_Without_Spaces(string input, string expected)
    {
        _catalog.TryGetCanonical(input, out var hit).Should().BeTrue();
        hit.Should().Be(expected);
    }

    [Theory]
    [InlineData("Hezekiah")]
    [InlineData("Maccabees")]
    [InlineData("Enoch")]
    [InlineData("")]
    [InlineData("   ")]
    public void TryGetCanonical_Returns_False_For_Non_Canonical(string input)
    {
        _catalog.TryGetCanonical(input, out var hit).Should().BeFalse();
        hit.Should().BeEmpty();
    }

    [Fact]
    public void Genesis_Has_50_Chapters()
    {
        _catalog.GetChapterCount("Genesis").Should().Be(50);
    }

    [Fact]
    public void Psalms_Has_150_Chapters()
    {
        _catalog.GetChapterCount("Psalms").Should().Be(150);
    }

    [Fact]
    public void Psalm_117_Has_2_Verses_The_Shortest_Chapter()
    {
        _catalog.GetVerseCount("Psalms", 117).Should().Be(2);
    }

    [Fact]
    public void Psalm_119_Has_176_Verses_The_Longest_Chapter()
    {
        _catalog.GetVerseCount("Psalms", 119).Should().Be(176);
    }

    [Fact]
    public void John_3_Has_36_Verses()
    {
        _catalog.GetVerseCount("John", 3).Should().Be(36);
    }

    [Fact]
    public void GetVerseCount_Returns_0_For_Out_Of_Range_Chapter()
    {
        _catalog.GetVerseCount("John", 0).Should().Be(0);
        _catalog.GetVerseCount("John", 99).Should().Be(0);
    }

    [Fact]
    public void GetChapterCount_Returns_0_For_Unknown_Book()
    {
        _catalog.GetChapterCount("Hezekiah").Should().Be(0);
    }
}
