var builder = WebApplication.CreateBuilder(args);
// Uncomment to load secrets from the vault named in appsettings.
// builder.AddTemplateConfiguration(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApi(builder.Configuration);

var app = builder.Build();
app.UseApiPipeline();
app.MapApiEndpoints();
app.Run();

public partial class Program;
