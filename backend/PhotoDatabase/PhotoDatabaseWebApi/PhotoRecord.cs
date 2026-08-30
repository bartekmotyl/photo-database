

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
        public int? AestheticScore0 { get; set; }
        public string? AestheticScoreDescription0 { get; set; }
        public int? AestheticScore1 { get; set; }
        public string? AestheticScoreDescription1 { get; set; }
        public int? AestheticScore2 { get; set; }
        public string? AestheticScoreDescription2 { get; set; }

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
            record.AestheticScore0 = pi.AestheticScore0;
            record.AestheticScoreDescription0 = pi.AestheticScoreDescription0;
            record.AestheticScore1 = pi.AestheticScore1;
            record.AestheticScoreDescription1 = pi.AestheticScoreDescription1;
            record.AestheticScore2 = pi.AestheticScore2;
            record.AestheticScoreDescription2 = pi.AestheticScoreDescription2;
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

    public record PhotoAestheticScoreUpdate
    {
        public int PhotoId { get; set; }
        // Which of the three aesthetic slots (0-2) to write.
        public int Slot { get; set; }
        // Null clears the slot.
        public int? Score { get; set; }
        public string? ScoreDescription { get; set; }
    }
}
