// See https://aka.ms/new-console-template for more information

using Microsoft.Extensions.Logging;
using PhotoDatabaseIndexer;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Console;


IConfiguration configuration = new ConfigurationBuilder()
  .SetBasePath(Directory.GetCurrentDirectory())
  .AddJsonFile(Path.Combine("config", "appsettings.json"), optional: false, reloadOnChange: false)
  .AddJsonFile(Path.Combine("config", "appsettings-local.json"), optional: true, reloadOnChange: false)
  .AddEnvironmentVariables()
  .AddCommandLine(args)
  .Build();


var hostBuilder = Host.CreateDefaultBuilder(args)
            .ConfigureServices((hostContext, services) =>
            {
                var photoIndexerSettings = new PhotoIndexerSettings();
                configuration.Bind("PhotoIndexer", photoIndexerSettings);
                services.AddSingleton(photoIndexerSettings);
                services.AddHostedService<PhotoIndexerService>();
                services.AddLogging(opt =>
                {
                    opt.AddSimpleConsole(options =>
                    {
                        options.ColorBehavior = LoggerColorBehavior.Disabled;
                        options.SingleLine = true;
                        options.TimestampFormat = "yyyy-MM-dd HH:mm:ss ";
                    });
                });
            });


await hostBuilder.RunConsoleAsync();
