// src/services/media/imageService.js - 動的翻訳統合版

import translationService from '../translation/translationService.js';

class ImageService {
  constructor() {
    // 直接API Key設定（確実に動作）
    this.apiKey = '8L33qjsyEuni44KLmCnBJUjKNmf9PkImDpoC7CKTR0I';
    this.baseUrl = 'https://api.unsplash.com';
    this.cache = new Map();
    
    console.log('🔑 Unsplash API Key設定完了');
    
    // NGキーワード（YouTube矢印など避けたい画像）
    this.avoidKeywords = [
      'subscribe button', 'youtube arrow', 'red arrow', 'play button',
      'logo', 'icon', 'graphic design', 'vector', 'youtube logo',
      'arrow pointing', 'red button', 'navigation arrow', 'ui element'
    ];

    // グローバル登録
    if (typeof window !== 'undefined') {
      window.imageService = this;
    }
  }

  // メイン画像取得
  async fetchMainImage(keyword, options = {}) {
    try {
      console.log('🔍 画像検索開始:', keyword);
      
      // 🆕 動的翻訳システムを使用
      const enhancedKeyword = await this.translateKeyword(keyword, options.type);
      console.log('✨ 変換後キーワード:', enhancedKeyword);
      
      if (!this.apiKey) {
        return this.createPlaceholder(keyword);
      }
      
      // 画像検索実行
      const searchResults = await this.searchImages(enhancedKeyword, {
        per_page: 5,
        orientation: options.orientation || 'landscape',
        order_by: 'relevance'
      });
      
      if (!searchResults || searchResults.length === 0) {
        console.log('📝 検索結果なし - プレースホルダー生成');
        return this.createPlaceholder(keyword);
      }
      
      // 最適画像を選択（NGキーワード除外）
      const selectedImage = this.selectBestImage(searchResults, keyword);
      const formatted = this.formatImageData(selectedImage, keyword);
      
      console.log('✅ 画像選択完了:', formatted.photographer || 'Unknown');
      return formatted;
      
    } catch (error) {
      console.warn('⚠️ 画像取得エラー:', error.message);
      return this.createPlaceholder(keyword);
    }
  }

  // 🆕 動的翻訳システム統合
  async translateKeyword(keyword, type) {
    console.log('🔄 キーワード変換開始:', keyword);
    
    // 🚫 YouTube関連NGキーワードの処理
    if (keyword.includes('youtube') || keyword.includes('subscribe')) {
      return 'thumbs up positive feedback like';
    }
    
    // 🆕 translationService を使用して動的翻訳
    const translated = await translationService.translateForImageSearch(keyword, {
      type: type,
      context: 'image_search'
    });
    
    console.log('🌐 動的翻訳結果:', translated);
    return translated;
  }

  // 関連画像一括取得
  async fetchRelevantImages(keyword, options = {}) {
    try {
      const count = options.count || 3;
      const results = [];
      
      // 🆕 translationService を使用してバリエーション生成
      const variations = await translationService.generateVariations(keyword, count);
      
      for (let i = 0; i < variations.length; i++) {
        const image = await this.fetchMainImage(variations[i], {
          ...options,
          type: 'variation_' + i
        });
        if (image) {
          results.push(image);
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('🚨 関連画像取得エラー:', error);
      return [this.createPlaceholder(keyword)];
    }
  }

  // 最適画像選択（NGキーワードフィルター）
  selectBestImage(images, originalKeyword) {
    if (!images || images.length === 0) return null;
    
    console.log('🔍 画像フィルタリング:', images.length + '件から選択');
    
    // NGキーワードを含む画像を除外
    const filtered = images.filter(img => {
      const description = (img.description || '').toLowerCase();
      const altDescription = (img.alt_description || '').toLowerCase();
      
      const hasNgKeyword = this.avoidKeywords.some(avoid => 
        description.includes(avoid) || altDescription.includes(avoid)
      );
      
      if (hasNgKeyword) {
        console.log('🚫 除外:', img.alt_description);
      }
      
      return !hasNgKeyword;
    });
    
    const selected = filtered.length > 0 ? filtered[0] : images[0];
    console.log('✅ 選択:', selected.alt_description || 'No description');
    
    return selected;
  }

  // 画像検索API呼び出し
  async searchImages(query, options = {}) {
    const params = new URLSearchParams({
      query: query,
      client_id: this.apiKey,
      per_page: options.per_page || 1,
      orientation: options.orientation || 'landscape',
      order_by: options.order_by || 'relevance'
    });

    const response = await fetch(this.baseUrl + '/search/photos?' + params);
    
    if (!response.ok) {
      throw new Error('API Error: ' + response.status);
    }
    
    const data = await response.json();
    return data.results || [];
  }

  // 画像データ整形
  formatImageData(imageData, keyword) {
    if (!imageData) return null;
    
    return {
      id: imageData.id,
      url: imageData.urls.regular || imageData.urls.small,
      thumbnailUrl: imageData.urls.thumb || imageData.urls.small,
      alt: imageData.alt_description || keyword,
      description: imageData.description,
      photographer: imageData.user.name,
      keyword: keyword,
      isPlaceholder: false
    };
  }

  // プレースホルダー画像生成
  createPlaceholder(keyword) {
    const placeholders = {
      '子育て': { bg: '#e8f4fd', text: '👪 家族のイメージ', color: '#1976d2' },
      '育児': { bg: '#fff3e0', text: '🍼 育児のイメージ', color: '#f57c00' },
      '節約': { bg: '#e8f5e8', text: '💰 節約のイメージ', color: '#388e3c' },
      'default': { bg: '#f5f5f5', text: '🖼️ 関連画像', color: '#616161' }
    };
    
    const style = Object.keys(placeholders).find(key => 
      keyword.includes(key)
    ) || 'default';
    
    const config = placeholders[style];
    
    return {
      id: 'placeholder_' + Date.now() + '_' + Math.random(),
      url: null,
      isPlaceholder: true,
      keyword: keyword,
      alt: config.text,
      backgroundColor: config.bg,
      textColor: config.color,
      displayText: config.text
    };
  }

  // API状況確認
  async checkApiStatus() {
    try {
      if (!this.apiKey) {
        return { status: 'error', message: 'API Key not configured' };
      }
      
      const response = await fetch(this.baseUrl + '/photos/random?client_id=' + this.apiKey + '&count=1');
      return response.ok ? { status: 'ok' } : { status: 'error', message: 'API connection failed' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // 画像プリロード
  async preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('画像読み込み失敗'));
      img.src = url;
    });
  }

  // キャッシュクリア
  clearCache() {
    this.cache.clear();
    console.log('🗑️ ImageService キャッシュクリア');
  }

  // 翻訳統計取得
  getTranslationStats() {
    return translationService.getStats();
  }
}

const imageService = new ImageService();
export default imageService;