// src/services/translation/translationService.js - 動的翻訳システム

import openaiService from '../api/openai.js';

class TranslationService {
  constructor() {
    this.cache = new Map();
    this.isEnabled = true;
    
    console.log('🌐 翻訳サービス初期化完了');
  }

  // メイン翻訳機能: 日本語→英語（画像検索特化）
  async translateForImageSearch(japaneseText, context = {}) {
    if (!japaneseText || typeof japaneseText !== 'string') {
      console.warn('⚠️ 無効な翻訳テキスト:', japaneseText);
      return 'lifestyle modern';
    }

    // 日本語が含まれていない場合はそのまま返す
    const hasJapanese = /[ひらがなカタカナ漢字]/.test(japaneseText);
    if (!hasJapanese) {
      console.log('📝 英語テキストそのまま使用:', japaneseText);
      return japaneseText;
    }

    // キャッシュチェック
    const cacheKey = `${japaneseText}_${context.type || 'general'}`;
    if (this.cache.has(cacheKey)) {
      console.log('📦 翻訳キャッシュヒット:', japaneseText.substring(0, 20));
      return this.cache.get(cacheKey);
    }

    try {
      // OpenAI翻訳（画像検索特化）
      const translated = await this.translateWithOpenAI(japaneseText, context);
      
      // キャッシュに保存
      this.cache.set(cacheKey, translated);
      
      console.log('✅ 翻訳完了:', {
        original: japaneseText.substring(0, 30),
        translated: translated
      });
      
      return translated;

    } catch (error) {
      console.warn('⚠️ API翻訳失敗、簡易翻訳使用:', error.message);
      return this.simpleTranslate(japaneseText, context);
    }
  }

  // OpenAI翻訳（画像検索特化プロンプト）
  async translateWithOpenAI(text, context) {
    const { type = 'general', slideIndex = 0, variation = 0 } = context;
    
    let prompt = `以下の日本語文章を、Unsplash画像検索に最適な英語キーワードに変換してください。

日本語文章: "${text}"
`;

    // コンテキスト別の指示追加
    if (type === 'title') {
      prompt += `
用途: タイトル画像検索用
要求: メインコンセプトを表す3-5単語の英語キーワード
例: "happy family parenting children"`;
    } else if (type === 'item') {
      prompt += `
用途: 項目説明画像検索用（バリエーション${variation + 1}）
要求: 具体的な場面や概念を表す3-6単語の英語キーワード
例: "parent child reading book together"`;
    } else if (type === 'summary') {
      prompt += `
用途: まとめ画像検索用
要求: ポジティブなフィードバックを表す3-5単語の英語キーワード
例: "thumbs up positive feedback like"`;
    }

    prompt += `

重要な条件:
- 実際に撮影された写真として存在しそうなキーワード
- 抽象的すぎない、視覚的に表現可能なもの
- YouTube、矢印、ロゴ、アイコンは避ける
- 人物、物品、風景、行動など具体的なもの

英語キーワード:`;

    const response = await openaiService.createCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7
    });

    let result = response.choices[0].message.content.trim();
    
    // クリーンアップ
    result = this.cleanupTranslation(result);
    
    return result;
  }

  // 翻訳結果のクリーンアップ
  cleanupTranslation(text) {
    return text
      .replace(/^(英語キーワード:|キーワード:|Keywords?:)/i, '')
      .replace(/^["「『]|["」』]$/g, '')
      .trim()
      .toLowerCase();
  }

  // 簡易翻訳（フォールバック用）
  simpleTranslate(text, context = {}) {
    const { type = 'general' } = context;
    
    // 基本的な単語置換マップ
    const basicMap = {
      '子育て': 'parenting',
      '育児': 'childcare',
      '子供': 'children',
      '家族': 'family',
      'コミュニケーション': 'communication',
      '信頼関係': 'trust',
      '日々': 'daily',
      '会話': 'conversation',
      '気持ち': 'feelings',
      '大切': 'important',
      '築く': 'building',
      '寄り添う': 'understanding',
      'ルーティン': 'routine',
      'ポジティブ': 'positive',
      '強化': 'reinforcement',
      '行動': 'behavior'
    };

    // 単語を抽出して翻訳
    const translatedWords = [];
    Object.keys(basicMap).forEach(japanese => {
      if (text.includes(japanese)) {
        translatedWords.push(basicMap[japanese]);
      }
    });

    if (translatedWords.length === 0) {
      // 翻訳できない場合のフォールバック
      switch (type) {
        case 'title':
          return 'family lifestyle beautiful';
        case 'item':
          return 'lifestyle modern bright';
        case 'summary':
          return 'thumbs up positive feedback';
        default:
          return 'lifestyle concept modern';
      }
    }

    // タイプ別の修飾語追加
    const result = translatedWords.join(' ');
    switch (type) {
      case 'title':
        return result + ' lifestyle beautiful';
      case 'item':
        return result + ' modern bright';
      case 'summary':
        return 'thumbs up positive ' + result;
      default:
        return result + ' modern';
    }
  }

  // バリエーション生成
  async generateVariations(baseText, count = 3) {
    const variations = [];
    
    for (let i = 0; i < count; i++) {
      const context = {
        type: 'item',
        variation: i,
        focus: i === 0 ? 'main' : i === 1 ? 'action' : 'environment'
      };
      
      const variation = await this.translateForImageSearch(baseText, context);
      variations.push(variation);
    }
    
    return variations;
  }

  // 翻訳統計取得
  getStats() {
    return {
      cacheSize: this.cache.size,
      isEnabled: this.isEnabled,
      recentTranslations: Array.from(this.cache.keys()).slice(-5)
    };
  }

  // キャッシュクリア
  clearCache() {
    this.cache.clear();
    console.log('🗑️ 翻訳キャッシュクリア');
  }

  // サービス有効/無効切り替え
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🌐 翻訳サービス: ${enabled ? '有効' : '無効'}`);
  }
}

const translationService = new TranslationService();
export default translationService;