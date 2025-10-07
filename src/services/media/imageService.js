// src/services/media/imageService.js - 二重翻訳回避版

import translationService from '../translation/translationService.js';
import imageConfig from '../../config/imageConfig.js';

class ImageService {
  constructor() {
    // 環境変数からAPIキーを取得（フォールバック付き）
    this.apiKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '8L33qjsyEuni44KLmCnBJUjKNmf9PkImDpoC7CKTR0I';
    this.baseUrl = 'https://api.unsplash.com';
    this.cache = new Map();
    
    console.log('🔑 Unsplash API Key設定完了:', this.apiKey ? '設定済み' : '❌未設定');
    
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

  // ユーティリティ: 待機
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // メイン画像取得
  async fetchMainImage(keyword, options = {}) {
    try {
      console.log('🔍 画像検索開始:', keyword);
      
      // キーワード処理（二重翻訳回避）
      const enhancedKeyword = await this.processKeyword(keyword, options.type);
      console.log('✨ キーワード処理結果:', enhancedKeyword);
      
      if (!this.apiKey) {
        console.log('⚠️ APIキー未設定 - プレースホルダー使用');
        return this.createPlaceholder(keyword);
      }
      
      // レート制限チェック（厳格版）
      const now = Date.now();
      const lastRequest = this.cache.get('last_request') || 0;
      const timeDiff = now - lastRequest;
      
      // 最小間隔: 5秒（50 requests/hour制限対応 - より安全）
      if (timeDiff < 5000) {
        const waitTime = 5000 - timeDiff;
        console.log(`⏳ レート制限回避: ${waitTime}ms待機 (50 requests/hour制限 - 安全モード)`);
        await this.sleep(waitTime);
      }
      
      this.cache.set('last_request', Date.now());
      
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

  // 最適画像選択（NGキーワード＋品質フィルター）
  selectBestImage(images, originalKeyword) {
    if (!images || images.length === 0) return null;
    
    console.log('🔍 画像フィルタリング:', images.length + '件から選択');
    
    // NGキーワードを含む画像を除外
    const keywordFiltered = images.filter(img => {
      const description = (img.description || '').toLowerCase();
      const altDescription = (img.alt_description || '').toLowerCase();
      
      const hasNgKeyword = this.avoidKeywords.some(avoid => 
        description.includes(avoid) || altDescription.includes(avoid)
      );
      
      if (hasNgKeyword) {
        console.log('🚫 NGキーワード除外:', img.alt_description);
      }
      
      return !hasNgKeyword;
    });
    
    // 品質フィルター：最小解像度チェック
    const qualityFiltered = keywordFiltered.filter(img => {
      const width = img.width || 0;
      const height = img.height || 0;
      const pixels = width * height;
      const minPixels = 640 * 480; // 最小解像度
      
      if (pixels < minPixels) {
        console.log(`🚫 低解像度除外: ${width}x${height} (${img.alt_description})`);
        return false;
      }
      
      return true;
    });
    
    // 品質スコアで並び替え
    const scoredImages = qualityFiltered.map(img => ({
      ...img,
      qualityScore: this.calculateImageQualityScore(img)
    })).sort((a, b) => b.qualityScore - a.qualityScore);
    
    const selected = scoredImages.length > 0 ? scoredImages[0] : 
                    (keywordFiltered.length > 0 ? keywordFiltered[0] : images[0]);
    
    console.log('✅ 選択:', selected.alt_description || 'No description', 
                selected.qualityScore ? `(品質: ${selected.qualityScore})` : '');
    
    return selected;
  }

  // 画像品質スコア計算
  calculateImageQualityScore(imageData) {
    let score = 0;
    
    // 解像度スコア (0-40点)
    const width = imageData.width || 0;
    const height = imageData.height || 0;
    const pixels = width * height;
    
    if (pixels >= 2073600) score += 40; // 1920x1080以上
    else if (pixels >= 1382400) score += 35; // 1440x960以上
    else if (pixels >= 921600) score += 30; // 1280x720以上
    else if (pixels >= 614400) score += 20; // 1024x600以上
    else if (pixels >= 307200) score += 10; // 640x480以上
    
    // アスペクト比スコア (0-20点)
    const aspectRatio = width / height;
    const targetAspectRatio = 16 / 9; // 1.78
    const aspectDiff = Math.abs(aspectRatio - targetAspectRatio);
    
    if (aspectDiff < 0.1) score += 20;
    else if (aspectDiff < 0.3) score += 15;
    else if (aspectDiff < 0.5) score += 10;
    else if (aspectDiff < 1.0) score += 5;
    
    // いいね数スコア (0-20点)
    const likes = imageData.likes || 0;
    if (likes >= 1000) score += 20;
    else if (likes >= 500) score += 15;
    else if (likes >= 100) score += 10;
    else if (likes >= 50) score += 5;
    
    // 説明文スコア (0-20点)
    const hasDescription = !!(imageData.description || imageData.alt_description);
    const descLength = (imageData.description || imageData.alt_description || '').length;
    
    if (hasDescription) {
      if (descLength >= 50) score += 20;
      else if (descLength >= 20) score += 15;
      else if (descLength >= 10) score += 10;
      else score += 5;
    }
    
    return score;
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
      if (response.status === 403) {
        console.error('🚨 Unsplash API 403エラー: APIキーが無効または制限に達しています');
        console.log('💡 解決方法:');
        console.log('  1. Unsplash DeveloperでAPIキーを確認');
        console.log('  2. レート制限を確認 (50 requests/hour)');
        console.log('  3. .envファイルにVITE_UNSPLASH_ACCESS_KEYを設定');
        console.log('  4. 新しいAPIキーを取得して設定');
        console.log('  5. 現在のAPIキー: ' + this.apiKey.substring(0, 20) + '...');
        return []; // 空配列を返してプレースホルダーにフォールバック
      }
      throw new Error('API Error: ' + response.status);
    }
    
    const data = await response.json();
    return data.results || [];
  }

  // 画像データ整形（高解像度URLを優先・アスペクト比考慮）
  formatImageData(imageData, keyword) {
    if (!imageData) return null;
    
    const targetWidth = imageConfig.video?.targetWidth || 1920;
    const targetHeight = imageConfig.video?.targetHeight || 1080;
    const targetAspectRatio = targetWidth / targetHeight;

    // 元画像のサイズ情報
    const originalWidth = imageData.width || targetWidth;
    const originalHeight = imageData.height || targetHeight;
    const originalAspectRatio = originalWidth / originalHeight;

    console.log(`📐 画像アスペクト比: ${originalAspectRatio.toFixed(2)} (元: ${originalWidth}x${originalHeight})`);

    // Unsplash raw にクエリを付与して高解像度かつ圧縮品質を指定
    const raw = imageData.urls?.raw;
    const full = imageData.urls?.full;
    const regular = imageData.urls?.regular;

    let bestUrl;
    
    if (raw) {
      // 高解像度対応：アスペクト比に応じて適切なサイズを計算
      let requestWidth, requestHeight;
      
      // より高解像度を要求（2倍の解像度で取得してからリサイズ）
      const highResMultiplier = 2;
      const highResTargetWidth = targetWidth * highResMultiplier;
      const highResTargetHeight = targetHeight * highResMultiplier;
      
      if (Math.abs(originalAspectRatio - targetAspectRatio) < 0.1) {
        // アスペクト比が近い場合は高解像度で直接リサイズ
        requestWidth = Math.max(highResTargetWidth, 2560); // 最小2560px
        requestHeight = Math.max(highResTargetHeight, 1440); // 最小1440px
      } else if (originalAspectRatio > targetAspectRatio) {
        // 横長画像：高さ基準でクロップ（高解像度）
        requestHeight = Math.max(highResTargetHeight, 1440);
        requestWidth = Math.round(requestHeight * originalAspectRatio);
      } else {
        // 縦長画像：幅基準でクロップ（高解像度）
        requestWidth = Math.max(highResTargetWidth, 2560);
        requestHeight = Math.round(requestWidth / originalAspectRatio);
      }

      // 最高品質パラメータ
      const qualityParams = [
        `w=${requestWidth}`,
        `h=${requestHeight}`,
        `fit=crop`,
        `crop=entropy`,
        `q=95`, // 最高品質
        `fm=webp`, // WebP形式（高品質・小サイズ）
        `auto=format`,
        `dpr=2` // 高解像度ディスプレイ対応
      ].join('&');
      
      bestUrl = `${raw}&${qualityParams}`;
      console.log(`🎯 最適化URL生成: ${requestWidth}x${requestHeight}`);
    } else {
      bestUrl = full || regular || imageData.urls?.small;
      console.log('⚠️ Raw URL不可 - フォールバック使用');
    }

    return {
      id: imageData.id,
      url: bestUrl,
      thumbnailUrl: imageData.urls.thumb || imageData.urls.small,
      alt: imageData.alt_description || keyword,
      description: imageData.description,
      photographer: imageData.user.name,
      keyword: keyword,
      isPlaceholder: false,
      originalWidth: originalWidth,
      originalHeight: originalHeight,
      originalAspectRatio: originalAspectRatio,
      optimizedForTarget: !!raw
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