@echo off
TITLE ProveIt.io - Project Launcher

echo [1/2] Launching Backend Server...
start "ProveIt - Backend" cmd /k "cd proveit_backend_ang && npm run dev"

echo [2/2] Launching Frontend Development Server...
start "ProveIt - Frontend" cmd /k "cd proveit_frontend_ang && npm start"

echo.
echo ==================================================
echo BOTH TERMINALS ARE NOW OPEN IN SEPARATE WINDOWS
echo.
echo --------------------------------------------------
echo [BACKEND]  : Running on Port 3000
echo [FRONTEND] : Running on http://localhost:4200/
echo [NETWORK]  : Access via your Local IP (e.g., http://192.168.x.x:4200)
echo --------------------------------------------------
echo Tip: Use 'ipconfig' in a new CMD to find your Local IP.
echo ==================================================
pause
