# PowerShell Script: Add Blender to Windows PATH
# This adds Blender 4.4 to your system PATH so you can run "blender" from any terminal

$BlenderPath = "C:\Program Files\Blender Foundation\Blender 4.4"

Write-Host "Adding Blender to PATH..." -ForegroundColor Cyan
Write-Host "Blender Location: $BlenderPath" -ForegroundColor Gray

# Get current PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Check if already in PATH
if ($CurrentPath -like "*$BlenderPath*") {
    Write-Host "✓ Blender is already in your PATH!" -ForegroundColor Green
    exit 0
}

# Add to PATH
$NewPath = "$CurrentPath;$BlenderPath"
[Environment]::SetEnvironmentVariable("Path", $NewPath, "User")

Write-Host "✓ Blender added to PATH successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: You need to restart your terminal for changes to take effect." -ForegroundColor Yellow
Write-Host "After restarting, test with: blender --version" -ForegroundColor Gray
