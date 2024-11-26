

using PhotoDatabaseLib;
// ReSharper disable UnusedAutoPropertyAccessor.Global

namespace PhotoDatabaseWebApi
{
    public record PhotoRecord
    {
        public int Id { get; set; }
        public DateTime ReferenceDate { get; set; }
        public DateTime LastUpdated { get; set; }
        public string FileName { get; set; } = "";
        public int Width { get; set; }
        public int Height { get; set; }
        public int FileSize { get; set; }
        public int ThumbnailWidth { get; set; }
        public int ThumbnailHeight { get; set; }
        public string Tags { get; set; } = "";


        public static PhotoRecord CreateFromPhotoInfo(PhotoInfo pi)
        {
            return new PhotoRecord()
            {
                Id = pi.Id,
                ReferenceDate = pi.ReferenceDate,
                FileSize = pi.FileSize,
                Height = pi.Height,
                Width = pi.Width,
                LastUpdated = pi.LastUpdated,
                ThumbnailWidth = pi.ThumbnailWidth,
                ThumbnailHeight = pi.ThumbnailHeight,
                FileName = pi.FileName,
                Tags = pi.Tags ?? "",
            };
        }
    }

    public record PhotoTagsUpdate
    {
        public int PhotoId { get; set; }
        public string[] Tags { get; set; } = [];
    }
}
