@echo off
echo Starting cleanup process...

echo Stopping any running Node.js processes...
taskkill /F /IM node.exe /T

echo Removing .next directory...
if exist .next (
  rmdir /S /Q .next
  echo .next directory removed successfully
) else (
  echo .next directory not found, no cleanup needed
)

echo Clearing npm cache...
call npm cache clean --force

echo Rebuilding the application...
call npm run build

echo.
echo Cleanup and rebuild process completed.
echo You can now start the development server with: npm run dev

pause 