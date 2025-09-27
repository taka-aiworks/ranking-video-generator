// src/services/media/imageService.js - 二重翻訳回避版

import translationService from '../translation/translationService.js';

class ImageService {
  constructor() {
    this.apiKey = '8L33qjsyEuni44KLmCnBJUjKNmf9PkImDpoC7CKTR0I';
    this.baseUrl = 'https://api.unsplash.com';
    this.cache = new Map();
    
    console.log('🔑 Unsplash API Key設定完了');
    
    // NGキーワード（YouTube矢印など）
    this.avoidKeywords = [
      'subscribe button', 'youtube arrow', 'red arrow', 'play button',
      'logo', 'icon', 'graphic design', 'vector', 'youtube logo',
      'arrow pointing', 'red button', 'navigation arrow', 'ui element'
    ];

    if (typeof window !== 'undefined') {
      window.imageService = this;
    }
  }

  // メイン画像取得
  async fetchMainImage(keyword, options = {}) {
    try {
      console.log('🔍 画像検索開始:', keyword);
      
      // キーワード処理（二重翻訳回避）
      const enhancedKeyword = await this.processKeyword(keyword, options.type);
      console.log('✨ キーワード処理結果:', enhancedKeyword);
      
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

  // キーワード処理（二重翻訳回避）
  async processKeyword(keyword, type) {
    console.log('🔄 キーワード処理開始:', keyword);
    
    // YouTube関連NGキーワードの処理
    if (keyword.includes('youtube') || keyword.includes('subscribe')) {
      return 'thumbs up positive';
    }
    
    // 英語の場合は翻訳せずにそのまま使用（二重翻訳回避）
    const hasJapanese = /[ひらがなカタカナ漢字]/.test(keyword);
    if (!hasJapanese) {
      console.log('📝 英語キーワードそのまま使用:', keyword);
      return this.shortenForSearch(keyword);
    }
    
    // 日本語の場合のみ翻訳
    const translated = await translationService.translateForImageSearch(keyword, {
      type: type
    });
    
    console.log('🌐 翻訳完了:', translated);
    return translated;
  }

  // 検索用キーワード短縮
  shortenForSearch(keyword) {
    if (!keyword) return 'lifestyle modern';
    
    // 3-4単語に制限
    const words = keyword.split(' ').filter(word => word.length > 0);
    if (words.length > 4) {
      return words.slice(0, 4).join(' ');
    }
    
    return keyword.trim();
  }

  // 関連画像一括取得
  async fetchRelevantImages(keyword, options = {}) {
    try {
      const count = options.count || 3;
      const results = [];
      
      // バリエーション生成（日本語の場合のみ）
      const hasJapanese = /[ひらがなカタカナ漢字]/.test(keyword);
      let variations;
      
      if (hasJapanese) {
        variations = await translationService.generateVariations(keyword, count);
      } else {
        // 英語の場合は修飾語を追加
        const modifiers = ['beautiful', 'modern', 'bright'];
        variations = [keyword];
        for (let i = 1; i < count; i++) {
          variations.push(`${keyword} ${modifiers[i - 1]}`);
        }
      }
      
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
    return {
      id: 'placeholder_' + Date.now() + '_' + Math.random(),
      url: null,
      isPlaceholder: true,
      keyword: keyword,
      alt: '🖼️ 関連画像',
      backgroundColor: '#f5f5f5',
      textColor: '#616161',
      displayText: '🖼️ 関連画像'
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
}

const imageService = new ImageService();
export default imageService;