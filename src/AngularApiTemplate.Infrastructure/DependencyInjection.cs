namespace AngularApiTemplate.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<Configuration.FoundationOptions>()
            .Bind(configuration.GetSection(Configuration.FoundationOptions.SectionName))
            .Validate(options => !string.IsNullOrWhiteSpace(options.ServiceName),
                "Foundation:ServiceName is required.")
            .ValidateOnStart();
        services.AddOptions<DatabaseOptions>()
            .Bind(configuration.GetSection(DatabaseOptions.SectionName))
            .Validate(DatabaseOptions.IsValid,
                "ConnectionStrings:ApplicationDatabase requires a valid SQL Server connection string with Server and Database.")
            .ValidateOnStart();
        services.AddDbContext<AppDbContext>((provider, options) => options.UseSqlServer(
            provider.GetRequiredService<IOptions<DatabaseOptions>>().Value.ApplicationDatabase,
            sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name)));
        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        return services;
    }
}
