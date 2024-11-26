// ReSharper disable AutoPropertyCanBeMadeGetOnly.Global
// ReSharper disable UnusedAutoPropertyAccessor.Global
// ReSharper disable UnusedMember.Global

using SQLite;
using NotNullAttribute = SQLite.NotNullAttribute;

namespace PhotoDatabaseLib
{
    public record PhotoInfo
    {
        [PrimaryKey, AutoIncrement, NotNull]
        public int Id { get; set; }
        [Indexed(Name = "IDX1"), NotNull]
        public string HashSha1 { get; set; } = ""; // we allow duplicated hashcodes!
        [Indexed(Name = "IDX2"), NotNull, Unique]
        public string FilePath { get; set; } = "";
        [Indexed(Name = "IDX3"), NotNull]
        public string FolderPath { get; set; } = "";
        [Indexed(Name = "IDX4"), NotNull]
        public DateTime ReferenceDate { get; set; }
        [NotNull]
        public string FileName { get; set; } = "";

        public PhotoInfo()
        {
        }
        
        public PhotoInfo(string hashSha1, string filePath, string folderPath, string fileName, int formatVersion, DateTime lastUpdated, int width, int height, int fileSize, DateTime fileDate, DateTime referenceDate, int thumbnailFileSize, int thumbnailWidth, int thumbnailHeight)
        {
            OperationLog = "";

            HashSha1 = hashSha1;
            FilePath = filePath;
            FolderPath = folderPath;
            FileName = fileName;
            FormatVersion = formatVersion;
            LastUpdated = lastUpdated;
            Width = width;
            Height = height;
            FileSize = fileSize;
            FileDate = fileDate;
            ReferenceDate = referenceDate;
            ThumbnailFileSize = thumbnailFileSize;
            ThumbnailWidth = thumbnailWidth;
            ThumbnailHeight = thumbnailHeight;
        }

        public List<String> GetTagsAsList()
        {
            return new List<string>((Tags ?? "").Split(",")).Where(p => p != "").ToList();
        }
        public void SetTagsFromList(IList<string> tagsAsList)
        {
            Tags =  string.Join("", tagsAsList.Select(t => $"{t},").ToArray());
        }


        public void AddTag(string tag)
        {
            tag = tag.Trim();
            if (tag == "")
                throw new ArgumentException("empty tags not allowed");
            if (tag.Contains(","))
                throw new ArgumentException("tag may not contain comma");

            var tagsAsList = GetTagsAsList();
            if (tagsAsList.Contains(tag))
                return; // tag already added 

            tagsAsList.Add(tag);
            SetTagsFromList(tagsAsList);
        }

        public void RemoveTag(string tag)
        {
            tag = tag.Trim();
            if (tag == "")
                throw new ArgumentException("empty tags not allowed");
            if (tag.Contains(","))
                throw new ArgumentException("tag may not contain comma");

            var tagsAsList = GetTagsAsList();
            if (!tagsAsList.Contains(tag))
                return; // tag not included

            tagsAsList.Remove(tag);
            SetTagsFromList(tagsAsList);
        }

        [NotNull]
        public int FormatVersion { get; set; }
        [NotNull]
        public DateTime LastUpdated { get; set; }
        [NotNull]
        public string OperationLog { get; set; } = "";

        [NotNull]
        public int Width { get; set; }
        [NotNull]
        public int Height { get; set; }

        [NotNull]
        public int FileSize { get; set; }
        [NotNull]
        public DateTime FileDate { get; set; }

        [NotNull]
        public int ThumbnailFileSize { get; set; }
        [NotNull]
        public int ThumbnailWidth { get; set; }
        [NotNull]
        public int ThumbnailHeight { get; set; }

        public DateTime? ExifDate { get; set; }
        public string? ExifMake { get; set; }
        public string? ExifModel { get; set; }
        public double? ExifLongitude { get; set; }
        public double? ExifLatitude { get; set; }
        public string? Coordinates { get; set; }
        public string? LocationDescription { get; set; }

        public string? ContentDescription { get; set; }

        public string? People { get; set; }

        public string? SimilarityFactor { get; set; }

        public string? Tags { get; set; }
    }
}
