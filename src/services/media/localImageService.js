// src/services/media/localImageService.js
// ローカル保存されたいらすとや画像を管理するサービス

class LocalImageService {
  constructor() {
    // 動的にサーバーURLを決定（同じWiFi内のデバイスからアクセス可能）
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const serverHost = isLocalhost ? 'localhost' : window.location.hostname;
    this.baseUrl = `http://${serverHost}:3001`; // スクレイピングサーバーのURL
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分間キャッシュ
    console.log('🏠 ローカル画像サービス初期化完了:', this.baseUrl);
  }

  // キャッシュをクリア
  clearCache() {
    this.cache.clear();
    console.log('🗑️ ローカル画像キャッシュクリア');
  }

  // サーバー状態を確認
  async checkServerStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      const data = await response.json();
      console.log('✅ サーバー状態:', data.message);
      return true;
    } catch (error) {
      console.error('❌ サーバー接続エラー:', error);
      console.log('💡 サーバーが起動していない可能性があります。サーバーを起動してください。');
      return false;
    }
  }

  // API呼び出しのヘルパー関数
  async apiCall(endpoint, options = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ API呼び出しエラー (${endpoint}):`, error);
      throw error;
    }
  }

  // キーワードで画像を検索
  async searchImages(keyword, limit = 20) {
    const cacheKey = `search_${keyword}_${limit}`;
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log(`📋 キャッシュから画像検索結果を取得: "${keyword}"`);
        return cached.data;
      }
    }

    try {
      console.log(`🔍 ローカル画像検索: "${keyword}"`);
      const result = await this.apiCall(`/api/images/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
      
      // 検索結果がない場合のフォールバック
      if (result.success && result.images && result.images.length === 0) {
        console.log(`⚠️ キーワード検索結果なし: "${keyword}" - 全画像からランダム選択`);
        const allImagesResult = await this.getAllImages(limit);
        if (allImagesResult.success && allImagesResult.images.length > 0) {
          console.log(`✅ 全画像からランダム選択: ${allImagesResult.images.length}件`);
          return allImagesResult;
        }
      }
      
      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error(`❌ 画像検索エラー:`, error);
      
      // エラー時のフォールバック: 全画像からランダム選択
      console.log('🔄 エラー時フォールバック: 全画像からランダム選択');
      try {
        const allImagesResult = await this.getAllImages(limit);
        if (allImagesResult.success && allImagesResult.images.length > 0) {
          console.log(`✅ エラー時フォールバック成功: ${allImagesResult.images.length}件`);
          return allImagesResult;
        }
      } catch (fallbackError) {
        console.error('❌ フォールバックエラー:', fallbackError);
      }
      
      return {
        success: false,
        keyword: keyword,
        count: 0,
        images: []
      };
    }
  }

  // 全画像を取得
  async getAllImages(limit = null) {
    const cacheKey = `all_${limit || 'unlimited'}`;
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📋 キャッシュから全画像を取得');
        return cached.data;
      }
    }

    try {
      console.log('📚 全ローカル画像を取得中...');
      const endpoint = limit ? `/api/images/all?limit=${limit}` : '/api/images/all';
      const result = await this.apiCall(endpoint);
      
      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error(`❌ 全画像取得エラー:`, error);
      // フォールバック: 空の結果を返す
      return {
        success: false,
        totalCount: 0,
        count: 0,
        images: []
      };
    }
  }

  // カテゴリ別画像を取得
  async getImagesByCategory(categoryName, limit = 20) {
    try {
      console.log(`📁 カテゴリ「${categoryName}」の画像を取得中...`);
      const result = await this.searchImages(categoryName, limit);
      
      // カテゴリ名でフィルタリング
      if (result.success && result.images) {
        const categoryImages = result.images.filter(img => 
          img.category === categoryName
        );
        
        return {
          ...result,
          count: categoryImages.length,
          images: categoryImages
        };
      }
      
      return result;
    } catch (error) {
      console.error(`❌ カテゴリ画像取得エラー:`, error);
      return {
        success: false,
        count: 0,
        images: []
      };
    }
  }

  // メタデータを取得
  async getMetadata() {
    const cacheKey = 'metadata';
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📋 キャッシュからメタデータを取得');
        return cached.data;
      }
    }

    try {
      console.log('📊 メタデータを取得中...');
      const result = await this.apiCall('/api/metadata');
      
      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error(`❌ メタデータ取得エラー:`, error);
      return {
        success: false,
        metadata: {
          totalImages: 0,
          lastUpdated: null,
          categories: []
        }
      };
    }
  }

  // カテゴリ一覧を取得
  async getCategories() {
    try {
      console.log('📂 カテゴリ一覧を取得中...');
      const result = await this.apiCall('/api/categories');
      return result;
    } catch (error) {
      console.error(`❌ カテゴリ一覧取得エラー:`, error);
      return {
        success: false,
        categories: []
      };
    }
  }

  // スクレイピングを開始
  async startScraping(categoryName = null) {
    try {
      if (categoryName) {
        console.log(`🚀 カテゴリ「${categoryName}」スクレイピング開始`);
        const result = await this.apiCall(`/api/scrape/category/${categoryName}`, {
          method: 'POST',
          body: JSON.stringify({ maxPages: 3 })
        });
        return result;
      } else {
        console.log('🚀 全カテゴリスレイピング開始');
        const result = await this.apiCall('/api/scrape/all', {
          method: 'POST'
        });
        return result;
      }
    } catch (error) {
      console.error(`❌ スクレイピングエラー:`, error);
      return {
        success: false,
        message: 'スクレイピングエラー',
        error: error.message
      };
    }
  }

  // サーバーのヘルスチェック
  async healthCheck() {
    try {
      const result = await this.apiCall('/api/health');
      return result;
    } catch (error) {
      console.error('❌ サーバーヘルスチェックエラー:', error);
      return {
        status: 'ERROR',
        message: 'サーバーに接続できません'
      };
    }
  }

  // メタデータをクリーンアップ
  async cleanupMetadata() {
    try {
      console.log('🧹 メタデータクリーンアップ開始...');
      const result = await this.apiCall('/api/cleanup', {
        method: 'POST'
      });
      
      // キャッシュをクリア
      this.clearCache();
      
      return result;
    } catch (error) {
      console.error('❌ メタデータクリーンアップエラー:', error);
      return {
        success: false,
        message: 'クリーンアップエラー',
        error: error.message
      };
    }
  }

  // 画像のフルURLを生成
  getImageUrl(localPath) {
    if (!localPath) return null;
    
    // 既にフルURLの場合はそのまま返す
    if (localPath.startsWith('http')) {
      return localPath;
    }
    
    // ローカルパスの場合はサーバーURLを追加
    return `${this.baseUrl}${localPath}`;
  }

  // 画像オブジェクトを標準形式に変換
  normalizeImage(localImage) {
    const imageUrl = this.getImageUrl(localImage.localPath);
    console.log('🖼️ 画像URL生成:', {
      localPath: localImage.localPath,
      fullUrl: imageUrl,
      title: localImage.title
    });
    
    return {
      url: imageUrl,
      alt: localImage.title || 'いらすとや画像',
      source: 'local_irasutoya',
      author: 'いらすとや',
      category: localImage.category,
      originalUrl: localImage.originalUrl,
      downloadedAt: localImage.downloadedAt
    };
  }

  // 画像リストを標準形式に変換
  normalizeImages(localImages) {
    if (!localImages || !Array.isArray(localImages)) {
      return [];
    }
    
    // 重複を除去（URLベース）
    const uniqueImages = [];
    const seenUrls = new Set();
    
    for (const img of localImages) {
      const normalizedImg = this.normalizeImage(img);
      if (!seenUrls.has(normalizedImg.url)) {
        seenUrls.add(normalizedImg.url);
        uniqueImages.push(normalizedImg);
      }
    }
    
    return uniqueImages;
  }
}

// シングルトンインスタンスをエクスポート
const localImageService = new LocalImageService();
export default localImageService;
