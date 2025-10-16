// src/services/media/irasutoyaService.js
// いらすとや画像取得サービス（直接URL指定方式）

class IrasutoyaService {
  constructor() {
    console.log('🎨 いらすとやサービス初期化完了');
  }

  // キーワードからいらすとやの画像URLを取得
  async fetchImages(keyword, count = 15) {
    console.log('🔍 いらすとや画像取得:', keyword);
    
    // キーワードに基づいて適切なカテゴリの画像を返す
    const images = this.getImagesByCategory(keyword, count);
    
    console.log(`✅ ${images.length}件の画像を取得`);
    return images;
  }

  // カテゴリごとの画像マッピング
  getImagesByCategory(keyword, count) {
    // キーワードを正規化
    const normalizedKeyword = keyword.toLowerCase();
    
    // カテゴリマッチング
    let categoryImages = [];
    
    // お金・副業関連
    if (this.matchKeywords(normalizedKeyword, ['副業', 'お金', '収入', '投資', '貯金', '給料', '報酬'])) {
      categoryImages = this.getMoneyImages();
    }
    // 健康・運動関連
    else if (this.matchKeywords(normalizedKeyword, ['健康', '運動', '筋トレ', 'ダイエット', '体', '身体'])) {
      categoryImages = this.getHealthImages();
    }
    // 性・恋愛関連
    else if (this.matchKeywords(normalizedKeyword, ['女', '男', '性', '恋愛', 'セックス', '精子', '愛液'])) {
      categoryImages = this.getSexImages();
    }
    // 勉強・学習関連
    else if (this.matchKeywords(normalizedKeyword, ['勉強', '学習', '受験', '英語', '資格'])) {
      categoryImages = this.getStudyImages();
    }
    // 仕事関連
    else if (this.matchKeywords(normalizedKeyword, ['仕事', '会社', 'ビジネス', '起業', '経営'])) {
      categoryImages = this.getWorkImages();
    }
    // デフォルト（一般的な画像）
    else {
      categoryImages = this.getGeneralImages();
    }
    
    // 必要な数だけ返す（足りない場合は繰り返す）
    const result = [];
    while (result.length < count) {
      result.push(...categoryImages);
    }
    
    return result.slice(0, count);
  }

  // キーワードマッチング補助関数
  matchKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  // === カテゴリ別画像URL ===

