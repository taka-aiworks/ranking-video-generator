// src/services/media/imageService.js - 完全修正版

const UNSPLASH_API = 'https://api.unsplash.com';

class ImageService {
  constructor() {
    // 🔧 ブラウザ環境対応のAPI キー取得
    this.apiKey = null;
    
    // 複数の環境変数パターンをチェック
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      this.apiKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    } else if (typeof window !== 'undefined' && window.env) {
      this.apiKey = window.env.UNSPLASH_ACCESS_KEY;
    }
    
    this.cache = new Map();
    this.requestQueue = new Map();
    
    if (!this.apiKey) {
      console.warn('⚠️ Unsplash API キー未設定 - プレースホルダーモードで動作');
    } else {
      console.log('✅ Unsplash API キー設定完了');
    }
  }

  // API接続確認
  async checkApiStatus() {
    if (!this.apiKey) {
      return { status: 'no_key', message: 'API キーが設定されていません' };
    }

    try {
      const response = await fetch(`${UNSPLASH_API}/photos/random?client_id=${this.apiKey}`);
      if (response.ok) {
        return { status: 'ok', message: 'Unsplash API接続成功' };
      } else {
        return { status: 'error', message: 'API認証エラー' };
      }
    } catch (error) {
      return { status: 'error', message: 'API接続失敗' };
    }
  }

  // メイン画像取得
  async fetchMainImage(keyword, options = {}) {
    const { orientation = 'landscape', size = 'regular' } = options;
    const cacheKey = `${keyword}_${orientation}_${size}`;

    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      console.log(`📦 キャッシュから画像取得: ${keyword}`);
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`🔍 画像検索: "${keyword}"`);
      
      // APIキーがない場合はプレースホルダー
      if (!this.apiKey) {
        console.log('📋 API キー未設定 - プレースホルダー使用');
        const placeholder = this.createPlaceholder(keyword);
        this.cache.set(cacheKey, placeholder);
        return placeholder;
      }
      
      const searchParams = new URLSearchParams({
        query: keyword,
        orientation,
        per_page: 1,
        client_id: this.apiKey
      });

      const response = await fetch(`${UNSPLASH_API}/search/photos?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const photo = data.results[0];
        const imageData = {
          id: photo.id,
          url: photo.urls[size] || photo.urls.regular,
          thumbnailUrl: photo.urls.thumb,
          alt: photo.alt_description || keyword,
          photographer: photo.user.name,
          isPlaceholder: false
        };

        console.log(`✅ 画像URL取得: ${imageData.url}`); // URL確認用ログ
        
        // キャッシュ保存
        this.cache.set(cacheKey, imageData);
        return imageData;
      } else {
        // 検索結果なし - プレースホルダー
        const placeholder = this.createPlaceholder(keyword);
        this.cache.set(cacheKey, placeholder);
        return placeholder;
      }
    } catch (error) {
      console.warn(`⚠️ 画像取得エラー (${keyword}):`, error);
      const placeholder = this.createPlaceholder(keyword);
      this.cache.set(cacheKey, placeholder);
      return placeholder;
    }
  }

  // 複数画像取得
  async fetchRelevantImages(keyword, options = {}) {
    const { count = 5, orientation = 'landscape' } = options;

    // APIキーがない場合はプレースホルダー配列
    if (!this.apiKey) {
      console.log(`📋 API キー未設定 - ${count}件のプレースホルダー生成`);
      return Array.from({ length: count }, (_, i) => 
        this.createPlaceholder(`${keyword} ${i + 1}`)
      );
    }

    try {
      const searchParams = new URLSearchParams({
        query: keyword,
        orientation,
        per_page: count,
        client_id: this.apiKey
      });

      const response = await fetch(`${UNSPLASH_API}/search/photos?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return data.results.map(photo => ({
          id: photo.id,
          url: photo.urls.regular,
          thumbnailUrl: photo.urls.thumb,
          alt: photo.alt_description || keyword,
          photographer: photo.user.name,
          isPlaceholder: false
        }));
      } else {
        // プレースホルダー配列
        return Array.from({ length: count }, (_, i) => 
          this.createPlaceholder(`${keyword} ${i + 1}`)
        );
      }
    } catch (error) {
      console.warn(`⚠️ 複数画像取得エラー (${keyword}):`, error);
      return Array.from({ length: count }, (_, i) => 
        this.createPlaceholder(`${keyword} ${i + 1}`)
      );
    }
  }

  // 画像プリロード
  async preloadImage(url) {
    if (!url) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log(`✅ 画像プリロード完了: ${url.substring(0, 50)}...`);
        resolve(img);
      };
      
      img.onerror = () => {
        console.warn(`⚠️ 画像プリロード失敗: ${url}`);
        resolve(null);
      };
      
      img.src = url;
    });
  }

  // プレースホルダー作成
  createPlaceholder(keyword) {
    return {
      id: `placeholder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: null,
      thumbnailUrl: null,
      alt: `${keyword} プレースホルダー`,
      photographer: 'システム生成',
      isPlaceholder: true,
      keyword: keyword,
      backgroundColor: this.getPlaceholderColor(keyword)
    };
  }

  // プレースホルダー色生成
  getPlaceholderColor(keyword) {
    // キーワードベースで一貫した色を生成
    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
      hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 40%, 90%)`; // 薄い色調
  }

  // キャッシュクリア
  clearCache() {
    this.cache.clear();
    console.log('🗑️ ImageService キャッシュクリア');
  }

  // キャッシュ統計
  getCacheStats() {
    return {
      cachedItems: this.cache.size,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
}

const imageService = new ImageService();
export default imageService;