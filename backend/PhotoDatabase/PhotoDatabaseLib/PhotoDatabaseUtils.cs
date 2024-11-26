namespace PhotoDatabaseLib
{
    public static class PhotoDatabaseUtils
    {
        public static string CalculateThumbnailPath(string hashcode)
        {
            var twoLetterFolderName = hashcode[..2].ToLower();
            return Path.Combine(twoLetterFolderName, $"{hashcode}.jpg");
        }
    }
}
