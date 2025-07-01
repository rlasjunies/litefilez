# LiteFileZ - Web-Based File Manager

## Overview
LiteFileZ is a lightweight, fast web-based file manager built with .NET 9, compiled as AOT (Ahead-of-Time) for optimal performance and self-contained deployment. It provides an intuitive web interface for navigating and managing files and folders across different locations.

## Key Features

### 🚀 Performance & Deployment
- **AOT Compilation**: Built with Native AOT for faster startup and smaller memory footprint
- **Self-Contained**: Single executable with no external dependencies
- **Auto-Launch**: Automatically opens web browser when server starts
- **Smart Port Detection**: Automatically finds available port in range 5005-5100
- **Cross-Platform**: Runs on Windows, macOS, and Linux

### 🖥️ User Interface
- **Tabbed Navigation**: Horizontal tabs spanning full page width for different locations
- **Three-Panel Layout**:
  - **Left Panel**: Tree view of folder hierarchy with single expand/collapse icons
  - **Middle Panel**: File and folder listing with details
  - **Right Panel**: Properties and details of selected items
- **Clean Tree View**: Single functional icon per folder (📂 expanded, 📁 collapsed) serves both visual and interactive purposes

### 📁 File Management
- **Mixed Listings**: Files and folders displayed together, sorted by name
- **File Icons**: Context-aware icons based on file types and extensions
- **File Information**: Shows creation date, modification date, and file sizes
- **Folder Navigation**: Click folders to navigate, expand tree view
- **File Opening**: Double-click files to open with OS default application

### ⚙️ Configuration
- **JSON Configuration**: Easily editable configuration file (`tabs-config.json`)
- **Default Tabs**: Pre-configured tabs for common locations:
  - C: Drive (`C:\`)
  - Downloads (`%USERPROFILE%\Downloads`)
  - Documents (`%USERPROFILE%\Documents`)
  - Desktop (`%USERPROFILE%\Desktop`)
- **Environment Variables**: Supports Windows environment variable expansion
- **Live Configuration**: Edit configuration through gear icon in web interface

### 🔧 File Operations
- **Context Menu**: Right-click for file operations
- **Rename**: Rename files and folders
- **Delete**: Delete files and folders (with confirmation)
- **Copy Path**: Copy file/folder path to clipboard
- **Properties**: View detailed file/folder information
- **Hover Actions**: Icon overlays appear on mouse hover for quick actions

### 🎨 Visual Design
- **Responsive Design**: Clean, modern interface
- **File Type Icons**: Visual representation of different file types:
  - 📁 Folders
  - 📄 Documents (txt, doc, docx, pdf)
  - 🖼️ Images (jpg, jpeg, png, gif)
  - 🎵 Audio (mp3, wav)
  - 🎬 Video (mp4, avi)
  - 📦 Archives (zip, rar, 7z)
  - ⚙️ Executables (exe, msi)
  - 📜 Code files (js, html, css, json)
- **Size Formatting**: Human-readable file sizes (B, KB, MB, GB)
- **Date Formatting**: Localized date and time display

## Technical Architecture

### Backend (.NET 9)
- **Minimal APIs**: Lightweight API endpoints for better AOT compatibility
- **JSON Source Generation**: AOT-optimized JSON serialization
- **File System API**: Safe file system operations with error handling
- **CORS Enabled**: Cross-origin resource sharing for development
- **Static File Serving**: Serves HTML, CSS, and JavaScript assets

### Frontend (HTML5/CSS3/JavaScript)
- **Vanilla JavaScript**: No external dependencies for fast loading
- **Modern CSS**: Flexbox layout with responsive design
- **Fetch API**: Modern HTTP client for API communication
- **Event-Driven**: Responsive user interactions and updates

### API Endpoints
- `GET /api/config` - Get tab configuration
- `POST /api/config` - Save tab configuration
- `GET /api/files?path={path}` - List files and folders
- `GET /api/files/tree?path={path}` - Get folder tree structure
- `POST /api/files/open?path={path}` - Open file with OS default app
- `POST /api/files/rename` - Rename file or folder
- `POST /api/files/delete` - Delete file or folder

## Build Commands
```bash
# Development run
dotnet run

# Build for debugging
dotnet build

# AOT Release build
dotnet publish -c Release --self-contained

# Run tests (if available)
dotnet test
```

## Configuration File Structure
```json
{
  "tabs": [
    {
      "name": "C: Drive",
      "icon": "💽",
      "path": "C:\\"
    },
    {
      "name": "Downloads", 
      "icon": "📥",
      "path": "%USERPROFILE%\\Downloads"
    }
  ]
}
```

## Security Considerations
- **File System Access**: Only allows access to configured paths
- **Path Validation**: Validates and sanitizes file paths
- **Error Handling**: Graceful handling of permission errors
- **No Remote Access**: Designed for local use only

## Browser Compatibility
- Modern browsers supporting ES6+ features
- Chrome, Firefox, Safari, Edge
- Responsive design for desktop and tablet screens

## Performance Characteristics
- **Fast Startup**: AOT compilation enables sub-second startup
- **Low Memory**: Minimal memory footprint
- **Efficient File Operations**: Optimized file system interactions
- **Cached Responses**: Browser caching for static assets
- **Port Management**: Intelligent port detection prevents conflicts

## Network Configuration
- **Port Range**: Automatically scans ports 5005-5100 for availability
- **Localhost Only**: Binds to localhost for security
- **Port Conflict Resolution**: Finds first available port in range
- **Console Output**: Displays selected port on startup