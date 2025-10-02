// src/config/api.js - 正しい環境変数管理

// 環境変数の詳細確認とデバッグ
console.log('🔍 環境変数デバッグ情報:');
console.log('- import.meta.env:', import.meta.env);
console.log('- VITE_OPENAI_API_KEY:', import.meta.env.VITE_OPENAI_API_KEY ? '設定済み' : '❌未設定');
console.log('- VITE_UNSPLASH_ACCESS_KEY:', import.meta.env.VITE_UNSPLASH_ACCESS_KEY ? '設定済み' : '❌未設定');
console.log('- .env読み込み状況:', import.meta.env.VITE_OPENAI_API_KEY ? '✅正常' : '❌失敗');

// 環境変数管理（フォールバックなし）
export const ENV = {
  isDevelopment: import.meta.env.DEV,
  mode: import.meta.env.MODE || 'development',
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || null,
  amazonApiKey: import.meta.env.VITE_AMAZON_API_KEY || null,
  unsplashAccessKey: import.meta.env.VITE_UNSPLASH_ACCESS_KEY || null
};

// API設定
export const API_CONFIG = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    maxTokens: 2500,
    temperature: 0.7,
    apiKey: ENV.openaiApiKey
  },
  unsplash: {
    baseURL: 'https://api.unsplash.com',
    apiKey: ENV.unsplashAccessKey
  },
  
  amazon: {
    baseURL: 'https://webservices.amazon.com/paapi5',
    region: 'us-east-1',
    apiKey: ENV.amazonApiKey
  },

  video: {
    canvas: {
      width: 1920,
      height: 1080,
      frameRate: 30
    },
    
    formats: {
      short: {
        duration: { min: 15, max: 60 },
        aspectRatio: '9:16',
        resolution: { width: 1080, height: 1920 }
      },
      medium: {
        duration: { min: 60, max: 480 },
        aspectRatio: '16:9', 
        resolution: { width: 1920, height: 1080 }
      },
      hybrid: {
        duration: { min: 15, max: 30 },
        aspectRatio: '9:16',
        resolution: { width: 1080, height: 1920 }
      }
    },

    recorder: {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000
    }
  }
};

// API エンドポイント
export const ENDPOINTS = {
  chatgpt: {
    completion: '/chat/completions'
  },
  amazon: {
    searchItems: '/SearchItems',
    getItems: '/GetItems'
  }
};

// デバッグ情報（正しい判定）
console.log('🔑 APIキー状態確認:');

if (!ENV.openaiApiKey) {
  console.error('❌ VITE_OPENAI_API_KEY が設定されていません');
  console.log('💡 Vite環境変数の解決方法:');
  console.log('  1. プロジェクトルートに .env ファイルがあることを確認');
  console.log('  2. VITE_ プレフィックスが正しいことを確認');
  console.log('  3. 開発サーバーを完全に再起動 (Ctrl+C → npm run dev)');
  console.log('  4. ブラウザのキャッシュクリア (Ctrl+Shift+R)');
} else if (!ENV.openaiApiKey.startsWith('sk-')) {
  console.warn('⚠️ APIキーの形式が正しくない可能性があります');
} else {
  console.log('✅ OpenAI APIキー正常:', ENV.openaiApiKey.substring(0, 20) + '...');
}

console.log('🌍 動作環境:', ENV.mode);
console.log('🎬 動画形式設定:', Object.keys(API_CONFIG.video.formats));

export default API_CONFIG;