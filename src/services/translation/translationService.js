// src/services/translation/translationService.js - 修正版

import openaiService from '../api/openai.js';

class TranslationService {
  constructor() {
    this.cache = new Map();
    this.isEnabled = true;
    
    console.log('🌐 動的翻訳サービス初期化完了');
  }

  // メイン機能: 簡潔なキーワード生成
  async translateForImageSearch(text, options = {}) {
    console.log('🌐 動的翻訳開始:', text);
    
    if (!text || typeof text !== 'string') {
      return 'lifestyle modern';
    }

    // 英語の場合はそのまま返す（二重翻訳回避）
    const hasJapanese = /[ひらがなカタカナ漢字]/.test(text);
    if (!hasJapanese) {
      console.log('📝 英語テキストそのまま使用:', text);
      return this.shortenKeyword(text);
    }

    const cacheKey = `${text}_${options.type || 'default'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 修正されたプロンプト（簡潔なキーワード生成）
      const response = await openaiService.createCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `日本語「${text}」を画像検索用の英語キーワード（3-4単語）に翻訳してください。

条件:
- リストや説明文ではなく、単一のキーワードのみ
- 3-4単語の簡潔な英語
- 写真として存在しそうな内容
- YouTube、矢印、ロゴは避ける

回答例: "family conversation children"`
        }],
        max_tokens: 30,
        temperature: 0.3
      });

      let translated = response.choices[0].message.content.trim()
        .replace(/^(キーワード:|Keywords?:|翻訳:|訳:)/i, '')
        .replace(/^["「『]|["」』]$/g, '')
        .replace(/\n.*$/g, '') // 最初の行のみ使用
        .trim()
        .toLowerCase();
      
      // さらに短縮
      translated = this.shortenKeyword(translated);
      
      this.cache.set(cacheKey, translated);
      
      console.log('✅ 動的翻訳完了:', translated);
      return translated;

    } catch (error) {
      console.warn('⚠️ 動的翻訳失敗:', error.message);
      return this.getFallbackTranslation(text);
    }
  }

  // キーワード短縮処理
  shortenKeyword(keyword) {
    if (!keyword) return 'lifestyle modern';
    
    // 長すぎる場合は最初の3-4単語のみ使用
    const words = keyword.split(' ').filter(word => word.length > 0);
    if (words.length > 4) {
      return words.slice(0, 4).join(' ');
    }
    
    // 不要な文字を除去
    return keyword
      .replace(/[^\w\s]/g, ' ') // 記号除去
      .replace(/\s+/g, ' ') // 連続スペース除去
      .trim();
  }

  // バリエーション生成（簡潔版）
  async generateVariations(text, count = 3) {
    const base = await this.translateForImageSearch(text);
    const variations = [base];
    
    const modifiers = ['beautiful', 'modern', 'bright'];
    for (let i = 1; i < count && i < modifiers.length + 1; i++) {
      const modified = `${base} ${modifiers[i - 1]}`;
      variations.push(this.shortenKeyword(modified));
    }
    
    return variations;
  }

  // フォールバック翻訳（簡潔版）
  getFallbackTranslation(text) {
    if (text.includes('子育て') || text.includes('育児')) return 'parenting children';
    if (text.includes('いいね') || text.includes('登録')) return 'thumbs up positive';
    if (text.includes('コミュニケーション') || text.includes('会話')) return 'family conversation';
    if (text.includes('ルーティン') || text.includes('習慣')) return 'daily routine';
    if (text.includes('ポジティブ') || text.includes('褒める')) return 'positive encouragement';
    return 'lifestyle modern';
  }

  // 統計取得
  getStats() {
    return {
      cacheSize: this.cache.size,
      isEnabled: this.isEnabled
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

const translationService = new TranslationService();
export default translationService;