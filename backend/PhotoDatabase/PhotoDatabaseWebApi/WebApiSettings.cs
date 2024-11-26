// ReSharper disable AutoPropertyCanBeMadeGetOnly.Global
namespace PhotoDatabaseWebApi
{
    public record WebApiSettings
    {
        public string DatabasePath { get; set; } = "";
        public string ThumbnailsFolder { get; set; } = "";
    }
}
