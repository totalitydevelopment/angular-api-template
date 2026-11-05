namespace AngularApiTemplate.Infrastructure.IntegrationTests;

public sealed class PersistenceRegistrationTests
{
    [Fact]
    public void Context_interface_and_implementation_share_one_instance_per_scope()
    {
        var builder = CreateBuilder();
        builder.Configuration["ConnectionStrings:ApplicationDatabase"] =
            "Server=localhost;Database=RegistrationTests;Integrated Security=True";
        builder.Services.AddInfrastructure(builder.Configuration);
        using var host = builder.Build();
        using var scope = host.Services.CreateScope();
        var concrete = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var contract = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        Assert.Same(concrete, contract);
        Assert.Equal("Microsoft.EntityFrameworkCore.SqlServer", concrete.Database.ProviderName);
        using var otherScope = host.Services.CreateScope();
        Assert.NotSame(concrete, otherScope.ServiceProvider.GetRequiredService<IApplicationDbContext>());
    }

    [Theory]
    [InlineData("")]
    [InlineData("Password=not-a-real-secret")]
    [InlineData("not a connection string")]
    public async Task Invalid_connection_configuration_fails_startup_without_echoing_values(string value)
    {
        var builder = CreateBuilder();
        builder.Configuration["ConnectionStrings:ApplicationDatabase"] = value;
        builder.Services.AddInfrastructure(builder.Configuration);
        using var host = builder.Build();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var exception = await Assert.ThrowsAsync<OptionsValidationException>(
            () => host.StartAsync(timeout.Token));
        Assert.Equal(
            "ConnectionStrings:ApplicationDatabase requires a valid SQL Server connection string with Server and Database.",
            exception.Message);
    }

    private static HostApplicationBuilder CreateBuilder()
    {
        var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
        {
            DisableDefaults = true,
            EnvironmentName = "Testing"
        });
        builder.Configuration["Foundation:ServiceName"] = "PersistenceRegistrationTests";
        return builder;
    }
}
