namespace AngularApiTemplate.Api.Authentication;

public static class AuthenticationExtensions
{
    public const string CustomerPolicy = "Customer";

    public static IServiceCollection AddCustomerAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection(EntraOptions.SectionName);
        var settings = section.Get<EntraOptions>() ?? new EntraOptions();
        services.AddOptions<EntraOptions>().Bind(section)
            .Validate(options => options.IsValid(),
                "Entra requires valid TenantId, ClientId, matching v2 Audience and HTTPS CIAM Instance when Enabled.")
            .ValidateOnStart();

        if (settings.Enabled)
        {
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddMicrosoftIdentityWebApi(options =>
                {
                    options.MapInboundClaims = false;
                    options.TokenValidationParameters.ValidAudience = settings.Audience;
                }, options =>
                {
                    options.Instance = settings.Instance;
                    options.TenantId = settings.TenantId;
                    options.ClientId = settings.ClientId;
                    // Customer access currently needs only a valid user token, not endpoint scopes/roles.
                    options.AllowWebApiToBeAuthorizedByACL = true;
                });
        }
        else
        {
            services.AddAuthentication();
        }

        services.AddAuthorization(options => options.AddPolicy(CustomerPolicy, policy =>
        {
            if (settings.Enabled)
            {
                policy.RequireAuthenticatedUser();
                // Exclude app-only tokens; roles can be added to this shared policy later.
                policy.RequireClaim("oid");
                policy.RequireAssertion(context => context.User.HasClaim(claim =>
                    claim.Type == "scp" && !string.IsNullOrWhiteSpace(claim.Value)));
            }
            else
            {
                // Deliberate template bypass: endpoint policy attributes remain reviewable.
                policy.RequireAssertion(_ => true);
            }
        }));
        return services;
    }
}
