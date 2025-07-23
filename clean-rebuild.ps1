# PowerShell script to clean and rebuild Next.js app

Write-Host "Starting cleanup process..." -ForegroundColor Yellow

# 1. Kill all node processes
Write-Host "Stopping any running Node.js processes..." -ForegroundColor Cyan
try {
    taskkill /F /IM node.exe /T 2>$null
    Write-Host "All Node.js processes stopped" -ForegroundColor Green
} catch {
    Write-Host "No Node.js processes found or couldn't stop them" -ForegroundColor Yellow
}

# 2. Delete .next directory
Write-Host "Removing .next directory..." -ForegroundColor Cyan
if (Test-Path -Path ".\.next") {
    try {
        Remove-Item -Path ".\.next" -Recurse -Force -ErrorAction Stop
        Write-Host ".next directory removed successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to remove .next directory, trying cmd commands" -ForegroundColor Yellow
        cmd /c "rmdir /S /Q .next"
    }
} else {
    Write-Host ".next directory not found, no cleanup needed" -ForegroundColor Gray
}

# 3. Clear node_modules
Write-Host "Removing node_modules directory..." -ForegroundColor Cyan
if (Test-Path -Path ".\node_modules") {
    try {
        Remove-Item -Path ".\node_modules" -Recurse -Force -ErrorAction Stop
        Write-Host "node_modules directory removed successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to remove node_modules directory, trying cmd commands" -ForegroundColor Yellow
        cmd /c "rmdir /S /Q node_modules"
    }
} else {
    Write-Host "node_modules directory not found" -ForegroundColor Gray
}

# 4. Clear npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Cyan
npm cache clean --force

# 5. Reinstall dependencies
Write-Host "Reinstalling dependencies..." -ForegroundColor Cyan
npm install

# 6. Delete temp and browser lock files
Write-Host "Cleaning up browser lock files..." -ForegroundColor Cyan
Remove-Item -Path "$env:TEMP\next-*" -Force -Recurse -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\*.lock" -Force -ErrorAction SilentlyContinue

# 7. Rebuild the application
Write-Host "Rebuilding the application..." -ForegroundColor Cyan
npm run build

# 8. Display completion message
Write-Host "`nCleanup and rebuild process completed." -ForegroundColor Green
Write-Host "You can now start the development server with: npm run dev" -ForegroundColor Yellow

# Keep the window open
Write-Host "Press Enter to close this window..."
$host.UI.ReadLine() 