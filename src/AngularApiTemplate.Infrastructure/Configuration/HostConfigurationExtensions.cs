namespace AngularApiTemplate.Infrastructure.Configuration;

public static class HostConfigurationExtensions
{
    public static IHostApplicationBuilder AddTemplateConfiguration(
        this IHostApplicationBuilder builder, string[] args)
    {
        var options = builder.Configuration.GetSection(KeyVaultOptions.SectionName)
            .Get<KeyVaultOptions>() ?? new KeyVaultOptions();

        if (!System.Text.RegularExpressions.Regex.IsMatch(options.Name,
            "^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$") || options.Name.Contains("--", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "KeyVault:Name must be a valid Azure Key Vault name (3–24 letters, digits or hyphens, starting with a letter, without consecutive or trailing hyphens).");
        }

        var vaultUri = new Uri($"https://{options.Name}.vault.azure.net/");

        TokenCredential credential = builder.Environment.IsDevelopment()
            ? new DefaultAzureCredential(new DefaultAzureCredentialOptions
            {
                ExcludeManagedIdentityCredential = true
            })
            : new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned);

        try
        {
            builder.Configuration.AddAzureKeyVault(vaultUri, credential);
        }
        catch (Exception exception) when (exception is RequestFailedException
            or AuthenticationFailedException or HttpRequestException)
        {
            // Do not attach the SDK exception: its diagnostics can contain sensitive data.
            throw new InvalidOperationException(
                "Required Key Vault could not be loaded. Check Azure identity, secret list/get permissions and vault network access.");
        }

        // Keep explicit environment and command-line overrides above vault values.
        builder.Configuration.AddEnvironmentVariables();
        builder.Configuration.AddCommandLine(args);
        return builder;
    }
}
