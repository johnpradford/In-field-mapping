@echo off
REM ============================================================
REM  Fieldmap — one-time setup
REM  Double-click this file the FIRST time you set up the app.
REM  Downloads and installs all the supporting code Fieldmap needs.
REM  Takes about 1-2 minutes on a normal home internet connection.
REM ============================================================

setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo   Fieldmap setup
echo ============================================================
echo.

REM Check Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed yet.
  echo.
  echo Please download and install Node.js LTS from:
  echo     https://nodejs.org
  echo.
  echo Choose the green "LTS" button, run the installer, accept all
  echo defaults, then come back and double-click this file again.
  echo.
  pause
  exit /b 1
)

echo Node.js version:
node --version
echo npm version:
call npm --version
echo.

REM Wipe any partial install from previous attempts so we start clean.
REM We keep package-lock.json: it is tracked in git and is the source of
REM truth for dependency versions. `npm ci` installs exactly what the
REM lockfile says, which avoids the lockfile getting silently rewritten
REM on every install.
if exist "node_modules" (
  echo Removing partial node_modules from a previous attempt...
  rmdir /s /q node_modules
)

echo.
echo Attempt 1: Installing with the npm that came with Node (npm ci)...
echo.
call npm ci --no-audit --no-fund
if not errorlevel 1 goto :install_ok

echo.
echo ------------------------------------------------------------
echo Attempt 1 failed. This is a known bug in npm version 11
echo with one of Capacitor's older sub-libraries.
echo Falling back to npm version 10 via npx (no admin needed)...
echo ------------------------------------------------------------
echo.

if exist "node_modules" rmdir /s /q node_modules

call npx -y -p npm@10.9.4 npm ci --no-audit --no-fund
if not errorlevel 1 goto :install_ok

echo.
echo ============================================================
echo  Setup FAILED on both attempts.
echo.
echo  The most reliable fix is to install Node.js 22 LTS instead
echo  of Node 24:
echo.
echo    1. Open "Add or remove programs" in Windows Settings
echo    2. Find Node.js, click Uninstall
echo    3. Go to https://nodejs.org/en/download/prebuilt-installer
echo    4. Change the "Latest LTS" dropdown to v22.x.x and download
echo    5. Install it (accept all defaults)
echo    6. Run this script again
echo.
echo  Or copy any red text above and paste it to Claude.
echo ============================================================
pause
exit /b 1

:install_ok
echo.
echo ============================================================
echo  Setup complete.
echo  Now double-click "Start-Fieldmap.bat" to launch the app.
echo ============================================================
echo.
pause
