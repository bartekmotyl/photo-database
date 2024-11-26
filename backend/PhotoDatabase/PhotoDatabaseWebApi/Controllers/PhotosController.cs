using Microsoft.AspNetCore.Mvc;
using PhotoDatabaseLib;
using SQLite;
using System.Globalization;

namespace PhotoDatabaseWebApi.Controllers
{
    [ApiController]
    [Route("[controller]/[action]")]
    public class PhotosController : ControllerBase
    {
        // ReSharper disable once NotAccessedField.Local
        private readonly ILogger<PhotosController> _logger;
        private readonly WebApiSettings _settings;

        public PhotosController(ILogger<PhotosController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _settings = new WebApiSettings();
            configuration.Bind("WebApiSettings", _settings);
        }

        private SQLiteConnection GetConnection()
        {
            var db = new SQLiteConnection(_settings.DatabasePath);
            db.BusyTimeout = TimeSpan.FromSeconds(30);
            return db;
        }
        
        [HttpGet]
        public IEnumerable<PhotoRecord> All()
        {
            using var db = GetConnection();
            var result = db.Table<PhotoInfo>().Select(PhotoRecord.CreateFromPhotoInfo).ToList();
            db.Close();
            return result;
        }

        [HttpPatch]
        public IActionResult AddTags([FromBody] PhotoTagsUpdate[] tagsToAdd)
        {
            using var db = GetConnection();
            db.BeginTransaction();
            try
            {
                foreach (var entry in tagsToAdd)
                {
                    var photo = db.Table<PhotoInfo>().FirstOrDefault(p => p.Id == entry.PhotoId);
                    if (photo == null)
                        return NotFound();

                    foreach (var tag in entry.Tags)
                        photo.AddTag(tag); // TODO: improve me 
                    db.Update(photo);
                }
                db.Commit();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"error when trying to add tags");
            }
            finally {
                db.Close();
            }
            return Ok();
        }

        [HttpPatch]
        public IActionResult RemoveTags([FromBody] PhotoTagsUpdate[] tagsToRemove)
        {
            using var db = GetConnection();
            db.BeginTransaction();
            try
            {
                foreach (var entry in tagsToRemove)
                {
                    var photo = db.Table<PhotoInfo>().FirstOrDefault(p => p.Id == entry.PhotoId);
                    if (photo == null)
                        return NotFound();

                    foreach (var tag in entry.Tags)
                        photo.RemoveTag(tag); // TODO: improve me 
                    db.Update(photo);
                }
                db.Commit();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"error when trying to add tags");
            }
            finally
            {
                db.Close();
            }
            return Ok();
        }

        [HttpGet]
        public IEnumerable<PhotoRecord> Search(
            [FromQuery(Name = "dateFrom")] string dateFromStr = "",
            [FromQuery(Name = "dateTo")] string dateToStr = "",
            [FromQuery(Name = "tags")] string tags= ""
            )
        {
            var dateFrom = ParseDateParam(dateFromStr);
            var dateTo = ParseDateParam(dateToStr);

            using var db = GetConnection();
            var result = db.Table<PhotoInfo>();
            if (dateFrom != null)
            {
                result = result.Where(pi => pi.ReferenceDate >= dateFrom.Value);
            }
            if (dateTo != null)
            {
                var value = dateTo.Value.AddDays(1);
                result = result.Where(pi => pi.ReferenceDate < value);
            }
            if (tags != "")
            {
                var tagsParsed = tags.Split(",").Where(t => t != "");
                foreach (var t in tagsParsed)
                {
                    var tagTrimmed = t.Trim();
                    result = result.Where(pi => pi.Tags != null && pi.Tags.Contains(tagTrimmed));
                }

            }
            return result.Select(PhotoRecord.CreateFromPhotoInfo).ToList();
        }


        [HttpGet("{id}")]
        public IActionResult Thumbnail(int id)
        {
            using var db = GetConnection();
            var pi = db.Find<PhotoInfo>(id);
            if (pi == null)
            {
                return NotFound();
            }
            var thumbnailPartialPath = PhotoDatabaseUtils.CalculateThumbnailPath(pi.HashSha1);
            var fullPath = Path.Combine(_settings.ThumbnailsFolder, thumbnailPartialPath);
            return PhysicalFile(fullPath, "image/jpeg");
        }

        [HttpGet("{id}")]
        public IActionResult Full(int id)
        {
            using var db = GetConnection();
            var pi = db.Find<PhotoInfo>(id);
            if (pi == null)
            {
                return NotFound();
            }
            return PhysicalFile(pi.FilePath, "image/jpeg");
        }

        private DateTime? ParseDateParam(string value)
        {
            if (DateTime.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                return dt.Date;
            }
            return null;
        }
    }
}
