namespace LiteFileZ.Models;

public class FileItem
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public bool IsDirectory { get; set; }
    public long Size { get; set; }
    public DateTime LastModified { get; set; }
    public DateTime Created { get; set; }
}

public class TabConfiguration
{
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
}

public class Configuration
{
    public List<TabConfiguration> Tabs { get; set; } = new();
}

public class FileListResponse
{
    public List<FileItem> Items { get; set; } = new();
    public string? Error { get; set; }
}

public class RenameRequest
{
    public string OldPath { get; set; } = string.Empty;
    public string NewName { get; set; } = string.Empty;
}

public class DeleteRequest
{
    public string Path { get; set; } = string.Empty;
}