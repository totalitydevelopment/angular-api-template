var builder = FunctionsApplication.CreateBuilder(args);
// Uncomment to load secrets from the vault named in appsettings.
// builder.AddTemplateConfiguration(args);
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

await builder.Build().RunAsync();
