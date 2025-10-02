// src/config/imageConfig.js - 画像関連設定

export const imageConfig = {
  // Unsplash API設定
  unsplash: {
    apiUrl: 'https://api.unsplash.com',
    defaultPerPage: 30,
    orientation: 'landscape', // 'portrait', 'squarish', 'landscape'
    quality: 'raw', // 'raw', 'full', 'regular', 'small', 'thumb' - 最高品質を優先
    contentFilter: 'high', // コンテンツフィルター
    minWidth: 1280, // 最小幅
    minHeight: 720, // 最小高さ
    preferredAspectRatio: 16/9, // 推奨アスペクト比
  },

  // 動画統合設定
  video: {
    targetWidth: 1920,
    targetHeight: 1080,
    imagePosition: 'bottom-half', // 'top-half', 'full', 'split'
    imageQuality: 0.9, // Canvas描画品質
    fallbackImage: '/images/placeholder.jpg', // フォールバック画像
  },

  // 分野別キーワードマッピング
  categories: {
    health: {
      keywords: ['fitness', 'wellness', 'exercise', 'nutrition', 'health'],
      imageStyle: 'energetic'
    },
    money: {
      keywords: ['business', 'finance', 'investment', 'success', 'money'],
      imageStyle: 'professional'
    },
    lifestyle: {
      keywords: ['lifestyle', 'home', 'daily', 'life', 'living'],
      imageStyle: 'warm'
    },
    skill: {
      keywords: ['education', 'learning', 'skill', 'development', 'study'],
      imageStyle: 'focused'
    },
    technology: {
      keywords: ['tech', 'digital', 'gadget', 'software', 'innovation'],
      imageStyle: 'modern'
    },
    food: {
      keywords: ['food', 'cooking', 'recipe', 'cuisine', 'dining'],
      imageStyle: 'appetizing'
    }
  },

  // 画像処理設定
  processing: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    resizeQuality: 0.92, // 品質向上
    cacheExpiry: 24 * 60 * 60 * 1000, // 24時間
    cropMode: 'crop', // デフォルトクロップモード
    smoothingEnabled: true, // 高品質補間
    smoothingQuality: 'high', // 補間品質
  },

  // エラー処理設定
  fallback: {
    retryAttempts: 3,
    retryDelay: 1000, // 1秒
    useLocalPlaceholder: true,
    placeholderColors: ['#f8f9fa', '#e9ecef', '#dee2e6'],
  }
};

export default imageConfig;