  getMoneyImages() {
    return [
      { url: 'https://4.bp.blogspot.com/-v-RWg3vJtDY/VvKZKMuZhzI/AAAAAAAA4wo/p4rdQ2bhr6QPnZu3fLX-uJYbUike3qj6Q/s800/money_bag_yen.png', alt: 'お金の袋', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://2.bp.blogspot.com/-hIJJqIXm2Z8/Ur6bZBFq7PI/AAAAAAAAcEQ/FkZYd-UEmGk/s800/money_fly_yen.png', alt: '飛んでいくお金', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://4.bp.blogspot.com/-yH-9eNUoj4s/VvKZJ2_hkgI/AAAAAAAA4wQ/DqY9_CSQA7Uxhg8wKdXH8rlwbGOZQrmzw/s800/money_chokinbako.png', alt: '貯金箱', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://1.bp.blogspot.com/-SuzCel0gYp4/UgmwCNyJs4I/AAAAAAAAW2Y/ePSp62hO6jk/s800/money_tsuchou_happy.png', alt: '通帳を見て喜ぶ人', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://4.bp.blogspot.com/-hEX2JNMJ-3Q/VvKZKpjxZwI/AAAAAAAA4ww/pNjVU_Ht4bcjPUqgN3Gp3JKQZ-_-z_QXA/s800/money_coincase.png', alt: '小銭入れ', source: 'irasutoya', author: 'いらすとや' }
    ];
  }

  getHealthImages() {
    return [
      { url: 'https://4.bp.blogspot.com/-Sw3qWJ4kJ7Y/UZNyN8F6b5I/AAAAAAAASss/5Hk50C2kR1Y/s800/sports_running_woman.png', alt: 'ランニングする女性', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://1.bp.blogspot.com/-_T2gOzWdU_s/VGDaRHdHBaI/AAAAAAAAo4Q/jL7OnVsJY6g/s800/kinniku_ude.png', alt: '力こぶ', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://2.bp.blogspot.com/-T2Vk6e3K6VY/UZ5a4RKtDzI/AAAAAAAATsA/zJPBR2vp9fw/s800/sports_gym_training.png', alt: 'ジムでトレーニング', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://4.bp.blogspot.com/-5IuGmNe_9ng/UnymoqxZBXI/AAAAAAAAbKs/94k9hjVqOzU/s800/food_eiyou3_tanpakushitsu.png', alt: 'タンパク質', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://1.bp.blogspot.com/-v1dYqqTXQW4/Ua3FHFAkfUI/AAAAAAAAUlk/39CG3bMPb5Q/s800/sleep_man.png', alt: '眠る男性', source: 'irasutoya', author: 'いらすとや' }
    ];
  }

  getSexImages() {
    return [
      { url: 'https://4.bp.blogspot.com/-D4gu4gfPJv8/Ur0w27ipFnI/AAAAAAAAb2I/nqwxuXAwMTU/s400/couple_date.png', alt: 'カップル', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://1.bp.blogspot.com/-llSwHKfi7_o/VCEhrfHYKNI/AAAAAAAAmIk/aVXm2V-R-iw/s400/couple_okoru_woman.png', alt: '怒る女性', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://4.bp.blogspot.com/-Sw3qWJ4kJ7Y/UZNyN8F6b5I/AAAAAAAASss/5Hk50C2kR1Y/s400/sports_running_woman.png', alt: '走る女性', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://3.bp.blogspot.com/-bSGAL2jBRdM/UZNyMvMOz8I/AAAAAAAASsM/_Fb9VSsY7e4/s400/sports_running_man.png', alt: '走る男性', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://2.bp.blogspot.com/-4ZGkHPDq3hw/U0fVIL5MwaI/AAAAAAAAe5M/GqS5G8UHqNE/s400/test_print_happy_boy.png', alt: '喜ぶ少年', source: 'いらすとや', author: 'いらすとや' }
    ];
  }

  getStudyImages() {
    return [
      { url: 'https://1.bp.blogspot.com/-FMGq87WBCzw/UZkb0aj3eZI/AAAAAAAATFQ/CsuiIVl6tDA/s800/study_daigakusei_man.png', alt: '勉強する大学生', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://4.bp.blogspot.com/-7H4eF2UPeN8/VYbXWT8YCOI/AAAAAAAAutE/EWYmg7RgDpM/s800/book_tate.png', alt: '本', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://1.bp.blogspot.com/-pSZ0BmRgDAI/WRILRIjJ-rI/AAAAAAABEOg/5TDGOCUmPnoNj1qjS9K4WoL6V8lU1pqrwCLcB/s800/english_kaiwa_bad_man.png', alt: '英語が苦手な人', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://2.bp.blogspot.com/-4ZGkHPDq3hw/U0fVIL5MwaI/AAAAAAAAe5M/GqS5G8UHqNE/s800/test_print_happy_boy.png', alt: 'テストで良い点', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://3.bp.blogspot.com/-yPTbPMvqyD8/VCXhIbX15ZI/AAAAAAAAnYM/mP5EItYPgL0/s800/study_night_girl.png', alt: '夜勉強する女子', source: 'irasutoya', author: 'いらすとや' }
    ];
  }

  getWorkImages() {
    return [
      { url: 'https://4.bp.blogspot.com/-XFrFwEjLLE4/UZnBNJRL5cI/AAAAAAAATTI/RUEZn6zj4P0/s800/BusinessMan1_banzai.png', alt: 'ビジネスマン', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://2.bp.blogspot.com/-P5IAYbBZHZc/Uat4HvP5OzI/AAAAAAAAXQs/MQ0eTj2YkVM/s800/kaigi_shiryou_happy.png', alt: '会議資料', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://1.bp.blogspot.com/-x1gEhfJIaEo/UO9kWXrGOaI/AAAAAAAAKdk/O-AeRHqQ7GA/s800/computer_businessman.png', alt: 'パソコン作業', source: 'いらすとや', author: 'いらすとや' },
      { url: 'https://4.bp.blogspot.com/-KtP25PGTIzI/V9vSeZT6_vI/AAAAAAAA9kQ/8wYdg_MfYKgGR9nEP2g7C8ZLqz0bPtBpgCLcB/s800/building_gyousei_text08_kigyou.png', alt: '企業ビル', source: 'いらすとや', author: 'いらすとや' },
      { url: 'https://2.bp.blogspot.com/-3KdCp2Xt00U/WnRUwH7M7PI/AAAAAAABJ54/6eGRO2bLVBIGvLcX6JCZBPzK3Qd7KnYdACLcBGAs/s800/job_shigoto_jinzai_katsuyou.png', alt: '人材活用', source: 'いらすとや', author: 'いらすとや' }
    ];
  }

  getGeneralImages() {
    return [
      { url: 'https://4.bp.blogspot.com/-wDZMmXfON3M/Vub8HwMy14I/AAAAAAAA4r8/KH7OoG7M95U8bpfM4dWNjlAqKzULxPxXw/s800/text_happy.png', alt: 'ハッピー', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://1.bp.blogspot.com/-5UX0TE8uLbE/WUdZKxvY98I/AAAAAAABE5Q/vIlXGVBpLOUq6dYe1YXr3JT2qKuHvDzfwCLcBGAs/s800/text_arigatou.png', alt: 'ありがとう', source: 'irasutoya', author: 'いらすとや' },
      { url: 'https://2.bp.blogspot.com/-6gO7vCgbN0U/U0fVGNLYCMI/AAAAAAAAe4Y/H2JNiaNLFjQ/s800/good_man.png', alt: 'グッドサイン', source: 'いらすとや', author: 'いらすとや' },
      { url: 'https://3.bp.blogspot.com/-52eFh1ycAXU/U5G0Gp1mYpI/AAAAAAAAg7w/B9H8yR3cUDk/s800/character_gorilla_hardboiled.png', alt: 'ゴリラ', source: 'いらすとや', author: 'いらすとや' },
      { url: 'https://1.bp.blogspot.com/-kBmvRuN0RAU/VzHBVjT1vWI/AAAAAAAA6bE/UYTS92AyLq0Q_7VYnlhBYxHMdZO-_7lvgCLcB/s800/internet_kanki_man.png', alt: '喜ぶ人', source: 'いらすとや', author: 'いらすとや' }
    ];
  }

  // 検索URL生成（デバッグ用）
  generateSearchUrl(keyword) {
    return `https://www.irasutoya.com/search?q=${encodeURIComponent(keyword)}`;
  }
}

// シングルトンインスタンスをエクスポート
const irasutoyaService = new IrasutoyaService();
export default irasutoyaService;
