const fs = require('fs');
const path = require('path');

// ==========================================
// 【設定】SkillMap Pro (testoriginalapp) 自動置換スクリプト
// （PCのapdate.bat・Vercelビルド時・GitHub Actionsのすべてで動作します）
// ==========================================
const DEFAULT_TARGET = 'App.js';

const changesFile = path.join(__dirname, 'changes.json');

if (!fs.existsSync(changesFile)) {
    process.exit(0);
}

const now = new Date();
const yyyy = now.getFullYear();
const m = now.getMonth() + 1;
const d = now.getDate();
const hh = String(now.getHours()).padStart(2, '0');
const min = String(now.getMinutes()).padStart(2, '0');
const currentDateTimeStr = `${yyyy}.${m}.${d}, ${hh}:${min}, updated`;

try {
    const fileContent = fs.readFileSync(changesFile, 'utf8').trim();
    if (!fileContent || fileContent === '[]' || fileContent === '[\n  \n]') {
        console.log('changes.json が空のためスキップします。');
        process.exit(0);
    }

    console.log('changes.json の変更情報を適用しています...');
    const modifications = JSON.parse(fileContent);
    const fileContents = {};
    const dirtyFiles = new Set();

    fs.readdirSync(__dirname).forEach((fname) => {
        if (fname.endsWith('.js') && fname !== 'apply_changes.js') {
            fileContents[fname] = fs.readFileSync(path.join(__dirname, fname), 'utf8');
        }
    });

    let updatedCount = 0;

    modifications.forEach((change, index) => {
        const targetName = change.file || DEFAULT_TARGET;
        if (change.fullContent && fileContents[targetName] !== undefined) {
            if (fileContents[targetName] !== change.fullContent) {
                fileContents[targetName] = change.fullContent;
                dirtyFiles.add(targetName);
                updatedCount++;
                console.log(`[${targetName}] ファイル全体を更新しました。`);
            }
            return;
        }

        let matchedFile = null;
        if (fileContents[targetName] && fileContents[targetName].includes(change.search)) {
            matchedFile = targetName;
        } else {
            for (const fname of Object.keys(fileContents)) {
                if (fileContents[fname].includes(change.search)) {
                    matchedFile = fname;
                    break;
                }
            }
        }

        if (matchedFile) {
            fileContents[matchedFile] = fileContents[matchedFile].replace(change.search, change.replace);
            dirtyFiles.add(matchedFile);
            updatedCount++;
            console.log(`[${matchedFile}] ${index + 1} 番目の変更を適用しました。`);
        } else if (fileContents[targetName] && fileContents[targetName].includes(change.replace)) {
            console.log(`[${targetName}] ${index + 1} 番目の変更は適用済みです。`);
        } else {
            console.warn(`スキップ: ${index + 1} 番目の対象箇所は既に変更されているか見つかりません。`);
        }
    });

    const versionRegex = /(SkillMap Pro v\d+\.\d+\.\d+)(?: \([^)]+\))?/;
    for (const fname of Object.keys(fileContents)) {
        if (versionRegex.test(fileContents[fname])) {
            fileContents[fname] = fileContents[fname].replace(versionRegex, `$1 (${currentDateTimeStr})`);
            dirtyFiles.add(fname);
            console.log(`[${fname}] バージョン更新日時を (${currentDateTimeStr}) に自動更新しました。`);
        }
    }

    if (updatedCount > 0) {
        dirtyFiles.forEach((fname) => {
            fs.writeFileSync(path.join(__dirname, fname), fileContents[fname], 'utf8');
        });
        console.log(`コード置換が完了しました（計${updatedCount}箇所 / 更新ファイル: ${[...dirtyFiles].join(', ')}）。`);
    }

    fs.writeFileSync(changesFile, '', 'utf8');
    console.log('changes.json の中身をリセットしました。');

} catch (e) {
    console.error('処理中にエラーが発生しました:', e);
}
