using System.Globalization;
using System.Security.Cryptography;
using MetadataExtractor;
using MetadataExtractor.Formats.Exif;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PhotoDatabaseLib;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
using SQLite;
// ReSharper disable PropertyCanBeMadeInitOnly.Local

namespace PhotoDatabaseIndexer
{
    public record PhotoIndexerStats
    {
        public int TotalFoldersProcessed { get; set; }
        public int TotalFilesAnalyzed { get; set; }
        public int TotalFilesSupportedFormat { get; set; }
        public int TotalFilesIgnored { get; set; }
    }

    public class PhotoIndexerService(ILogger<PhotoIndexerService> logger, PhotoIndexerSettings settings)
        : BackgroundService
    {
        private readonly SHA1 _sha1 = SHA1.Create();
        private readonly ISet<string> _supportedFormats = new HashSet<string>([".jpeg", ".jpg" /*".arw", ".heic", ".cr2" */
        ]);
        private readonly PhotoIndexerStats _stats = new PhotoIndexerStats();

        private IList<string> _flatFolders = Array.Empty<string>();

        private void RebuildSubfoldersAsync()
        {
            var result = new List<string>();
            var subfoldersStack = new Stack<string>(settings.FoldersToAnalyze);


            while (subfoldersStack.Count > 0)
            {
                var folder = subfoldersStack.Pop();
                var folderInfo = new DirectoryInfo(folder);
                if (folderInfo.Exists)
                {
                    result.Add(folder);
                    foreach (var subfolder in folderInfo.GetDirectories().Reverse())
                    {
                        subfoldersStack.Push(subfolder.FullName);
                    }
                }
            }

            this._flatFolders = result;
        }

        protected override async Task ExecuteAsync(CancellationToken cancellationToken)
        {
            if (settings.FoldersToAnalyze.Length == 0)
            {
                logger.LogWarning($"Configuration error: no folders to analyze");
                return;
            }

            while (!cancellationToken.IsCancellationRequested)
            {
                RebuildSubfoldersAsync();

                logger.LogInformation($"Starting processing folders:\n{string.Join("\n", _flatFolders)}");

                foreach (var folder in _flatFolders)
                {
                    if (cancellationToken.IsCancellationRequested)
                        break;
                    await ProcessFolder(folder, cancellationToken);
                    _stats.TotalFoldersProcessed++;
                }
                if (cancellationToken.IsCancellationRequested)
                    break;

                logger.LogInformation($"All folders processed. Going to sleep for 1 hour now and later will check again.");

                await Task.Delay(TimeSpan.FromMinutes(60), cancellationToken);
            }
        }


        private bool IsSupportedFile(FileInfo file)
        {
            return _supportedFormats.Contains(file.Extension.ToLower());
        }

        private async Task ProcessFolder(string folder, CancellationToken cancellationToken)
        {
            var folderInfo = new DirectoryInfo(folder);
            var files = folderInfo.EnumerateFiles().ToList();
            

            foreach (var file in files)
            {
                //logger.LogDebug($"Stats: TotalFoldersProcessed: {_stats.TotalFoldersProcessed} TotalFilesAnalyzed: {_stats.TotalFilesAnalyzed} TotalFilesSupportedFormat: {_stats.TotalFilesSupportedFormat}");

                if (cancellationToken.IsCancellationRequested)
                    break;
                if (IsSupportedFile(file))
                {
                    await ProcessFile(file.FullName, folderInfo.FullName, file.Name, cancellationToken);
                    _stats.TotalFilesSupportedFormat++;
                }
                _stats.TotalFilesAnalyzed++;
            }

            logger.LogInformation($"Stats: TotalFoldersProcessed: {_stats.TotalFoldersProcessed} TotalFilesAnalyzed: {_stats.TotalFilesAnalyzed} TotalFilesSupportedFormat: {_stats.TotalFilesSupportedFormat}");
        }


        private async Task ProcessFile(string filePath, string folderPath, string fileName, CancellationToken cancellationToken)
        {
            try
            {
                logger.LogDebug("Start processing file: {filePath}", filePath);

                using var db = new SQLiteConnection(settings.DatabasePath);
                db.BusyTimeout = TimeSpan.FromSeconds(30);
                db.CreateTable<PhotoInfo>();

                var existing = db.FindWithQuery<PhotoInfo>("select * from PhotoInfo where filePath = ?", filePath);

                if (existing != null)
                {
                    logger.LogDebug("Processing of file: {filePath} skipped (already in db)", filePath);
                    _stats.TotalFilesIgnored++;
                    return;
                }
                var td = await GenerateThumbnail(filePath, settings.ThumbnailSize, cancellationToken);
                var twoLetterFolderName = td.HashSha1[..2].ToLower();

                var thumbnailsParentDirectory = new DirectoryInfo(settings.ThumbnailsFolder);
                var subdir = thumbnailsParentDirectory.CreateSubdirectory(twoLetterFolderName);
                var thumbnailFilePath = Path.Combine(subdir.FullName, $"{td.HashSha1}.jpg");

                await File.WriteAllBytesAsync(thumbnailFilePath, td.ThumbnailData, cancellationToken);
                var formatVersion = 1;
                var lastUpdated = DateTime.Now;
                var referenceDate = td.ExifDate ?? td.FileDate;
                var photoInfo = new PhotoInfo(
                    td.HashSha1, filePath, folderPath, fileName, formatVersion, lastUpdated,
                    td.Width, td.Height, td.FileSize, td.FileDate, referenceDate, td.ThumbnailData.Length,
                    td.ThumbnailWidth, td.ThumbnailHeight)
                {
                    ExifDate = td.ExifDate,
                    ExifModel = td.ExifModel,
                    ExifMake = td.ExifMake,
                    ExifLongitude = td.ExifLongitude,
                    ExifLatitude = td.ExifLatitude
                };

                if (td is { ExifLongitude: not null, ExifLatitude: not null })
                {
                    var coord = new Coordinate((float)td.ExifLatitude.Value, (float)td.ExifLongitude.Value);
                    photoInfo.LocationDescription = coord.ToString();
                }

                photoInfo.OperationLog += $"\n{lastUpdated:s}: Thumbnail created";

                db.Insert(photoInfo);
                db.Commit();
                logger.LogInformation("Finished processing file: {filePath}", filePath);
            }
            catch (Exception ex)
            {
                logger.LogError("Exception when processing file: {filePath}:\n{ex}", filePath, ex);
            }
        }


        private async Task<ImageWithThumbnail> GenerateThumbnail(string filePath, int thumbnailSize, CancellationToken cancellationToken)
        {
            var fileInfo = new FileInfo(filePath);
            var bytes = await File.ReadAllBytesAsync(filePath, cancellationToken);
            using Image image = Image.Load(bytes);

            image.Mutate(img => img.AutoOrient());

            int width = image.Width;
            int height = image.Height;

            int expectedThumbnailWidth = width > height ? thumbnailSize : 0;
            int expectedThumbnailHeight = width > height ? 0 : thumbnailSize;

            image.Mutate(img => img.Resize(expectedThumbnailWidth, expectedThumbnailHeight));
            byte[] bytesThumbnail;
            using (var stream = new MemoryStream())
            {
                var jpegEncoder = new JpegEncoder() { Quality = settings.ThumbnailJpgQuality };
                await image.SaveAsJpegAsync(stream, jpegEncoder, cancellationToken);
                bytesThumbnail = stream.ToArray();
            }
            var hashBytes = _sha1.ComputeHash(bytes);
            var hashSha1 = Convert.ToHexString(hashBytes).ToLower();
            var imageWithThumbnail = new ImageWithThumbnail(bytes, bytesThumbnail, hashSha1)
            {
                FileSize = bytes.Length,
                FileDate = fileInfo.LastWriteTime,
                Width = width,
                Height = height,
                ThumbnailWidth = image.Width,
                ThumbnailHeight = image.Height,
            };
            ExtractMetadata(imageWithThumbnail);
            return imageWithThumbnail;
        }


        private void ExtractMetadata(ImageWithThumbnail iwt)
        {
            IEnumerable<MetadataExtractor.Directory> directories = ImageMetadataReader.ReadMetadata(new MemoryStream(iwt.Data));

            var subIfdDirectory = directories.OfType<ExifSubIfdDirectory>().FirstOrDefault();
            var exifDateTime = subIfdDirectory?.GetDescription(ExifDirectoryBase.TagDateTimeOriginal);

            if (DateTime.TryParseExact(exifDateTime, "yyyy:MM:dd HH:mm:ss", CultureInfo.CurrentCulture, DateTimeStyles.None, out var dt))
            {
                iwt.ExifDate = dt;
            }
            iwt.ExifModel = subIfdDirectory?.GetDescription(ExifDirectoryBase.TagModel);
            iwt.ExifMake = subIfdDirectory?.GetDescription(ExifDirectoryBase.TagMake);

            var gpsDirectory = directories.OfType<GpsDirectory>().FirstOrDefault();

            if (gpsDirectory != null && gpsDirectory.TryGetGeoLocation(out var location))
            {
                iwt.ExifLongitude = location.Longitude;
                iwt.ExifLatitude = location.Latitude;                
            }
        }

        private record ImageWithThumbnail(byte[] Data, byte[] ThumbnailData, string HashSha1)
        {
            public int Width { get; set; }
            public int Height { get; set; }
            public int FileSize { get; set; }
            public DateTime FileDate { get; set; }
            public byte[] Data { get; set; } = Data;
            public byte[] ThumbnailData { get; set; } = ThumbnailData;
            public int ThumbnailWidth { get; set; }
            public int ThumbnailHeight { get; set; }
            public string HashSha1 { get; set; } = HashSha1;

            public DateTime? ExifDate { get; set; }
            public string? ExifModel { get; set; }
            public string? ExifMake { get; set; }
            public double? ExifLongitude { get; set; }
            public double? ExifLatitude { get; set; }
        }
    }




}
