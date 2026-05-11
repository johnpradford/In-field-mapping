@echo off
REM ============================================================
REM  Fieldmap — start the development app
REM  Double-click this file to launch Fieldmap in your browser.
REM  Leave the black window open while you're using the app.
REM  Close the window to stop the app.
REM ============================================================

setlocal
cd /d "%~dp0"

REM Check Node and the supporting code are installed
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed yet.
  echo Please run "Setup-Fieldmap.bat" first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo The supporting code isn't installed yet.
  echo Please run "Setup-Fieldmap.bat" first.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   Starting Fieldmap...
echo   A browser tab will open in a few seconds.
echo   Leave this window open while you're using the app.
echo   Close it to stop.
echo ============================================================
echo.

REM Open the browser to the dev URL after a 4-second delay,
REM by which time vite should be listening.
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5173"

call npm run dev
