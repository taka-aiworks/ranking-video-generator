@echo off
chcp 65001 >nul
echo ========================================
echo 動画生成アプリ - サーバー起動スクリプト
echo ========================================
echo.

echo [1/3] Irasutoya画像サーバーを起動しています...
start "Irasutoya Server" cmd /k "cd /d %~dp0 && node server/index.js"
timeout /t 2 /nobreak >nul

echo [2/3] Vite開発サーバーを起動しています...
start "Vite Dev Server" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 2 /nobreak >nul

echo [3/3] VoiceVOXを起動しています...
start "VOICEVOX" "%USERPROFILE%\AppData\Local\Programs\VOICEVOX\VOICEVOX.exe"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo すべてのサーバーが起動しました！
echo ========================================
echo.
echo 📝 アクセス方法:
echo   - フロントエンド: http://localhost:5173
echo   - Irasutoya画像: http://localhost:3001
echo   - VoiceVOX API:  http://localhost:50021
echo.
echo 🌐 他のデバイスからアクセスする場合:
echo   1. コマンドプロンプトで "ipconfig" を実行
echo   2. IPv4アドレスを確認（例: 192.168.1.100）
echo   3. http://[IPアドレス]:5173 でアクセス
echo.
echo ⚠️ サーバーを停止する場合は、各ウィンドウを閉じてください
echo.
pause

