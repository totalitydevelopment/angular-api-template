namespace AngularApiTemplate.Api.IntegrationTests.Tasks;

public sealed class TasksSqlFixture : IAsyncLifetime
{
    public string ConnectionString { get; private set; } = string.Empty;
    public WebApplicationFactory<Program> Factory { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        var supplied = Environment.GetEnvironmentVariable("TASKS_TEST_SQL_CONNECTION");
        if (string.IsNullOrWhiteSpace(supplied))
        {
            throw new InvalidOperationException(
                "SQL Server tests require the dedicated local database. Run python3 scripts/tasks-local.py test.");
        }

        var connection = new SqlConnectionStringBuilder(supplied);
        if (connection.DataSource is not ("127.0.0.1,11433" or "localhost,11433"))
        {
            throw new InvalidOperationException("Tasks tests only allow the dedicated local SQL Server on port 11433.");
        }

        connection.InitialCatalog = $"AngularApiTemplate_Tasks_Tests_{Guid.NewGuid():N}";
        ConnectionString = connection.ConnectionString;
        await using var context = CreateContext();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(60));
        await context.Database.MigrateAsync(timeout.Token);
        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder
            .UseEnvironment("Development")
            .UseSetting("ConnectionStrings:ApplicationDatabase", ConnectionString));
    }

    public AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseSqlServer(ConnectionString).Options);

    public async Task DisposeAsync()
    {
        if (Factory is not null)
        {
            await Factory.DisposeAsync();
        }

        if (!string.IsNullOrEmpty(ConnectionString))
        {
            await using var context = CreateContext();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            await context.Database.EnsureDeletedAsync(timeout.Token);
        }
    }
}

[CollectionDefinition("Tasks SQL Server")]
public sealed class TasksSqlCollection : ICollectionFixture<TasksSqlFixture>;
