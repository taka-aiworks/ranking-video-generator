// src/services/media/imageService.js - ブラウザ環境対応修正版

import imageConfig from '../../config/imageConfig.js';

class ImageService {
  constructor() {
    // 🔧 修正: ブラウザ環境でのenv変数取得
    this.apiKey = import.meta.env?.VITE_UNSPLASH_ACCESS_KEY || 
                  window.REACT_APP_UNSPLASH_ACCESS_KEY ||
                  null;
    
    this.baseUrl = imageConfig.unsplash.apiUrl;
    this.cache = new Map();
    
    if (!this.apiKey) {
      console.warn('⚠️ Unsplash API キーが設定されていません');
      console.warn('📝 .env に VITE_UNSPLASH_ACCESS_KEY または REACT_APP_UNSPLASH_ACCESS_KEY を設定してください');
    }
  }

  // キーワード・カテゴリ分析
  analyzeKeywordCategory(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    
    for (const [category, config] of Object.entries(imageConfig.categories)) {
      const matchFound = config.keywords.some(kw => 
        lowerKeyword.includes(kw) || kw.includes(lowerKeyword)
      );
      
      if (matchFound) {
        console.log(`🎯 キーワード "${keyword}" → カテゴリ: ${category}`);
        return { category, config };
      }
    }
    
    return { 
      category: 'lifestyle', 
      config: imageConfig.categories.lifestyle 
    };
  }

  // キーワード連動で関連画像を取得
  async fetchRelevantImages(keyword, options = {}) {
    const {
      count = 5,
      orientation = imageConfig.unsplash.orientation,
      quality = imageConfig.unsplash.quality
    } = options;

    // キャッシュチェック
    const cacheKey = `${keyword}_${count}_${orientation}`;
    if (this.cache.has(cacheKey)) {
      console.log('📦 キャッシュから画像取得:', keyword);
      return this.cache.get(cacheKey);
    }

    try {
      // API キーチェック
      if (!this.apiKey) {
        console.warn('⚠️ API キー未設定 - プレースホルダー画像を返します');
        return this.generatePlaceholderImages(keyword, count);
      }

      // カテゴリ分析
      const { category, config } = this.analyzeKeywordCategory(keyword);
      
      // 検索クエリ構築
      const searchQuery = `${keyword} ${config.keywords.slice(0, 2).join(' ')}`;
      
      console.log(`🔍 Unsplash検索: "${searchQuery}" (${category})`);

      // API呼び出し
      const response = await fetch(
        `${this.baseUrl}/search/photos?` + new URLSearchParams({
          query: searchQuery,
          per_page: count,
          orientation: orientation,
          content_filter: imageConfig.unsplash.contentFilter,
          client_id: this.apiKey
        })
      );

      if (!response.ok) {
        throw new Error(`Unsplash API エラー: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        console.warn('🚨 画像が見つかりません - プレースホルダーを使用');
        return this.generatePlaceholderImages(keyword, count);
      }

      // 結果整形
      const images = data.results.map((photo, index) => ({
        id: photo.id,
        url: photo.urls[quality] || photo.urls.regular,
        downloadUrl: photo.urls.full,
        thumbnailUrl: photo.urls.thumb,
        alt: photo.alt_description || `${keyword} 関連画像 ${index + 1}`,
        width: photo.width,
        height: photo.height,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        category: category,
        keyword: keyword
      }));

      console.log(`✅ ${images.length}件の画像を取得: ${keyword}`);
      
      // キャッシュ保存
      this.cache.set(cacheKey, images);
      
      return images;

    } catch (error) {
      console.error('🚨 Unsplash API エラー:', error);
      console.log('📋 プレースホルダー画像にフォールバック');
      return this.generatePlaceholderImages(keyword, count);
    }
  }

  // 単一画像取得
  async fetchMainImage(keyword, options = {}) {
    const images = await this.fetchRelevantImages(keyword, { count: 1, ...options });
    return images[0] || null;
  }

  // プレースホルダー画像生成
  generatePlaceholderImages(keyword, count) {
    const { category } = this.analyzeKeywordCategory(keyword);
    const colors = imageConfig.fallback.placeholderColors;
    
    return Array.from({ length: count }, (_, index) => ({
      id: `placeholder_${keyword}_${index}`,
      url: null,
      isPlaceholder: true,
      alt: `${keyword} プレースホルダー画像 ${index + 1}`,
      width: imageConfig.video.targetWidth,
      height: imageConfig.video.targetHeight,
      backgroundColor: colors[index % colors.length],
      category: category,
      keyword: keyword,
      label: `${keyword}\n関連画像`
    }));
  }

  // 画像プリロード
  async preloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
      if (!imageUrl) {
        resolve(null);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('✅ 画像プリロード完了:', imageUrl.slice(0, 50));
        resolve(img);
      };
      
      img.onerror = (error) => {
        console.warn('⚠️ 画像プリロード失敗:', imageUrl.slice(0, 50));
        resolve(null);
      };
      
      img.src = imageUrl;
    });
  }

  // 複数画像の一括プリロード
  async preloadImages(images) {
    console.log(`🔄 ${images.length}件の画像をプリロード中...`);
    
    const loadPromises = images.map(image => 
      image.url ? this.preloadImage(image.url) : Promise.resolve(null)
    );
    
    const loadedImages = await Promise.all(loadPromises);
    
    return images.map((image, index) => ({
      ...image,
      imageElement: loadedImages[index]
    }));
  }

  // キャッシュクリア
  clearCache() {
    this.cache.clear();
    console.log('🗑️ 画像キャッシュをクリアしました');
  }

  // API使用状況チェック
  async checkApiStatus() {
    if (!this.apiKey) {
      return { status: 'no_key', message: 'API キーが設定されていません' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/stats/total?client_id=${this.apiKey}`
      );

      if (response.ok) {
        return { status: 'ok', message: 'API接続正常' };
      } else {
        return { status: 'error', message: `API エラー: ${response.status}` };
      }
    } catch (error) {
      return { status: 'error', message: 'ネットワークエラー' };
    }
  }
}

const imageService = new ImageService();
export default imageService;