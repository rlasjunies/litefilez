using System.Text.Json;
using System.Text.Json.Serialization;
using LiteFileZ.Models;

namespace LiteFileZ;

[JsonSerializable(typeof(Configuration))]
[JsonSerializable(typeof(TabConfiguration))]
[JsonSerializable(typeof(List<TabConfiguration>))]
[JsonSerializable(typeof(FileItem))]
[JsonSerializable(typeof(List<FileItem>))]
[JsonSerializable(typeof(FileListResponse))]
[JsonSerializable(typeof(RenameRequest))]
[JsonSerializable(typeof(DeleteRequest))]
[JsonSourceGenerationOptions(WriteIndented = true)]
internal partial class JsonContext : JsonSerializerContext
{
}