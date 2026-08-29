

using System.Text.Json.Serialization;
using PhotoDatabaseLib;
// ReSharper disable UnusedAutoPropertyAccessor.Global

namespace PhotoDatabaseWebApi
{
    // All/Search return lean PhotoRecord by default and PhotoRecordExtended
    // with extended=true. JsonDerivedType makes System.Text.Json serialize
    // the runtime type (no discriminator field is emitted) - without it the
    // extended properties would be dropped when the declared type is PhotoRecord.
    [JsonDerivedType(typeof(PhotoRecordExtended))]
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
            var record = new PhotoRecord();
            record.Fill(pi);
            return record;
        }

        protected void Fill(PhotoInfo pi)
        {
            Id = pi.Id;
            ReferenceDate = pi.ReferenceDate;
            FileSize = pi.FileSize;
            Height = pi.Height;
            Width = pi.Width;
            LastUpdated = pi.LastUpdated;
            ThumbnailWidth = pi.ThumbnailWidth;
            ThumbnailHeight = pi.ThumbnailHeight;
            FileName = pi.FileName;
            Tags = pi.Tags ?? "";
        }
    }

    public record PhotoRecordExtended : PhotoRecord
    {
        public string ContentDescription { get; set; } = "";
        public string People { get; set; } = "";
        public string LocationDescription { get; set; } = "";
        public DateTime? ExifDate { get; set; }
        public string? ExifMake { get; set; }
        public string? ExifModel { get; set; }
        public double? ExifLongitude { get; set; }
        public double? ExifLatitude { get; set; }

        public new static PhotoRecordExtended CreateFromPhotoInfo(PhotoInfo pi)
        {
            var record = new PhotoRecordExtended();
            record.Fill(pi);
            record.ContentDescription = pi.ContentDescription ?? "";
            record.People = pi.People ?? "";
            record.LocationDescription = pi.LocationDescription ?? "";
            record.ExifDate = pi.ExifDate;
            record.ExifMake = pi.ExifMake;
            record.ExifModel = pi.ExifModel;
            record.ExifLongitude = pi.ExifLongitude;
            record.ExifLatitude = pi.ExifLatitude;
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
