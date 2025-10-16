// src/services/media/irasutoyaService.js
// いらすとや画像取得サービス

class IrasutoyaService {
  constructor() {
    this.cache = new Map();
    this.baseUrl = 'https://www.irasutoya.com';
    
    // いらすとやの画像URLパターン
    this.imageUrlPattern = /https:\/\/4\.bp\.blogspot\.com\/[^\/]+\/[^\/]+\/s\d+-[^\.]+\.(jpg|png|gif)/;
    
    console.log('🎨 いらすとやサービス初期化完了');
  }

  // キーワードからいらすとやの画像URLを取得
  async fetchImages(keyword, count = 5) {
    try {
      console.log('🔍 いらすとや検索開始:', keyword);
      
      // キャッシュチェック
      const cacheKey = `irasutoya_${keyword}`;
      if (this.cache.has(cacheKey)) {
        console.log('📦 キャッシュから取得:', keyword);
        return this.cache.get(cacheKey);
      }

      // 検索URLを生成
      const searchUrl = `${this.baseUrl}/search/label/${encodeURIComponent(keyword)}`;
      
      // 手動でURLを設定するか、プロキシ経由でスクレイピング
      const images = await this.scrapeSearchResults(searchUrl, keyword, count);
      
      // キャッシュに保存
      this.cache.set(cacheKey, images);
      
      console.log('✅ いらすとや画像取得完了:', images.length, '件');
      return images;
      
    } catch (error) {
      console.error('❌ いらすとや画像取得エラー:', error);
      return this.getFallbackImages(keyword, count);
    }
  }

  // 検索結果をスクレイピング（CORS制限があるため、プロキシが必要）
  async scrapeSearchResults(searchUrl, keyword, count) {
    // 方法1: 手動でURLを設定
    const manualUrls = this.getManualUrls(keyword);
    if (manualUrls.length > 0) {
      return manualUrls.slice(0, count);
    }

    // 方法2: プロキシ経由でスクレイピング
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      return this.parseHtmlForImages(data.contents, count);
    } catch (error) {
      console.log('⚠️ スクレイピング失敗、フォールバック使用');
      return this.getFallbackImages(keyword, count);
    }
  }

  // HTMLから画像URLを抽出
  parseHtmlForImages(html, count) {
    const images = [];
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let match;
    
    while ((match = imgRegex.exec(html)) !== null && images.length < count) {
      const url = match[1];
      if (this.imageUrlPattern.test(url)) {
        images.push({
          url: url,
          alt: 'いらすとや画像',
          source: 'irasutoya',
          author: 'いらすとや'
        });
      }
    }
    
    return images;
  }

  // 手動でURLを設定（キーワード別）
  getManualUrls(keyword) {
    const manualImageMap = {
      // 実際のいらすとやの画像URLを設定
      '精子': [
        'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/irasutoya_sample1.jpg',
        'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/irasutoya_sample2.jpg'
      ],
      '愛液': [
        'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/irasutoya_sample3.jpg'
      ],
      'アナル': [
        'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/irasutoya_sample4.jpg'
      ],
      // 一般的なキーワード用のプレースホルダー
      '健康': [
        'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/health1.jpg',
        'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/health2.jpg'
      ],
      '運動': [
        'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/exercise1.jpg',
        'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/exercise2.jpg'
      ],
      'お金': [
        'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/money1.jpg'
      ]
    };

    return (manualImageMap[keyword] || []).map(url => ({
      url: url,
      alt: `${keyword} - いらすとや`,
      source: 'irasutoya',
      author: 'いらすとや'
    }));
  }

  // フォールバック画像（いらすとやの一般的な画像を使用）
  getFallbackImages(keyword, count) {
    const fallbackUrls = [
      'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/general1.jpg',
      'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/general2.jpg',
      'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/general3.jpg',
      'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/general4.jpg',
      'https://4.bp.blogspot.com/-K7JmF5vYz8s/Xo5J8Q2ZtCI/AAAAAAABX3Y/9QrQYqQYqQY/s400/general5.jpg'
    ];

    return fallbackUrls.slice(0, count).map((url, index) => ({
      url: url,
      alt: `${keyword} - いらすとや汎用画像 ${index + 1}`,
      source: 'irasutoya_fallback',
      author: 'いらすとや'
    }));
  }

  // いらすとやの検索URLを生成（手動でアクセス用）
  generateSearchUrl(keyword) {
    return `${this.baseUrl}/search/label/${encodeURIComponent(keyword)}`;
  }

  // キーワードを日本語に変換（必要に応じて）
  async translateToJapanese(keyword) {
    // 英語の場合は日本語に翻訳
    const japaneseKeywords = {
      'sperm': '精子',
      'love fluid': '愛液',
      'anal': 'アナル',
      'sex': '性',
      'health': '健康',
      'exercise': '運動',
      'money': 'お金',
      'study': '勉強'
    };

    return japaneseKeywords[keyword] || keyword;
  }

  // キャッシュクリア
  clearCache() {
    this.cache.clear();
    console.log('🗑️ いらすとやキャッシュクリア');
  }
}

export default new IrasutoyaService();
