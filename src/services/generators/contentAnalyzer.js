// src/services/generators/contentAnalyzer.js - 動画時間自動計算システム

class ContentAnalyzer {
  constructor() {
    this.minDurations = {
      short: 15,   // ショート動画最低15秒
      medium: 20,  // ミディアム動画最低20秒
      hybrid: 15   // ハイブリッドは短い方に合わせる
    };
    
    this.maxDurations = {
      short: 60,   // ショート動画最大60秒
      medium: 480, // ミディアム動画最大8分
      hybrid: 30   // ハイブリッドは適度な長さ
    };
  }

  // メイン計算関数
  calculateOptimalDuration(keyword, template, format) {
    console.log('⏰ 動画時間計算開始:', { keyword, template, format });
    
    // 基準時間の計算
    const baseDuration = this.getBaseDuration(template, format);
    
    // キーワード複雑度による調整
    const keywordAdjustment = this.analyzeKeywordComplexity(keyword);
    
    // テンプレート特有の調整
    const templateAdjustment = this.getTemplateAdjustment(template, format);
    
    // 最終計算
    const calculatedDuration = Math.round(
      baseDuration + keywordAdjustment + templateAdjustment
    );
    
    // 制限内に収める
    const finalDuration = this.enforceLimits(calculatedDuration, format);
    
    console.log(`✅ 動画時間計算完了: ${finalDuration}秒 (基準:${baseDuration}s + キーワード:${keywordAdjustment}s + テンプレート:${templateAdjustment}s)`);
    
    return finalDuration;
  }

  // 基準時間の設定
  getBaseDuration(template, format) {
    const baseTimes = {
      short: {
        ranking: 25,    // ランキングは少し長め
        comparison: 30,  // 比較は詳細が必要
        tutorial: 35,    // チュートリアルは説明が必要
        news: 20        // ニュースは簡潔に
      },
      medium: {
        ranking: 90,    // 1分半でしっかり説明
        comparison: 120, // 2分で詳細比較
        tutorial: 180,   // 3分でステップバイステップ
        news: 60        // 1分でニュース解説
      },
      hybrid: {
        ranking: 25,    // ハイブリッドは短めに
        comparison: 30,
        tutorial: 35,
        news: 20
      }
    };
    
    return baseTimes[format]?.[template] || baseTimes[format]?.ranking || 25;
  }

  // キーワード複雑度分析
  analyzeKeywordComplexity(keyword) {
    console.log('🔍 キーワード複雑度分析:', keyword);
    
    const keywordLength = keyword.length;
    const hasSpaces = keyword.includes(' ');
    const hasNumbers = /\d/.test(keyword);
    const isSpecific = this.isSpecificKeyword(keyword);
    
    let adjustment = 0;
    
    // 文字数による調整
    if (keywordLength > 10) adjustment += 3;
    if (keywordLength > 15) adjustment += 2;
    
    // 複合キーワード
    if (hasSpaces) adjustment += 5;
    
    // 数値が含まれる（型番など）
    if (hasNumbers) adjustment += 2;
    
    // 専門的なキーワード
    if (isSpecific) adjustment += 3;
    
    return Math.min(adjustment, 15); // 最大15秒の調整
  }

  // 専門キーワードの判定
  isSpecificKeyword(keyword) {
    const specificTerms = [
      // 技術系
      'iPhone', 'iPad', 'MacBook', 'Windows', 'Android',
      'ワイヤレスイヤホン', 'スマートウォッチ', 'ノートPC',
      
      // 美容・健康
      '美容液', 'クリーム', 'サプリメント', 'プロテイン',
      
      // 家電
      '掃除機', '炊飯器', '冷蔵庫', 'エアコン', 'テレビ',
      
      // ファッション
      'スニーカー', 'バッグ', '時計', 'アクセサリー'
    ];
    
    return specificTerms.some(term => 
      keyword.toLowerCase().includes(term.toLowerCase())
    );
  }

  // テンプレート別調整
  getTemplateAdjustment(template, format) {
    const adjustments = {
      ranking: {
        short: 0,    // ランキングは基準通り
        medium: 10,  // ミディアムは少し長め
        hybrid: 0
      },
      comparison: {
        short: 5,    // 比較は少し長めが必要
        medium: 20,  // ミディアムはしっかり比較
        hybrid: 5
      },
      tutorial: {
        short: 8,    // チュートリアルは説明が必要
        medium: 30,  // ミディアムは詳細説明
        hybrid: 8
      },
      news: {
        short: -3,   // ニュースは簡潔に
        medium: 0,   // ミディアムは標準
        hybrid: -3
      }
    };
    
    return adjustments[template]?.[format] || 0;
  }

  // 制限内に収める
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

  // フォーマット別推奨時間
  getRecommendedDurations(format) {
    const recommendations = {
      short: {
        min: 15,
        optimal: 30,
        max: 60,
        description: 'TikTok・YouTube Shorts最適化'
      },
      medium: {
        min: 60,
        optimal: 120,
        max: 480,
        description: 'YouTube通常動画・収益化対応'
      },
      hybrid: {
        min: 15,
        optimal: 25,
        max: 30,
        description: 'ハイブリッド戦略・導入動画'
      }
    };
    
    return recommendations[format] || recommendations.medium;
  }

  // 時間調整の提案
  suggestTimeAdjustments(currentDuration, keyword, template, format) {
    const optimal = this.calculateOptimalDuration(keyword, template, format);
    const difference = optimal - currentDuration;
    
    if (Math.abs(difference) <= 2) {
      return {
        adjustment: 'none',
        message: '適切な時間です',
        suggestedDuration: currentDuration
      };
    }
    
    if (difference > 0) {
      return {
        adjustment: 'increase',
        message: `${difference}秒延長を推奨します`,
        suggestedDuration: optimal,
        reasons: this.getExtensionReasons(template, format)
      };
    } else {
      return {
        adjustment: 'decrease',
        message: `${Math.abs(difference)}秒短縮を推奨します`,
        suggestedDuration: optimal,
        reasons: this.getReductionReasons(template, format)
      };
    }
  }

  // 延長理由の提案
  getExtensionReasons(template, format) {
    const reasons = {
      ranking: ['各項目の詳細説明', '比較要素の追加', '評価基準の明示'],
      comparison: ['比較項目の詳細化', '価格差の説明', '使用シーン提案'],
      tutorial: ['手順の詳細化', '注意点の追加', '代替方法の紹介'],
      news: ['背景情報の追加', 'トレンド分析', '今後の予測']
    };
    
    return reasons[template] || reasons.ranking;
  }

  // 短縮理由の提案
  getReductionReasons(template, format) {
    const reasons = {
      ranking: ['重要項目に絞り込み', '冗長な説明を削除', '視覚的表現を強化'],
      comparison: ['主要差異のみ強調', '結論を明確に', 'インパクト重視'],
      tutorial: ['最重要手順のみ', 'シンプル化', '実演中心'],
      news: ['要点のみ抽出', 'インパクト重視', '簡潔なまとめ']
    };
    
    return reasons[template] || reasons.ranking;
  }
}

// シングルトンインスタンス
const contentAnalyzer = new ContentAnalyzer();
export default contentAnalyzer;