@echo off
chcp 65001 >nul
echo ========================================
echo 動画生成アプリ - サーバー起動スクリプト
echo ========================================
echo.

echo [1/4] Irasutoya画像サーバーを起動しています...
start "Irasutoya Server" cmd /k "cd /d %~dp0 && node server/index.js"
timeout /t 3 /nobreak >nul

echo [2/4] Vite開発サーバーを起動しています...
start "Vite Dev Server" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 3 /nobreak >nul

echo [3/4] VoiceVOXを起動しています...
start "VOICEVOX" "%USERPROFILE%\AppData\Local\Programs\VOICEVOX\VOICEVOX.exe"
timeout /t 5 /nobreak >nul

echo [4/4] ngrokでVoiceVOXを外部公開しています...
start "ngrok" cmd /k "cd /d %~dp0 && ngrok.exe http 50021"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo すべてのサーバーが起動しました！
echo ========================================
echo.
echo 📝 ローカルアクセス:
echo   - フロントエンド: http://localhost:5173
echo   - Irasutoya画像: http://localhost:3001
echo   - VoiceVOX API:  http://localhost:50021
echo.
echo 🌐 他のデバイスからアクセス:
echo   - フロントエンド: http://192.168.2.186:5173
echo   - Irasutoya画像: http://192.168.2.186:3001
echo   - VoiceVOX: ngrok URL（ngrokウィンドウで確認）
echo.
echo 🔧 VoiceVOX設定手順:
echo   1. アプリケーションで「ngrok設定」ボタンをクリック
echo   2. ページを再読み込み
echo   3. 「接続確認」ボタンでテスト
echo.
echo ⚠️ サーバーを停止する場合は、各ウィンドウを閉じてください
echo.
pause

