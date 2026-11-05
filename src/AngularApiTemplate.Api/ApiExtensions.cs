namespace AngularApiTemplate.Api;

public static class ApiExtensions
{
    private const string PortalCorsPolicy = "Portal";

    public static IServiceCollection AddApi(this IServiceCollection services, IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        services.AddCors(options => options.AddPolicy(PortalCorsPolicy, policy =>
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));
        services.AddControllers();
        services.AddOpenApi();
        services.AddHealthChecks();
        services.AddProblemDetails();
        return services;
    }

    public static WebApplication UseApiPipeline(this WebApplication app)
    {
        app.UseExceptionHandler();
        if (!app.Environment.IsDevelopment())
        {
            app.UseHsts();
            app.UseHttpsRedirection();
        }

        app.UseRouting();
        app.UseCors(PortalCorsPolicy);

        // Authentication and current-user access will be added with the first identity provider.
        return app;
    }

    public static WebApplication MapApiEndpoints(this WebApplication app)
    {
        app.MapHealthChecks("/health");
        app.MapControllers();
        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        return app;
    }
}
