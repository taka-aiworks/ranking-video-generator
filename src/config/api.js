// src/config/api.js - 一時的強制設定版


// 環境変数の詳細確認とデバッグ
console.log('🔍 環境変数デバッグ情報:');
console.log('- import.meta.env:', import.meta.env);
console.log('- VITE_OPENAI_API_KEY:', import.meta.env.VITE_OPENAI_API_KEY ? '設定済み' : '❌未設定');
console.log('- NODE_ENV/MODE:', import.meta.env.NODE_ENV, import.meta.env.MODE);

// 環境変数管理 - 強制設定版
export const ENV = {
  isDevelopment: import.meta.env.DEV,
  mode: import.meta.env.MODE || 'development',
  // 🚨 一時的: 環境変数が読めない問題を回避
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || FORCE_API_KEY,
  amazonApiKey: import.meta.env.VITE_AMAZON_API_KEY || '',
  isForced: !import.meta.env.VITE_OPENAI_API_KEY
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

// デバッグ情報とバリデーション
console.log('🔑 APIキー状態確認:');

if (ENV.isForced) {
  console.warn('🚨 強制設定モードで動作中');
  console.log('✅ OpenAI APIキー設定: 強制設定により有効');
  console.log('💡 環境変数の問題を後で修正してください');
} else {
  if (!ENV.openaiApiKey.startsWith('sk-')) {
    console.warn('⚠️ APIキーの形式が正しくない可能性があります');
  } else {
    console.log('✅ OpenAI APIキー設定OK:', ENV.openaiApiKey.substring(0, 20) + '...');
  }
}

console.log('🌍 動作環境:', ENV.mode);
console.log('🎬 動画形式設定:', Object.keys(API_CONFIG.video.formats));

export default API_CONFIG;