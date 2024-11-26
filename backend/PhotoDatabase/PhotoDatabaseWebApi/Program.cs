var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

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

app.Run();
