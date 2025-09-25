// src/services/generators/contentAnalyzer.js - 汎用動画時間計算

class UniversalContentAnalyzer {
  constructor() {
    this.minDurations = {
      short: 15,
      medium: 30,
      auto: 15
    };
    
    this.maxDurations = {
      short: 60,
      medium: 480,
      auto: 60 // 自動判断時はショート寄り
    };
  }

  // メイン計算関数（汎用版）
  calculateOptimalDuration(keyword, template, format) {
    console.log('⏰ 汎用動画時間計算開始:', { keyword, template, format });
    
    // 基準時間の計算
    const baseDuration = this.getUniversalBaseDuration(keyword, format);
    
    // キーワード複雑度による調整
    const keywordAdjustment = this.analyzeKeywordComplexity(keyword);
    
    // フォーマット調整
    const formatAdjustment = this.getFormatAdjustment(format);
    
    // 最終計算
    const calculatedDuration = Math.round(
      baseDuration + keywordAdjustment + formatAdjustment
    );
    
    // 制限内に収める
    const finalDuration = this.enforceLimits(calculatedDuration, format);
    
    console.log(`✅ 汎用時間計算完了: ${finalDuration}秒 (基準:${baseDuration}s + キーワード:${keywordAdjustment}s + フォーマット:${formatAdjustment}s)`);
    
    return finalDuration;
  }

  // 汎用基準時間設定
  getUniversalBaseDuration(keyword, format) {
    // キーワードの種類を分析
    const keywordType = this.analyzeKeywordType(keyword);
    
    const baseTimes = {
      short: {
        ranking: 25,      // ランキング系
        comparison: 30,   // 比較系
        howto: 35,        // やり方系
        review: 28,       // レビュー系
        explanation: 22,  // 解説系
        list: 20          // リスト系
      },
      medium: {
        ranking: 90,
        comparison: 120,
        howto: 180,
        review: 100,
        explanation: 80,
        list: 70
      },
      auto: {
        ranking: 25,
        comparison: 30,
        howto: 35,
        review: 28,
        explanation: 22,
        list: 20
      }
    };
    
    return baseTimes[format]?.[keywordType] || baseTimes[format]?.explanation || 25;
  }

  // キーワード種類分析
  analyzeKeywordType(keyword) {
    const patterns = {
      ranking: ['おすすめ', 'ランキング', 'TOP', 'ベスト', '選'],
      comparison: ['vs', 'VS', 'どっち', '比較', '違い'],
      howto: ['やり方', '方法', '始め方', 'こと', 'やったほうがいい'],
      review: ['レビュー', '使ってみた', '試してみた', '感想'],
      explanation: ['とは', 'について', '解説', '詳しく'],
      list: ['まとめ', '一覧', 'リスト']
    };
    
    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(k => keyword.includes(k))) {
        console.log(`📋 キーワード種類判定: ${type}`);
        return type;
      }
    }
    
    console.log('📋 キーワード種類判定: explanation (デフォルト)');
    return 'explanation';
  }

  // キーワード複雑度分析（既存）
  analyzeKeywordComplexity(keyword) {
    console.log('🔍 キーワード複雑度分析:', keyword);
    
    const keywordLength = keyword.length;
    const hasSpaces = keyword.includes(' ');
    const hasNumbers = /\d/.test(keyword);
    const isSpecific = this.isSpecificKeyword(keyword);
    
    let adjustment = 0;
    
    // 文字数による調整
    if (keywordLength > 10) adjustment += 3;
    if (keywordLength > 20) adjustment += 3;
    
    // 複合キーワード
    if (hasSpaces) adjustment += 5;
    
    // 数値が含まれる
    if (hasNumbers) adjustment += 2;
    
    // 専門的なキーワード
    if (isSpecific) adjustment += 3;
    
    return Math.min(adjustment, 15);
  }

  // 専門キーワード判定（拡張版）
  isSpecificKeyword(keyword) {
    const specificCategories = [
      // 技術系
      'iPhone', 'iPad', 'MacBook', 'Android', 'Windows',
      'プログラミング', 'AI', '機械学習',
      
      // 商品系
      'ワイヤレスイヤホン', 'スマートウォッチ', 'ノートPC',
      '掃除機', '炊飯器', 'エアコン',
      
      // 美容・健康
      '美容液', 'クリーム', 'サプリメント', 'プロテイン',
      '化粧水', 'ファンデーション',
      
      // ライフスタイル
      '投資', '副業', '転職', '節約', '子育て',
      '筋トレ', 'ダイエット', '料理',
      
      // エンタメ
      '映画', 'アニメ', 'ゲーム', 'マンガ'
    ];
    
    return specificCategories.some(term => 
      keyword.toLowerCase().includes(term.toLowerCase())
    );
  }

  // フォーマット調整
  getFormatAdjustment(format) {
    const adjustments = {
      short: 0,     // ショートは基準通り
      medium: 15,   // ミディアムは少し長め
      auto: 0       // 自動判断は基準通り
    };
    
    return adjustments[format] || 0;
  }

  // 制限適用
  enforceLimits(duration, format) {
    const min = this.minDurations[format];
    const max = this.maxDurations[format];
    
    if (duration < min) {
      console.warn(`⚠️ 計算時間${duration}秒が最小値${min}秒を下回るため調整`);
      return min;
    }
    
    if (duration > max) {
      console.warn(`⚠️ 計算時間${duration}秒が最大値${max}秒を上回るため調整`);
      return max;
    }
    
    return duration;
  }

  // フォーマット推奨時間
  getRecommendedDurations(format) {
    const recommendations = {
      short: {
        min: 15,
        optimal: 25,
        max: 60,
        description: 'TikTok・YouTube Shorts最適化'
      },
      medium: {
        min: 60,
        optimal: 120,
        max: 480,
        description: 'YouTube通常動画・収益化対応'
      },
      auto: {
        min: 15,
        optimal: 30,
        max: 60,
        description: 'AI自動判断・最適化'
      }
    };
    
    return recommendations[format] || recommendations.auto;
  }
}

const universalContentAnalyzer = new UniversalContentAnalyzer();
export default universalContentAnalyzer;