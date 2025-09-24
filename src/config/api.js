// src/config/api.js - 環境変数デバッグ対応・完全版

// 環境変数の詳細確認とデバッグ
console.log('🔍 環境変数デバッグ情報:');
console.log('- import.meta.env:', import.meta.env);
console.log('- VITE_OPENAI_API_KEY:', import.meta.env.VITE_OPENAI_API_KEY ? '設定済み' : '❌未設定');
console.log('- NODE_ENV/MODE:', import.meta.env.NODE_ENV, import.meta.env.MODE);

// 環境変数管理 - Vite形式（デバッグ強化版）
export const ENV = {
  isDevelopment: import.meta.env.DEV,
  mode: import.meta.env.MODE || 'development',
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  amazonApiKey: import.meta.env.VITE_AMAZON_API_KEY || ''
};

// API設定
export const API_CONFIG = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    maxTokens: 2500,
    temperature: 0.7,
    apiKey: ENV.openaiApiKey // 追加
  },
  
  amazon: {
    baseURL: 'https://webservices.amazon.com/paapi5',
    region: 'us-east-1',
    apiKey: ENV.amazonApiKey // 追加
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
        resolution: { width: 1080, height: 1920 } // 縦型
      },
      medium: {
        duration: { min: 60, max: 480 }, // 最小60秒に修正
        aspectRatio: '16:9', 
        resolution: { width: 1920, height: 1080 } // 横型
      },
      hybrid: {
        duration: { min: 15, max: 30 }, // ハイブリッド用追加
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

// デバッグ情報とバリデーション
console.log('🔑 APIキー状態確認:');

if (!ENV.openaiApiKey) {
  console.error('❌ VITE_OPENAI_API_KEY が設定されていません');
  console.log('💡 解決方法:');
  console.log('  1. プロジェクトルートに .env ファイルを作成');
  console.log('  2. 以下の内容を記述:');
  console.log('     VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx');
  console.log('  3. 開発サーバーを再起動 (npm run dev)');
  console.log('');
} else if (!ENV.openaiApiKey.startsWith('sk-')) {
  console.warn('⚠️ APIキーの形式が正しくない可能性があります (sk-で始まる必要があります)');
  console.log('現在の値の先頭10文字:', ENV.openaiApiKey.substring(0, 10));
} else {
  console.log('✅ OpenAI APIキー設定OK:', ENV.openaiApiKey.substring(0, 20) + '...');
}

if (ENV.amazonApiKey) {
  console.log('✅ Amazon APIキー設定OK');
} else {
  console.log('💡 Amazon APIキー未設定 (オプション機能)');
}

console.log('🌍 動作環境:', ENV.mode);
console.log('🎬 動画形式設定:', Object.keys(API_CONFIG.video.formats));

export default API_CONFIG;