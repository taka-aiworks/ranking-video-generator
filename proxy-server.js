// VoiceVOX用リバースプロキシサーバー
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 50022; // VoiceVOXの代わりに使用するポート

// CORSを有効化
app.use(cors());

// VoiceVOXへのプロキシ設定
app.use('/', createProxyMiddleware({
  target: 'http://localhost:50021',
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('プロキシエラー:', err);
    res.status(500).json({ error: 'VoiceVOXサーバーに接続できません' });
  }
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎤 VoiceVOXプロキシサーバー起動: http://0.0.0.0:${PORT}`);
  console.log(`📱 他のデバイスからアクセス: http://192.168.2.186:${PORT}`);
});
