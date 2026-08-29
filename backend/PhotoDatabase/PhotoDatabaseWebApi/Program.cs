var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Configuration.AddJsonFile(
    Path.Combine(Directory.GetCurrentDirectory(), "config/appsettings-local.json"), optional: true, reloadOnChange: false);

var app = builder.Build();

// global cors policy
app.UseCors(x => x
    .AllowAnyMethod()
    .AllowAnyHeader()
    .SetIsOriginAllowed(origin => true) // allow any origin
    .AllowCredentials()); // allow credentials

// Configure the HTTP request pipeline.
app.UseAuthorization();

app.MapControllers();
app.MapOpenApi(); // spec served at /openapi/v1.json

app.Run();
