namespace AngularApiTemplate.Api.Authentication;

public sealed class EntraOptions
{
    public const string SectionName = "Entra";
    public bool Enabled { get; init; }
    public string Instance { get; init; } = "";
    public string TenantId { get; init; } = "";
    public string ClientId { get; init; } = "";
    public string Audience { get; init; } = "";

    public bool IsValid()
    {
        return !Enabled ||
            (Guid.TryParse(TenantId, out var tenant) && tenant != Guid.Empty &&
             Guid.TryParse(ClientId, out var client) && client != Guid.Empty &&
             Audience == ClientId &&
             Uri.TryCreate(Instance, UriKind.Absolute, out var uri) &&
             uri.Scheme == Uri.UriSchemeHttps && uri.Host.EndsWith(".ciamlogin.com", StringComparison.Ordinal) &&
             uri.AbsolutePath == "/" && string.IsNullOrEmpty(uri.UserInfo) && uri.IsDefaultPort && string.IsNullOrEmpty(uri.Query) && string.IsNullOrEmpty(uri.Fragment));
    }
}
