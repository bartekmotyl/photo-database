

using System.Text.Json.Serialization;
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

        // Extended data - only populated when explicitly requested (Single,
        // or All/Search with extended=true) to keep list responses small.
        // Null values are omitted from the JSON output.
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ContentDescription { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? People { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? LocationDescription { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public DateTime? ExifDate { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ExifMake { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ExifModel { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public double? ExifLongitude { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public double? ExifLatitude { get; set; }


        public static PhotoRecord CreateFromPhotoInfo(PhotoInfo pi, bool extended = false)
        {
            var record = new PhotoRecord()
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
            if (extended)
            {
                record.ContentDescription = pi.ContentDescription ?? "";
                record.People = pi.People ?? "";
                record.LocationDescription = pi.LocationDescription ?? "";
                record.ExifDate = pi.ExifDate;
                record.ExifMake = pi.ExifMake;
                record.ExifModel = pi.ExifModel;
                record.ExifLongitude = pi.ExifLongitude;
                record.ExifLatitude = pi.ExifLatitude;
            }
            return record;
        }
    }

    public record PhotoTagsUpdate
    {
        public int PhotoId { get; set; }
        public string[] Tags { get; set; } = [];
    }

    public record PhotoDescriptionUpdate
    {
        public int PhotoId { get; set; }
        public string ContentDescription { get; set; } = "";
    }
}
