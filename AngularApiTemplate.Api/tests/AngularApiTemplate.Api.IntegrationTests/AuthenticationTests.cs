namespace AngularApiTemplate.Api.IntegrationTests;

[Collection("Tasks SQL Server")]
public sealed class AuthenticationTests(Tasks.TasksSqlFixture fixture)
{
    private const string TenantId = "11111111-1111-4111-8111-111111111111";
    private const string ClientId = "22222222-2222-4222-8222-222222222222";
    private const string Issuer = "https://template.ciamlogin.com/" + TenantId + "/v2.0";

    [Fact]
    public async Task Enabled_authentication_rejects_anonymous_and_app_only_callers_but_keeps_health_public()
    {
        using var rsa = RSA.Create(2048);
        var key = new RsaSecurityKey(rsa) { KeyId = "test-signing-key" };
        await using var factory = CreateFactory(key);
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/tasks")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(key, false));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/tasks")).StatusCode);
    }

    [Fact]
    public async Task Customer_token_can_complete_the_sql_backed_crud_lifecycle()
    {
        using var rsa = RSA.Create(2048);
        var key = new RsaSecurityKey(rsa) { KeyId = "test-signing-key" };
        await using var factory = CreateFactory(key);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(key, true));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/tasks")).StatusCode);
        using var created = await client.PostAsJsonAsync("/tasks", new { title = "Authenticated template task" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var task = (await created.Content.ReadFromJsonAsync<TaskResponse>())!;
        var path = $"/tasks/{task.Id}";
        try
        {
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(path)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync(path,
                new { title = "Changed", description = (string?)null, isCompleted = true })).StatusCode);
        }
        finally
        {
            Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(path)).StatusCode);
        }
    }

    [Theory]
    [InlineData("audience")]
    [InlineData("issuer")]
    [InlineData("expired")]
    [InlineData("signature")]
    public async Task Invalid_tokens_are_rejected(string invalid)
    {
        using var rsa = RSA.Create(2048);
        using var otherRsa = RSA.Create(2048);
        var key = new RsaSecurityKey(rsa) { KeyId = "test-signing-key" };
        var signingKey = invalid == "signature" ? new RsaSecurityKey(otherRsa) { KeyId = key.KeyId } : key;
        await using var factory = CreateFactory(key);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(signingKey, true, invalid));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/tasks")).StatusCode);
    }

    private WebApplicationFactory<Program> CreateFactory(SecurityKey key)
    {
        return fixture.Factory.WithWebHostBuilder(builder => builder
            .UseSetting("Entra:Enabled", "true")
            .UseSetting("Entra:Instance", "https://template.ciamlogin.com/")
            .UseSetting("Entra:TenantId", TenantId)
            .UseSetting("Entra:ClientId", ClientId)
            .UseSetting("Entra:Audience", ClientId)
            .ConfigureTestServices(services => services.PostConfigure<JwtBearerOptions>(
                JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    // Supply local metadata/keys while exercising the real JWT handler and policy.
                    var metadata = new OpenIdConnectConfiguration { Issuer = Issuer };
                    metadata.SigningKeys.Add(key);
                    options.ConfigurationManager = new Microsoft.IdentityModel.Protocols.StaticConfigurationManager<OpenIdConnectConfiguration>(metadata);
                    options.TokenValidationParameters.ValidIssuer = Issuer;
                })));
    }

    private static string Token(SecurityKey key, bool customer, string? invalid = null)
    {
        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new("sub", "test-customer"), new("oid", "33333333-3333-4333-8333-333333333333"),
            new("tid", TenantId), new("ver", "2.0")
        };
        if (customer)
        {
            claims.Add(new Claim("scp", "access_as_customer"));
        }
        else
        {
            claims.Add(new Claim("roles", "FutureRole"));
        }
        var token = new JwtSecurityToken(invalid == "issuer" ? "https://wrong.invalid/v2.0" : Issuer,
            invalid == "audience" ? "wrong-audience" : ClientId, claims,
            now.AddHours(-2), invalid == "expired" ? now.AddHours(-1) : now.AddMinutes(5),
            new SigningCredentials(key, SecurityAlgorithms.RsaSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public sealed class EntraConfigurationTests
{
    [Fact]
    public void Disabled_configuration_accepts_placeholders_without_activating_msal_or_jwt()
    {
        using var provider = Services(new Dictionary<string, string?> { ["Entra:Enabled"] = "false" });
        Assert.False(provider.GetRequiredService<IOptions<EntraOptions>>().Value.Enabled);
    }

    [Theory]
    [InlineData("Entra:TenantId", "placeholder")]
    [InlineData("Entra:ClientId", "00000000-0000-0000-0000-000000000000")]
    [InlineData("Entra:Audience", "wrong")]
    [InlineData("Entra:Instance", "http://template.ciamlogin.com/")]
    [InlineData("Entra:Instance", "https://untrusted.invalid/")]
    public void Enabled_configuration_validates_typed_settings(string setting, string value)
    {
        var settings = new Dictionary<string, string?>
        {
            ["Entra:Enabled"] = "true",
            ["Entra:TenantId"] = "11111111-1111-4111-8111-111111111111",
            ["Entra:ClientId"] = "22222222-2222-4222-8222-222222222222",
            ["Entra:Audience"] = "22222222-2222-4222-8222-222222222222",
            ["Entra:Instance"] = "https://template.ciamlogin.com/"
        };
        settings[setting] = value;
        using var provider = Services(settings);
        var error = Assert.Throws<OptionsValidationException>(() => provider.GetRequiredService<IOptions<EntraOptions>>().Value);
        Assert.DoesNotContain(value, error.Message);
    }

    [Fact]
    public void Enabling_placeholders_fails_host_startup()
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder
            .UseEnvironment("Development").UseSetting("Entra:Enabled", "true")
            .UseSetting("Entra:Instance", "https://YOUR-TENANT.ciamlogin.com/")
            .UseSetting("Entra:TenantId", "YOUR-TENANT-ID")
            .UseSetting("Entra:ClientId", "YOUR-API-CLIENT-ID")
            .UseSetting("Entra:Audience", "YOUR-API-CLIENT-ID")
            .UseSetting("ConnectionStrings:ApplicationDatabase", "Server=localhost;Database=ConfigTest;Integrated Security=True"));
        Assert.Throws<OptionsValidationException>(() => factory.CreateClient());
    }

    private static ServiceProvider Services(Dictionary<string, string?> settings)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCustomerAuthentication(configuration);
        return services.BuildServiceProvider();
    }
}
