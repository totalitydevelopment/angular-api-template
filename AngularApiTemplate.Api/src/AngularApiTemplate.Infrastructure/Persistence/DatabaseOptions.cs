namespace AngularApiTemplate.Infrastructure.Persistence;

public sealed class DatabaseOptions
{
    public const string SectionName = "ConnectionStrings";

    public string ApplicationDatabase { get; init; } = string.Empty;

    internal static bool IsValid(DatabaseOptions options)
    {
        try
        {
            var connection = new SqlConnectionStringBuilder(options.ApplicationDatabase);
            return !string.IsNullOrWhiteSpace(connection.DataSource)
                && !string.IsNullOrWhiteSpace(connection.InitialCatalog);
        }
        catch (ArgumentException)
        {
            return false;
        }
    }
}
