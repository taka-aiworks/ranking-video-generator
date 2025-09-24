// src/config/api.js - API設定ファイル

export const API_CONFIG = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.7
  },
  
  amazon: {
    baseURL: 'https://webservices.amazon.com/paapi5',
    region: 'us-east-1'
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
        resolution: '1080x1920'
      },
      medium: {
        duration: { min: 180, max: 480 },
        aspectRatio: '16:9', 
        resolution: '1920x1080'
      }
    },

    recorder: {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000
    }
  }
};

// 環境変数管理 - Vite形式
export const ENV = {
  isDevelopment: import.meta.env.DEV,
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  amazonApiKey: import.meta.env.VITE_AMAZON_API_KEY || ''
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

export default API_CONFIG;