@echo off
echo ===== MANUAL FIX FOR NEXT.JS APPLICATION =====
echo.

echo Step 1: Stopping all Node.js processes...
taskkill /F /IM node.exe /T
echo.

echo Step 2: Removing .next directory...
if exist .next (
    rmdir /S /Q .next
    echo .next directory removed successfully.
) else (
    echo .next directory not found.
)
echo.

echo Step 3: Checking if directories exist...
if not exist "src\pages" (
    echo Creating pages directory...
    mkdir "src\pages"
)

if not exist "src\styles" (
    echo Creating styles directory...
    mkdir "src\styles"
)
echo.

echo Step 4: Building the application...
call npm run build
echo.

echo Step 5: Starting the development server...
echo To start the server, run "npm run dev" in a new terminal window.
echo.

echo ===== MANUAL FIX COMPLETED =====
echo Please check http://localhost:3000 in your browser

pause 