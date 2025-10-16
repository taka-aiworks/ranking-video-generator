// src/services/media/irasutoyaService.js
// いらすとや画像取得サービス

class IrasutoyaService {
  constructor() {
    this.cache = new Map();
    this.baseUrl = 'https://www.irasutoya.com';
    
    // いらすとやの画像URLパターン（より広範囲にマッチ）
    this.imageUrlPattern = /https:\/\/[0-9]+\.bp\.blogspot\.com\/[^\/]+\/[^\/]+\/s\d+-[^\.]+\.(jpg|png|gif)/;
    
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
      console.log(`✅ 手動設定画像を使用: ${keyword} (${manualUrls.length}件)`);
      return manualUrls.slice(0, count);
    }

    // 方法2: プロキシ経由でスクレイピング
    try {
      console.log(`🔍 プロキシ経由でスクレイピング開始: ${searchUrl}`);
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      const scrapedImages = this.parseHtmlForImages(data.contents, count);
      if (scrapedImages.length > 0) {
        console.log(`✅ スクレイピング成功: ${scrapedImages.length}件`);
        return scrapedImages;
      }
    } catch (error) {
      console.log('⚠️ スクレイピング失敗:', error.message);
    }

    // 方法3: フォールバック画像を使用
    console.log(`📋 フォールバック画像を使用: ${keyword}`);
    return this.getFallbackImages(keyword, count);
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
      // 実際のいらすとやの画像URLを設定（例：副業関連）
      '副業': [
        'https://1.bp.blogspot.com/-example1/s0-d/part_time_job1.jpg',
        'https://2.bp.blogspot.com/-example2/s0-d/part_time_job2.jpg'
      ],
      'お金': [
        'https://3.bp.blogspot.com/-example3/s0-d/money1.jpg',
        'https://4.bp.blogspot.com/-example4/s0-d/money2.jpg'
      ],
      '稼ぐ': [
        'https://1.bp.blogspot.com/-example5/s0-d/earn_money1.jpg'
      ],
      '投資': [
        'https://2.bp.blogspot.com/-example6/s0-d/investment1.jpg',
        'https://3.bp.blogspot.com/-example7/s0-d/investment2.jpg'
      ],
      '貯金': [
        'https://4.bp.blogspot.com/-example8/s0-d/savings1.jpg'
      ],
      '健康': [
        'https://1.bp.blogspot.com/-example9/s0-d/health1.jpg',
        'https://2.bp.blogspot.com/-example10/s0-d/health2.jpg'
      ],
      '運動': [
        'https://3.bp.blogspot.com/-example11/s0-d/exercise1.jpg',
        'https://4.bp.blogspot.com/-example12/s0-d/exercise2.jpg'
      ],
      '勉強': [
        'https://1.bp.blogspot.com/-example13/s0-d/study1.jpg'
      ],
      '仕事': [
        'https://2.bp.blogspot.com/-example14/s0-d/work1.jpg',
        'https://3.bp.blogspot.com/-example15/s0-d/work2.jpg'
      ],
      'ビジネス': [
        'https://4.bp.blogspot.com/-example16/s0-d/business1.jpg'
      ]
    };

    return (manualImageMap[keyword] || []).map(url => ({
      url: url,
      alt: `${keyword} - いらすとや`,
      source: 'irasutoya',
      author: 'いらすとや'
    }));
  }

  // 全キーワード用の汎用画像一覧を取得
  getAllAvailableImages(keyword, count = 20) {
    const allImages = [];
    
    // キーワード固有の画像
    const specificImages = this.getManualUrls(keyword);
    allImages.push(...specificImages);
    
    // 汎用画像を追加（実際のいらすとや画像URLに置き換え）
    const generalImages = [
      'https://1.bp.blogspot.com/-example1/s0-d/general1.jpg',
      'https://2.bp.blogspot.com/-example2/s0-d/general2.jpg',
      'https://3.bp.blogspot.com/-example3/s0-d/general3.jpg',
      'https://4.bp.blogspot.com/-example4/s0-d/general4.jpg',
      'https://5.bp.blogspot.com/-example5/s0-d/general5.jpg'
    ];

    generalImages.forEach((url, index) => {
      allImages.push({
        url: url,
        alt: `${keyword} - 汎用画像 ${index + 1}`,
        source: 'irasutoya_general',
        author: 'いらすとや'
      });
    });

    return allImages.slice(0, count);
  }

  // フォールバック画像（SVGベースのプレースホルダー）
  getFallbackImages(keyword, count) {
    const fallbackUrls = [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0ZGRkZGRiIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSIyODAiIGZpbGw9IiNGMEYwRjAiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7nlKjmiLfliLDvvIzmnKznm7TmlrnvvIzlm77niYc8L3RleHQ+PC9zdmc+',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0ZGRkZGRiIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSIyODAiIGZpbGw9IiNFMEY0RkYiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7nlKjmiLfliLDvvIzmnKznm7TmlrnvvIzlm77niYc8L3RleHQ+PC9zdmc+',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0ZGRkZGRiIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSIyODAiIGZpbGw9IiNGRkVFRUQiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7nlKjmiLfliLDvvIzmnKznm7TmlrnvvIzlm77niYc8L3RleHQ+PC9zdmc+',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0ZGRkZGRiIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSIyODAiIGZpbGw9IiNFREZGRUQiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7nlKjmiLfliLDvvIzmnKznm7TmlrnvvIzlm77niYc8L3RleHQ+PC9zdmc+',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0ZGRkZGRiIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSIyODAiIGZpbGw9IiNGRkZGRUQiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7nlKjmiLfliLDvvIzmnKznm7TmlrnvvIzlm77niYc8L3RleHQ+PC9zdmc+'
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
    return `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}`;
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
