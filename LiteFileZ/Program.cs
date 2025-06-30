using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Net;
using System.Net.Sockets;
using LiteFileZ.Models;
using LiteFileZ;

var port = FindAvailablePort(5005, 5100);
var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls($"http://localhost:{port}");

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, JsonContext.Default);
});
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();
app.UseStaticFiles();
app.UseRouting();
MapApiEndpoints(app);

app.MapGet("/", () => Results.Redirect("/index.html"));

var url = $"http://localhost:{port}";
Console.WriteLine($"LiteFileZ starting on {url}");

Task.Run(async () =>
{
    await Task.Delay(2000);
    OpenBrowser(url);
});

app.Run();

static void OpenBrowser(string url)
{
    try
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            Process.Start("open", url);
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            Process.Start("xdg-open", url);
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Could not open browser: {ex.Message}");
        Console.WriteLine($"Please navigate to: {url}");
    }
}

static void MapApiEndpoints(WebApplication app)
{
    var configPath = Path.Combine(Directory.GetCurrentDirectory(), "tabs-config.json");

    app.MapGet("/api/config", () =>
    {
        try
        {
            if (!System.IO.File.Exists(configPath))
            {
                return Results.Ok(CreateDefaultConfiguration(configPath));
            }

            var json = System.IO.File.ReadAllText(configPath);
            var config = JsonSerializer.Deserialize(json, JsonContext.Default.Configuration);
            return Results.Ok(config);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ex.Message);
        }
    });

    app.MapPost("/api/config", (Configuration configuration) =>
    {
        try
        {
            var json = JsonSerializer.Serialize(configuration, JsonContext.Default.Configuration);
            System.IO.File.WriteAllText(configPath, json);
            return Results.Ok();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ex.Message);
        }
    });

    app.MapGet("/api/files", (string path) =>
    {
        try
        {
            var expandedPath = Environment.ExpandEnvironmentVariables(path);
            
            if (!Directory.Exists(expandedPath))
            {
                return Results.Ok(new FileListResponse { Error = "Directory not found" });
            }

            var items = new List<FileItem>();
            var directoryInfo = new DirectoryInfo(expandedPath);

            foreach (var dir in directoryInfo.GetDirectories())
            {
                try
                {
                    items.Add(new FileItem
                    {
                        Name = dir.Name,
                        Path = dir.FullName,
                        IsDirectory = true,
                        Size = 0,
                        LastModified = dir.LastWriteTime,
                        Created = dir.CreationTime
                    });
                }
                catch { }
            }

            foreach (var file in directoryInfo.GetFiles())
            {
                try
                {
                    items.Add(new FileItem
                    {
                        Name = file.Name,
                        Path = file.FullName,
                        IsDirectory = false,
                        Size = file.Length,
                        LastModified = file.LastWriteTime,
                        Created = file.CreationTime
                    });
                }
                catch { }
            }

            return Results.Ok(new FileListResponse { Items = items });
        }
        catch (Exception ex)
        {
            return Results.Ok(new FileListResponse { Error = ex.Message });
        }
    });

    app.MapGet("/api/files/tree", (string path) =>
    {
        try
        {
            var expandedPath = Environment.ExpandEnvironmentVariables(path);
            
            if (!Directory.Exists(expandedPath))
            {
                return Results.Ok(new FileListResponse { Error = "Directory not found" });
            }

            var items = new List<FileItem>();
            var directoryInfo = new DirectoryInfo(expandedPath);

            foreach (var dir in directoryInfo.GetDirectories())
            {
                try
                {
                    items.Add(new FileItem
                    {
                        Name = dir.Name,
                        Path = dir.FullName,
                        IsDirectory = true,
                        Size = 0,
                        LastModified = dir.LastWriteTime,
                        Created = dir.CreationTime
                    });
                }
                catch { }
            }

            return Results.Ok(new FileListResponse { Items = items });
        }
        catch (Exception ex)
        {
            return Results.Ok(new FileListResponse { Error = ex.Message });
        }
    });

    app.MapPost("/api/files/open", (string path) =>
    {
        try
        {
            var expandedPath = Environment.ExpandEnvironmentVariables(path);
            
            if (!System.IO.File.Exists(expandedPath))
            {
                return Results.BadRequest("File not found");
            }

            var processStartInfo = new ProcessStartInfo
            {
                FileName = expandedPath,
                UseShellExecute = true
            };

            Process.Start(processStartInfo);
            return Results.Ok();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ex.Message);
        }
    });

    app.MapPost("/api/files/rename", (RenameRequest request) =>
    {
        try
        {
            var oldPath = Environment.ExpandEnvironmentVariables(request.OldPath);
            var directory = Path.GetDirectoryName(oldPath);
            var newPath = Path.Combine(directory!, request.NewName);

            if (Directory.Exists(oldPath))
            {
                Directory.Move(oldPath, newPath);
            }
            else if (System.IO.File.Exists(oldPath))
            {
                System.IO.File.Move(oldPath, newPath);
            }
            else
            {
                return Results.BadRequest("Item not found");
            }

            return Results.Ok();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ex.Message);
        }
    });

    app.MapPost("/api/files/delete", (DeleteRequest request) =>
    {
        try
        {
            var path = Environment.ExpandEnvironmentVariables(request.Path);

            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }
            else if (System.IO.File.Exists(path))
            {
                System.IO.File.Delete(path);
            }
            else
            {
                return Results.BadRequest("Item not found");
            }

            return Results.Ok();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ex.Message);
        }
    });
}

static Configuration CreateDefaultConfiguration(string configPath)
{
    var config = new Configuration
    {
        Tabs = new List<TabConfiguration>
        {
            new() { Name = "C: Drive", Icon = "💽", Path = "C:\\" },
            new() { Name = "Downloads", Icon = "📥", Path = "%USERPROFILE%\\Downloads" },
            new() { Name = "Documents", Icon = "📄", Path = "%USERPROFILE%\\Documents" },
            new() { Name = "Desktop", Icon = "🖥️", Path = "%USERPROFILE%\\Desktop" }
        }
    };

    try
    {
        var json = JsonSerializer.Serialize(config, JsonContext.Default.Configuration);
        System.IO.File.WriteAllText(configPath, json);
    }
    catch { }

    return config;
}

static int FindAvailablePort(int startPort, int endPort)
{
    for (int port = startPort; port <= endPort; port++)
    {
        if (IsPortAvailable(port))
        {
            return port;
        }
    }
    
    throw new InvalidOperationException($"No available port found in range {startPort}-{endPort}");
}

static bool IsPortAvailable(int port)
{
    try
    {
        using var listener = new TcpListener(IPAddress.Loopback, port);
        listener.Start();
        listener.Stop();
        return true;
    }
    catch (SocketException)
    {
        return false;
    }
}
