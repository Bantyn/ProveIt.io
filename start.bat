@echo off
TITLE ProveIt.io Unified Console
COLOR 0B

echo ==========================================================
echo           PROVEIT.IO - UNIFIED RUNNER
echo ==========================================================
echo.
echo [1/2] Initializing Backend Server...
echo [2/2] Initializing Frontend Application...
echo.
echo [Note] Both processes will share this single terminal window.
echo [Note] To stop both, press CTRL+C once or close this window.
echo.
echo ==========================================================
echo.

SET BASE_DIR=%~dp0

cd /d "%BASE_DIR%proveit_backend_ang"
start /B cmd /c "npm run dev"

timeout /t 3 /nobreak > nul

cd /d "%BASE_DIR%proveit_frontend_ang"
npm start

pause
