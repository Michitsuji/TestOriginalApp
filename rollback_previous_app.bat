@echo off
cd /d "%~dp0"
echo ===================================================
echo   Rollback to Previous Commit (HEAD~1)
echo ===================================================
echo Current Folder: %CD%
git remote -v
echo Rolling back 1 commit and force pushing...
git reset --hard HEAD~1
git push -f origin main
echo ===================================================
echo   SUCCESS: Rollback completed!
echo ===================================================
pause
