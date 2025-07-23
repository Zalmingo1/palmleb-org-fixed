@echo off
echo ===================================================
echo      NEXT.JS DEEP CLEAN AND REBUILD SCRIPT
echo ===================================================
echo.

echo [1/7] Stopping all Node.js processes...
taskkill /F /IM node.exe /T 2>nul
if %ERRORLEVEL% EQU 0 (
  echo      Node processes terminated successfully.
) else (
  echo      No Node processes found or couldn't stop them.
)
echo.

echo [2/7] Removing .next directory...
if exist .next (
  rmdir /S /Q .next
  echo      .next directory removed successfully.
) else (
  echo      .next directory not found.
)
echo.

echo [3/7] Removing node_modules directory...
if exist node_modules (
  rmdir /S /Q node_modules
  echo      node_modules directory removed successfully.
) else (
  echo      node_modules directory not found.
)
echo.

echo [4/7] Clearing npm cache...
call npm cache clean --force
echo.

echo [5/7] Reinstalling dependencies...
call npm install
echo.

echo [6/7] Clearing temp files...
del /Q %TEMP%\next-* 2>nul
del /Q %TEMP%\*.lock 2>nul
echo      Temporary files cleared.
echo.

echo [7/7] Rebuilding application...
call npm run build
echo.

echo ===================================================
echo      CLEANUP AND REBUILD COMPLETE
echo ===================================================
echo.
echo You can now start the development server with: npm run dev
echo.

pause 