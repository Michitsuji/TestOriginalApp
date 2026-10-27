@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ========================================================
echo   SkillMap Pro (testoriginalapp) - Auto Update & Deploy
echo ========================================================

if not exist .git (
    git init
    git branch -M main
    git remote add origin https://github.com/michitsuji/testoriginalapp.git
) else (
    git remote set-url origin https://github.com/michitsuji/testoriginalapp.git
)

if exist src\changes.json (
    node src\apply_changes.js
)

git add -A
git diff --cached --quiet || git -c core.editor=true commit -m "Update SkillMap Pro"
git push -f origin main
echo.
echo 完了しました！（Vercel project: testoriginalapp へ自動デプロイされます）
pause
