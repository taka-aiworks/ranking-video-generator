@echo off
chcp 65001 >nul
echo ========================================
echo ngrok URL取得スクリプト
echo ========================================
echo.

echo ngrokのURLを取得しています...
timeout /t 3 /nobreak >nul

powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:4040/api/tunnels' -UseBasicParsing; $data = $response.Content | ConvertFrom-Json; if ($data.tunnels -and $data.tunnels.Count -gt 0) { $url = $data.tunnels[0].public_url; Write-Host 'ngrok URL: ' $url -ForegroundColor Green; Write-Host ''; Write-Host 'このURLをアプリケーションの「ngrok設定」で使用してください。' -ForegroundColor Yellow; } else { Write-Host 'ngrokが起動していません。START_SERVERS.batを実行してください。' -ForegroundColor Red; } } catch { Write-Host 'ngrokのAPIにアクセスできません。ngrokが起動しているか確認してください。' -ForegroundColor Red; }"

echo.
echo ========================================
echo 使用方法:
echo 1. 上記のURLをコピー
echo 2. アプリケーションで「ngrok設定」ボタンをクリック
echo 3. URLを貼り付けて設定
echo ========================================
echo.
pause
