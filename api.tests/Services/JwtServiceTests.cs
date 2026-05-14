using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HOPTranscribe.Api.Configuration;
using HOPTranscribe.Api.Services.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace HOPTranscribe.Api.Tests.Services;

public class JwtServiceTests
{
    private const string ValidSigningKey = "this-is-a-test-only-signing-key-32+chars";

    private static JwtService BuildService(JwtSettings? settings = null)
    {
        settings ??= new JwtSettings
        {
            Issuer = "test-issuer",
            Audience = "test-audience",
            SigningKey = ValidSigningKey,
            ExpiryMinutes = 60,
        };
        return new JwtService(Options.Create(settings));
    }

    [Fact]
    public void IssueToken_Returns_Non_Empty_Token_And_Future_Expiry()
    {
        var svc = BuildService();
        var before = DateTimeOffset.UtcNow;

        var (token, expiresAt) = svc.IssueToken("alice");

        token.Should().NotBeNullOrWhiteSpace();
        expiresAt.Should().BeAfter(before);
        (expiresAt - before).TotalMinutes.Should().BeApproximately(60, precision: 1);
    }

    [Fact]
    public void IssueToken_Includes_Sub_And_Name_Claims_For_Username()
    {
        var svc = BuildService();

        var (token, _) = svc.IssueToken("alice");

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == "alice");
        jwt.Claims.Should().Contain(c => c.Type == ClaimTypes.Name && c.Value == "alice");
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Jti);
    }

    [Fact]
    public void IssueToken_Produces_Unique_Jti_Per_Call()
    {
        var svc = BuildService();
        var handler = new JwtSecurityTokenHandler();

        var jtis = Enumerable.Range(0, 5)
            .Select(_ => handler.ReadJwtToken(svc.IssueToken("alice").token)
                .Claims.First(c => c.Type == JwtRegisteredClaimNames.Jti).Value)
            .ToList();

        jtis.Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public void IssueToken_Sets_Issuer_And_Audience_From_Settings()
    {
        var svc = BuildService(new JwtSettings
        {
            Issuer = "my-issuer",
            Audience = "my-audience",
            SigningKey = ValidSigningKey,
            ExpiryMinutes = 30,
        });

        var (token, _) = svc.IssueToken("alice");

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Issuer.Should().Be("my-issuer");
        jwt.Audiences.Should().ContainSingle().Which.Should().Be("my-audience");
    }

    [Fact]
    public void IssueToken_Produces_Token_That_Validates_With_Same_Settings()
    {
        var settings = new JwtSettings
        {
            Issuer = "test-issuer",
            Audience = "test-audience",
            SigningKey = ValidSigningKey,
            ExpiryMinutes = 60,
        };
        var svc = new JwtService(Options.Create(settings));
        var (token, _) = svc.IssueToken("bob");

        var handler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = settings.Issuer,
            ValidAudience = settings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SigningKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };

        var act = () => handler.ValidateToken(token, validationParameters, out _);

        act.Should().NotThrow();
    }

    [Fact]
    public void IssueToken_Produces_Token_That_Fails_Validation_With_Different_Signing_Key()
    {
        var issuerSettings = new JwtSettings
        {
            Issuer = "test-issuer",
            Audience = "test-audience",
            SigningKey = ValidSigningKey,
            ExpiryMinutes = 60,
        };
        var svc = new JwtService(Options.Create(issuerSettings));
        var (token, _) = svc.IssueToken("bob");

        var handler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuerSettings.Issuer,
            ValidAudience = issuerSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes("a-completely-different-32-char-key!!!")),
            ClockSkew = TimeSpan.FromSeconds(30),
        };

        var act = () => handler.ValidateToken(token, validationParameters, out _);

        act.Should().Throw<SecurityTokenInvalidSignatureException>();
    }

    [Fact]
    public void Constructor_Throws_When_Signing_Key_Is_Missing()
    {
        var settings = new JwtSettings { SigningKey = string.Empty };
        var act = () => new JwtService(Options.Create(settings));
        act.Should().Throw<InvalidOperationException>().WithMessage("*SigningKey*");
    }

    [Fact]
    public void Constructor_Throws_When_Signing_Key_Too_Short()
    {
        var settings = new JwtSettings { SigningKey = "short" };
        var act = () => new JwtService(Options.Create(settings));
        act.Should().Throw<InvalidOperationException>().WithMessage("*32*");
    }
}
