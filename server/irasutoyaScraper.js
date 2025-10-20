// server/irasutoyaScraper.js
// いらすとやの画像をスクレイピングしてローカルに保存する機能

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IrasutoyaScraper {
  constructor() {
    this.baseUrl = 'https://www.irasutoya.com';
    this.localImageDir = path.join(__dirname, '../public/images/irasutoya');
    this.metadataFile = path.join(__dirname, '../public/images/irasutoya/metadata.json');
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    console.log('🎨 いらすとやスクレイパー初期化');
  }

  // 初期化（ディレクトリ作成など）
  async initialize() {
    try {
      await fs.mkdir(this.localImageDir, { recursive: true });
      console.log('✅ ローカル画像ディレクトリ作成完了');
    } catch (error) {
      console.error('❌ ディレクトリ作成エラー:', error);
    }
  }

  // メタデータを読み込み
  async loadMetadata() {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.log('📝 メタデータファイルが存在しません。新規作成します。');
      return { images: [], lastUpdated: null };
    }
  }

  // メタデータを保存
  async saveMetadata(metadata) {
    try {
      await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
      console.log('💾 メタデータ保存完了');
    } catch (error) {
      console.error('❌ メタデータ保存エラー:', error);
    }
  }

  // カテゴリ別のURL一覧を取得
  getCategoryUrls() {
    return [
      { name: '職業', url: '/search/label/職業' },
      { name: 'お金', url: '/search/label/お金' },
      { name: '健康', url: '/search/label/健康' },
      { name: '運動', url: '/search/label/運動' },
      { name: '勉強', url: '/search/label/勉強' },
      { name: '仕事', url: '/search/label/仕事' },
      { name: '恋愛', url: '/search/label/恋愛' },
      { name: '家族', url: '/search/label/家族' },
      { name: '食べ物', url: '/search/label/食べ物' },
      { name: '動物', url: '/search/label/動物' },
      { name: '季節', url: '/search/label/季節' },
      { name: '行事', url: '/search/label/行事' }
    ];
  }

  // ページから画像リンクを抽出
  async extractImageLinks(categoryUrl, maxPages = 5) {
    const imageLinks = [];
    let currentUrl = this.baseUrl + categoryUrl;
    
    console.log(`🔍 カテゴリスクレイピング開始: ${categoryUrl}`);

    for (let page = 1; page <= maxPages; page++) {
      try {
        console.log(`📄 ページ ${page} を処理中: ${currentUrl}`);
        
        const response = await axios.get(currentUrl, {
          headers: { 'User-Agent': this.userAgent },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        
        // 画像ページのリンクを抽出
        $('a[href*="blog-post"]').each((i, element) => {
          const href = $(element).attr('href');
          if (href && !imageLinks.includes(href)) {
            imageLinks.push(href);
          }
        });

        // 次のページのURLを取得
        const nextPageLink = $('a[href*="max-results=20&start="]').first().attr('href');
        if (nextPageLink) {
          currentUrl = nextPageLink.startsWith('http') ? nextPageLink : this.baseUrl + nextPageLink;
        } else {
          break; // 次のページがない場合は終了
        }

        // レート制限を避けるため少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ ページ ${page} の処理エラー:`, error.message);
        break;
      }
    }

    console.log(`✅ ${imageLinks.length}件の画像ページリンクを取得`);
    return imageLinks;
  }

  // 画像ページから実際の画像URLを取得
  async extractImageFromPage(pageUrl) {
    try {
      const response = await axios.get(pageUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // 画像のURLとタイトルを取得
      const imageElement = $('.separator a').first();
      const imageUrl = imageElement.attr('href');
      
      // より正確なタイトル取得
      let title = '';
      
      // 1. 投稿タイトルを試す
      title = $('h1.post-title').text() || 
              $('.post-title').text() || 
              $('h1').text() ||
              $('.entry-title').text();
      
      // 2. まだ取得できない場合は、URLから推測
      if (!title || title.trim() === '' || title.includes('かわいいフリー素材集')) {
        const urlMatch = pageUrl.match(/blog-post-(\d+)\.html/);
        if (urlMatch) {
          title = `いらすとや画像_${urlMatch[1]}`;
        } else {
          title = 'いらすとや画像';
        }
      }
      
      // 3. タイトルをクリーンアップ
      title = title.trim()
        .replace(/^かわいいフリー素材集/, '')
        .replace(/^いらすとや/, '')
        .trim() || 'いらすとや画像';

      if (imageUrl) {
        return {
          url: imageUrl,
          title: title,
          pageUrl: pageUrl
        };
      }
    } catch (error) {
      console.error(`❌ 画像ページ処理エラー (${pageUrl}):`, error.message);
    }
    
    return null;
  }

  // 画像をダウンロードしてローカルに保存
  async downloadImage(imageInfo, categoryName) {
    try {
      const response = await axios.get(imageInfo.url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': this.userAgent },
        timeout: 15000
      });

      // ファイル名を生成（URLから拡張子を取得）
      const urlPath = new URL(imageInfo.url).pathname;
      const extension = path.extname(urlPath) || '.png';
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;
      const filePath = path.join(this.localImageDir, fileName);

      // ファイルを保存
      await fs.writeFile(filePath, response.data);
      
      console.log(`💾 画像保存完了: ${fileName}`);
      
      return {
        localPath: `/images/irasutoya/${fileName}`,
        originalUrl: imageInfo.url,
        title: imageInfo.title,
        category: categoryName,
        downloadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ 画像ダウンロードエラー (${imageInfo.url}):`, error.message);
      return null;
    }
  }

  // カテゴリ全体をスクレイピング
  async scrapeCategory(categoryName, categoryUrl, maxPages = 3) {
    console.log(`🎯 カテゴリ「${categoryName}」のスクレイピング開始`);
    
    // 既存のメタデータを読み込み
    const metadata = await this.loadMetadata();
    const existingUrls = new Set(metadata.images.map(img => img.originalUrl));
    
    // 画像ページリンクを取得
    const imagePageLinks = await this.extractImageLinks(categoryUrl, maxPages);
    
    const newImages = [];
    
    for (const pageUrl of imagePageLinks) {
      try {
        // 画像情報を取得
        const imageInfo = await this.extractImageFromPage(pageUrl);
        
        if (imageInfo && !existingUrls.has(imageInfo.url)) {
          // 画像をダウンロード
          const localImage = await this.downloadImage(imageInfo, categoryName);
          
          if (localImage) {
            newImages.push(localImage);
            metadata.images.push(localImage);
          }
          
          // レート制限を避けるため待機
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ 画像処理エラー:`, error.message);
      }
    }
    
    // メタデータを更新
    metadata.lastUpdated = new Date().toISOString();
    await this.saveMetadata(metadata);
    
    console.log(`✅ カテゴリ「${categoryName}」完了: ${newImages.length}件の新しい画像を取得`);
    return newImages;
  }

  // 全カテゴリをスクレイピング
  async scrapeAllCategories() {
    console.log('🚀 いらすとや全カテゴリスレイピング開始');
    
    await this.initialize();
    const categories = this.getCategoryUrls();
    const results = [];
    
    for (const category of categories) {
      try {
        const newImages = await this.scrapeCategory(category.name, category.url, 2);
        results.push({ category: category.name, count: newImages.length });
        
        // カテゴリ間で少し待機
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`❌ カテゴリ「${category.name}」エラー:`, error.message);
      }
    }
    
    console.log('🎉 全カテゴリスレイピング完了');
    return results;
  }

  // キーワード検索で画像を取得（重複除去）
  async searchImages(keyword, maxResults = 20) {
    const metadata = await this.loadMetadata();
    
    // キーワードでフィルタリング
    const filteredImages = metadata.images.filter(img => 
      img.title.toLowerCase().includes(keyword.toLowerCase()) ||
      img.category.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // 重複を除去
    const uniqueImages = [];
    const seenUrls = new Set();
    
    for (const img of filteredImages) {
      if (!seenUrls.has(img.originalUrl)) {
        seenUrls.add(img.originalUrl);
        uniqueImages.push(img);
      }
    }
    
    return uniqueImages.slice(0, maxResults);
  }

  // メタデータをクリーンアップ（重複除去・タイトル修正）
  async cleanupMetadata() {
    const metadata = await this.loadMetadata();
    const uniqueImages = [];
    const seenUrls = new Set();
    
    console.log(`🧹 メタデータクリーンアップ開始: ${metadata.images.length}件`);
    
    for (const img of metadata.images) {
      if (!seenUrls.has(img.originalUrl)) {
        seenUrls.add(img.originalUrl);
        
        // タイトルを修正
        let cleanTitle = img.title;
        let cleanCategory = img.category;
        
        if (cleanTitle === 'かわいいフリー素材集') {
          // URLから推測
          const urlMatch = img.originalUrl.match(/\/([^\/]+)\.(png|jpg|jpeg|gif)$/i);
          if (urlMatch) {
            const filename = urlMatch[1];
            // ファイル名を日本語に変換
            cleanTitle = this.convertFilenameToTitle(filename);
            // カテゴリも自動判定
            cleanCategory = this.autoDetectCategory(filename);
          } else {
            cleanTitle = 'いらすとや画像';
          }
        }
        
        uniqueImages.push({
          ...img,
          title: cleanTitle,
          category: cleanCategory
        });
      }
    }
    
    // メタデータを更新
    const cleanedMetadata = {
      images: uniqueImages,
      lastUpdated: new Date().toISOString()
    };
    
    await this.saveMetadata(cleanedMetadata);
    console.log(`✅ クリーンアップ完了: ${uniqueImages.length}件（重複除去: ${metadata.images.length - uniqueImages.length}件）`);
    
    return uniqueImages;
  }

  // ファイル名をタイトルに変換
  convertFilenameToTitle(filename) {
    // ファイル名から推測される内容を日本語に変換
    const titleMap = {
      // 政治・職業
      'seiji': '政治',
      'souridaijin': '総理大臣',
      'woman': '女性',
      'man': '男性',
      'kaiken': '会見',
      'businessman': 'ビジネスマン',
      'businesswoman': 'ビジネスウーマン',
      'doctor': '医師',
      'nurse': '看護師',
      'teacher': '教師',
      'student': '学生',
      'police': '警察',
      'firefighter': '消防士',
      'chef': 'シェフ',
      'artist': '芸術家',
      'musician': '音楽家',
      'writer': '作家',
      'photographer': '写真家',
      'designer': 'デザイナー',
      'engineer': 'エンジニア',
      'scientist': '科学者',
      'lawyer': '弁護士',
      'judge': '裁判官',
      'pilot': 'パイロット',
      'sailor': '船員',
      'farmer': '農家',
      'fisherman': '漁師',
      
      // お金・ビジネス
      'money': 'お金',
      'bag': '袋',
      'coin': '硬貨',
      'bank': '銀行',
      'wallet': '財布',
      'credit': 'クレジット',
      'investment': '投資',
      'stock': '株',
      'bitcoin': 'ビットコイン',
      'crypto': '暗号通貨',
      'salary': '給料',
      'profit': '利益',
      'loss': '損失',
      'budget': '予算',
      'expense': '支出',
      'income': '収入',
      'tax': '税金',
      'insurance': '保険',
      
      // 健康・運動
      'health': '健康',
      'exercise': '運動',
      'fitness': 'フィットネス',
      'gym': 'ジム',
      'running': 'ランニング',
      'swimming': '水泳',
      'cycling': 'サイクリング',
      'yoga': 'ヨガ',
      'meditation': '瞑想',
      'sleep': '睡眠',
      'rest': '休息',
      'medicine': '薬',
      'hospital': '病院',
      'clinic': 'クリニック',
      'dentist': '歯医者',
      'pharmacy': '薬局',
      'vaccine': 'ワクチン',
      'checkup': '健康診断',
      
      // 学習・教育
      'study': '勉強',
      'book': '本',
      'education': '教育',
      'school': '学校',
      'university': '大学',
      'library': '図書館',
      'classroom': '教室',
      'homework': '宿題',
      'exam': '試験',
      'graduation': '卒業',
      'research': '研究',
      'science': '科学',
      'math': '数学',
      'english': '英語',
      'history': '歴史',
      'geography': '地理',
      'art': '美術',
      'music': '音楽',
      
      // テクノロジー
      'computer': 'パソコン',
      'phone': '電話',
      'smartphone': 'スマホ',
      'tablet': 'タブレット',
      'laptop': 'ノートPC',
      'internet': 'インターネット',
      'wifi': 'WiFi',
      'app': 'アプリ',
      'software': 'ソフトウェア',
      'programming': 'プログラミング',
      'coding': 'コーディング',
      'robot': 'ロボット',
      'ai': 'AI',
      'vr': 'VR',
      'ar': 'AR',
      'game': 'ゲーム',
      'console': 'ゲーム機',
      
      // 交通・移動
      'car': '車',
      'bus': 'バス',
      'train': '電車',
      'plane': '飛行機',
      'bike': '自転車',
      'motorcycle': 'バイク',
      'taxi': 'タクシー',
      'subway': '地下鉄',
      'ship': '船',
      'helicopter': 'ヘリコプター',
      'travel': '旅行',
      'trip': '旅行',
      'vacation': '休暇',
      'holiday': '休日',
      'passport': 'パスポート',
      'luggage': '荷物',
      'suitcase': 'スーツケース',
      
      // 食べ物・料理
      'food': '食べ物',
      'rice': 'ご飯',
      'bread': 'パン',
      'fruit': '果物',
      'vegetable': '野菜',
      'meat': '肉',
      'fish': '魚',
      'sushi': '寿司',
      'pizza': 'ピザ',
      'pasta': 'パスタ',
      'salad': 'サラダ',
      'soup': 'スープ',
      'cake': 'ケーキ',
      'cookie': 'クッキー',
      'chocolate': 'チョコレート',
      'ice': 'アイス',
      'coffee': 'コーヒー',
      'tea': 'お茶',
      'juice': 'ジュース',
      'beer': 'ビール',
      'wine': 'ワイン',
      'restaurant': 'レストラン',
      'cafe': 'カフェ',
      'bar': 'バー',
      'kitchen': 'キッチン',
      'cooking': '料理',
      'recipe': 'レシピ',
      
      // 家族・人間関係
      'family': '家族',
      'couple': 'カップル',
      'child': '子供',
      'baby': '赤ちゃん',
      'mother': '母親',
      'father': '父親',
      'grandmother': '祖母',
      'grandfather': '祖父',
      'brother': '兄弟',
      'sister': '姉妹',
      'friend': '友人',
      'neighbor': '隣人',
      'colleague': '同僚',
      'boss': '上司',
      'employee': '部下',
      'customer': 'お客様',
      'client': 'クライアント',
      
      // 動物・ペット
      'animal': '動物',
      'dog': '犬',
      'cat': '猫',
      'bird': '鳥',
      'fish': '魚',
      'hamster': 'ハムスター',
      'rabbit': 'うさぎ',
      'horse': '馬',
      'cow': '牛',
      'pig': '豚',
      'chicken': '鶏',
      'elephant': '象',
      'lion': 'ライオン',
      'tiger': 'トラ',
      'bear': '熊',
      'panda': 'パンダ',
      'penguin': 'ペンギン',
      'dolphin': 'イルカ',
      'whale': 'クジラ',
      
      // 季節・自然
      'season': '季節',
      'spring': '春',
      'summer': '夏',
      'autumn': '秋',
      'winter': '冬',
      'flower': '花',
      'tree': '木',
      'mountain': '山',
      'ocean': '海',
      'river': '川',
      'lake': '湖',
      'forest': '森',
      'garden': '庭',
      'park': '公園',
      'beach': 'ビーチ',
      'sky': '空',
      'cloud': '雲',
      'sun': '太陽',
      'moon': '月',
      'star': '星',
      'rain': '雨',
      'snow': '雪',
      'wind': '風',
      'storm': '嵐',
      
      // イベント・行事
      'event': '行事',
      'party': 'パーティー',
      'birthday': '誕生日',
      'christmas': 'クリスマス',
      'newyear': 'お正月',
      'valentine': 'バレンタイン',
      'halloween': 'ハロウィン',
      'wedding': '結婚式',
      'funeral': '葬式',
      'graduation': '卒業式',
      'ceremony': '式典',
      'festival': '祭り',
      'concert': 'コンサート',
      'show': 'ショー',
      'performance': '公演',
      'exhibition': '展示会',
      'meeting': '会議',
      'conference': '会議',
      'seminar': 'セミナー',
      'workshop': 'ワークショップ',
      
      // その他
      'nobg': '背景なし',
      'sangyou': '産業',
      'juui': '獣医',
      'home': '家',
      'house': '家',
      'building': '建物',
      'office': 'オフィス',
      'shop': '店',
      'store': '店',
      'market': '市場',
      'shopping': 'ショッピング',
      'buy': '買う',
      'sell': '売る',
      'gift': 'プレゼント',
      'present': 'プレゼント',
      'card': 'カード',
      'letter': '手紙',
      'email': 'メール',
      'message': 'メッセージ',
      'call': '電話',
      'video': '動画',
      'photo': '写真',
      'camera': 'カメラ',
      'movie': '映画',
      'tv': 'テレビ',
      'radio': 'ラジオ',
      'newspaper': '新聞',
      'magazine': '雑誌',
      'book': '本',
      'music': '音楽',
      'song': '歌',
      'dance': 'ダンス',
      'sport': 'スポーツ',
      'football': 'サッカー',
      'baseball': '野球',
      'tennis': 'テニス',
      'basketball': 'バスケットボール',
      'volleyball': 'バレーボール',
      'golf': 'ゴルフ',
      'swimming': '水泳',
      'skiing': 'スキー',
      'skating': 'スケート'
    };
    
    // ファイル名を分割してマッピングを適用
    const parts = filename.split('_');
    const translatedParts = parts.map(part => titleMap[part] || part);
    
    // 日本語部分のみを結合
    const japaneseTitle = translatedParts.filter(part => 
      titleMap[part] && titleMap[part] !== part
    ).join('・');
    
    return japaneseTitle || 'いらすとや画像';
  }

  // ファイル名からカテゴリを自動判定
  autoDetectCategory(filename) {
    const categoryMap = {
      // 政治・職業
      '政治': ['seiji', 'souridaijin', 'businessman', 'businesswoman', 'doctor', 'nurse', 'teacher', 'police', 'firefighter', 'chef', 'artist', 'musician', 'writer', 'photographer', 'designer', 'engineer', 'scientist', 'lawyer', 'judge', 'pilot', 'sailor', 'farmer', 'fisherman'],
      
      // お金・ビジネス
      'お金': ['money', 'coin', 'bank', 'wallet', 'credit', 'investment', 'stock', 'bitcoin', 'crypto', 'salary', 'profit', 'loss', 'budget', 'expense', 'income', 'tax', 'insurance'],
      
      // 健康・運動
      '健康': ['health', 'exercise', 'fitness', 'gym', 'running', 'swimming', 'cycling', 'yoga', 'meditation', 'sleep', 'rest', 'medicine', 'hospital', 'clinic', 'dentist', 'pharmacy', 'vaccine', 'checkup'],
      
      // 学習・教育
      '勉強': ['study', 'book', 'education', 'school', 'university', 'library', 'classroom', 'homework', 'exam', 'graduation', 'research', 'science', 'math', 'english', 'history', 'geography', 'art', 'music'],
      
      // テクノロジー
      'テクノロジー': ['computer', 'phone', 'smartphone', 'tablet', 'laptop', 'internet', 'wifi', 'app', 'software', 'programming', 'coding', 'robot', 'ai', 'vr', 'ar', 'game', 'console'],
      
      // 交通・移動
      '交通': ['car', 'bus', 'train', 'plane', 'bike', 'motorcycle', 'taxi', 'subway', 'ship', 'helicopter', 'travel', 'trip', 'vacation', 'holiday', 'passport', 'luggage', 'suitcase'],
      
      // 食べ物・料理
      '食べ物': ['food', 'rice', 'bread', 'fruit', 'vegetable', 'meat', 'fish', 'sushi', 'pizza', 'pasta', 'salad', 'soup', 'cake', 'cookie', 'chocolate', 'ice', 'coffee', 'tea', 'juice', 'beer', 'wine', 'restaurant', 'cafe', 'bar', 'kitchen', 'cooking', 'recipe'],
      
      // 家族・人間関係
      '家族': ['family', 'couple', 'child', 'baby', 'mother', 'father', 'grandmother', 'grandfather', 'brother', 'sister', 'friend', 'neighbor', 'colleague', 'boss', 'employee', 'customer', 'client'],
      
      // 動物・ペット
      '動物': ['animal', 'dog', 'cat', 'bird', 'fish', 'hamster', 'rabbit', 'horse', 'cow', 'pig', 'chicken', 'elephant', 'lion', 'tiger', 'bear', 'panda', 'penguin', 'dolphin', 'whale'],
      
      // 季節・自然
      '自然': ['season', 'spring', 'summer', 'autumn', 'winter', 'flower', 'tree', 'mountain', 'ocean', 'river', 'lake', 'forest', 'garden', 'park', 'beach', 'sky', 'cloud', 'sun', 'moon', 'star', 'rain', 'snow', 'wind', 'storm'],
      
      // イベント・行事
      'イベント': ['event', 'party', 'birthday', 'christmas', 'newyear', 'valentine', 'halloween', 'wedding', 'funeral', 'graduation', 'ceremony', 'festival', 'concert', 'show', 'performance', 'exhibition', 'meeting', 'conference', 'seminar', 'workshop'],
      
      // スポーツ
      'スポーツ': ['sport', 'football', 'baseball', 'tennis', 'basketball', 'volleyball', 'golf', 'swimming', 'skiing', 'skating', 'exercise', 'fitness', 'gym', 'running', 'cycling', 'yoga'],
      
      // 恋愛
      '恋愛': ['couple', 'love', 'heart', 'romance', 'date', 'kiss', 'hug', 'marriage', 'wedding', 'valentine', 'present', 'gift', 'flower', 'chocolate'],
      
      // その他
      'その他': ['home', 'house', 'building', 'office', 'shop', 'store', 'market', 'shopping', 'buy', 'sell', 'gift', 'present', 'card', 'letter', 'email', 'message', 'call', 'video', 'photo', 'camera', 'movie', 'tv', 'radio', 'newspaper', 'magazine', 'book', 'music', 'song', 'dance']
    };
    
    const parts = filename.toLowerCase().split('_');
    
    // 各カテゴリのキーワードとマッチング
    for (const [category, keywords] of Object.entries(categoryMap)) {
      for (const part of parts) {
        if (keywords.includes(part)) {
          return category;
        }
      }
    }
    
    return 'その他';
  }

  // 全画像を取得（重複除去）
  async getAllImages() {
    const metadata = await this.loadMetadata();
    const uniqueImages = [];
    const seenUrls = new Set();
    
    for (const img of metadata.images) {
      if (!seenUrls.has(img.originalUrl)) {
        seenUrls.add(img.originalUrl);
        uniqueImages.push(img);
      }
    }
    
    return uniqueImages;
  }
}

export default IrasutoyaScraper;
