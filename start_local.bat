@echo off
cd /d "%~dp0"
echo ===================================================
echo   SkillMap Pro - Local Dev Server
echo ===================================================
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
)
echo Starting server at http://localhost:3000 ...
call npm start
pause
