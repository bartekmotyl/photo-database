namespace PhotoDatabaseIndexer
{
    public record PhotoIndexerSettings
    {
        public string DatabasePath { get; set; } = "photo-database.db";
        public string ThumbnailsFolder { get; set; } = "thumbnails";
        public string[] FoldersToAnalyze { get; set; } = [];
        public int ThumbnailSize { get; set; } = 600;
        public int ThumbnailJpgQuality { get; set; } = 75;
    }
}
