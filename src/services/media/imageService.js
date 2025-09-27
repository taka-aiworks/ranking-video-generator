// src/services/media/imageService.js - 動的キーワード対応版

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
      
      // 🆕 動的キーワード変換（固定マッピング削除）
      const enhancedKeyword = this.dynamicTranslateKeyword(keyword, options.type);
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

  // 🆕 動的キーワード変換（固定マッピング削除）
  dynamicTranslateKeyword(keyword, type) {
    // 日本語が含まれている場合の基本変換
    const hasJapanese = /[ひらがなカタカナ漢字]/.test(keyword);
    
    if (hasJapanese) {
      // 基本的な日本語→英語変換
      let englishKeyword = keyword;
      
      // コンテンツ内容に基づく動的変換
      if (keyword.includes('コミュニケーション') || keyword.includes('話') || keyword.includes('会話')) {
        englishKeyword = 'family conversation talking together';
      } else if (keyword.includes('遊び') || keyword.includes('ゲーム') || keyword.includes('活動')) {
        englishKeyword = 'children playing games activities fun';
      } else if (keyword.includes('学習') || keyword.includes('勉強') || keyword.includes('教育')) {
        englishKeyword = 'learning education knowledge books';
      } else if (keyword.includes('ルーティン') || keyword.includes('習慣') || keyword.includes('日課')) {
        englishKeyword = 'daily routine schedule planning';
      } else if (keyword.includes('褒める') || keyword.includes('ポジティブ') || keyword.includes('励ます')) {
        englishKeyword = 'praise encouragement positive parenting';
      } else if (keyword.includes('成長') || keyword.includes('発達')) {
        englishKeyword = 'child development growth progress';
      } else if (keyword.includes('健康') || keyword.includes('運動') || keyword.includes('体')) {
        englishKeyword = 'healthy lifestyle fitness wellness';
      } else if (keyword.includes('料理') || keyword.includes('食事') || keyword.includes('キッチン')) {
        englishKeyword = 'cooking food kitchen family meal';
      } else if (keyword.includes('読書') || keyword.includes('本') || keyword.includes('読み聞かせ')) {
        englishKeyword = 'reading books parent child story';
      } else if (keyword.includes('外出') || keyword.includes('公園') || keyword.includes('散歩')) {
        englishKeyword = 'outdoor family park walking nature';
      } else if (keyword.includes('子育て') || keyword.includes('育児') || keyword.includes('親子')) {
        englishKeyword = 'parenting family children happy';
      } else if (keyword.includes('youtube') || keyword.includes('チャンネル登録') || keyword.includes('いいね')) {
        englishKeyword = 'thumbs up positive feedback like';
      } else {
        // 汎用的な変換
        englishKeyword = 'family lifestyle children happy';
      }
      
      return englishKeyword;
    }
    
    // 英語キーワードの場合、そのまま使用
    if (keyword.includes('youtube') || keyword.includes('subscribe')) {
      return 'thumbs up positive feedback like';
    }
    
    // タイプ別の調整
    if (type === 'title') {
      return keyword + ' lifestyle beautiful';
    }
    if (type === 'summary') {
      return 'thumbs up like positive feedback';
    }
    
    return keyword;
  }

  // 関連画像一括取得
  async fetchRelevantImages(keyword, options = {}) {
    try {
      const count = options.count || 3;
      const results = [];
      
      const variations = this.generateKeywordVariations(keyword);
      
      for (let i = 0; i < Math.min(variations.length, count); i++) {
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

  // キーワードバリエーション生成
  generateKeywordVariations(baseKeyword) {
    const variations = [baseKeyword];
    
    const enhanced = this.dynamicTranslateKeyword(baseKeyword);
    if (enhanced !== baseKeyword) {
      variations.push(enhanced);
    }
    
    // 動的バリエーション追加
    if (baseKeyword.includes('family') || baseKeyword.includes('children')) {
      variations.push(baseKeyword + ' lifestyle modern');
      variations.push(baseKeyword + ' bright natural light');
    } else {
      variations.push(baseKeyword + ' professional clean');
      variations.push(baseKeyword + ' minimalist design');
    }
    
    return variations.slice(0, 3);
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
      'family': { bg: '#e8f4fd', text: '👪 家族のイメージ', color: '#1976d2' },
      'children': { bg: '#fff3e0', text: '🧒 子供のイメージ', color: '#f57c00' },
      'learning': { bg: '#e8f5e8', text: '📚 学習のイメージ', color: '#388e3c' },
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
}

const imageService = new ImageService();
export default imageService;