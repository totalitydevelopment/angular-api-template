namespace AngularApiTemplate.Infrastructure.Configuration;

public sealed class KeyVaultOptions
{
    public const string SectionName = "KeyVault";

    public string Name { get; init; } = string.Empty;
}
