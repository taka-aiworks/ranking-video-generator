// src/services/translation/translationService.js - 日本語判定修正版

import openaiService from '../api/openai.js';

class TranslationService {
  constructor() {
    this.cache = new Map();
    this.isEnabled = true;
    
    console.log('🌐 動的翻訳サービス初期化完了');
  }

  // メイン機能: 簡潔なキーワード生成
  async translateForImageSearch(text, options = {}) {
    // 動的翻訳（ログ非表示）
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.log('⚠️ 空テキスト - フォールバック使用');
      return this.getFallbackTranslation('');
    }

    // 🚨 修正：正しい日本語判定（Unicode範囲）
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);

    // 英語の場合はそのまま返す（二重翻訳回避）
    if (!hasJapanese) {
      return this.shortenKeyword(text);
    }

    const cacheKey = `${text}_${options.type || 'default'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 🚨 OpenAI翻訳を完全スキップ（CORS問題回避）
      // フォールバック翻訳のみ使用
      const translated = this.getFallbackTranslation(text);
      this.cache.set(cacheKey, translated);
      return translated;

    } catch (error) {
      // 動的翻訳失敗（フォールバック使用）
      return this.getFallbackTranslation(text);
    }
  }

  // キーワード短縮処理
  shortenKeyword(keyword) {
    if (!keyword || keyword.trim().length === 0) {
      return 'lifestyle modern';
    }
    
    // 長すぎる場合は最初の3-4単語のみ使用
    const words = keyword.split(' ').filter(word => word.length > 0);
    if (words.length > 4) {
      return words.slice(0, 4).join(' ');
    }
    
    // 不要な文字を除去
    const cleaned = keyword
      .replace(/[^\w\s]/g, ' ') // 記号除去
      .replace(/\s+/g, ' ') // 連続スペース除去
      .trim();
    
    return cleaned || 'lifestyle modern';
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

  // 🚨 修正：フォールバック翻訳の強化
  getFallbackTranslation(text) {
    // 空文字の場合
    if (!text || text.trim().length === 0) {
      return 'lifestyle modern clean';
    }
    
    // 子育て関連
    if (text.includes('子育て') || text.includes('育児') || text.includes('子供')) {
      return 'parenting children family';
    }
    
    // コミュニケーション関連
    if (text.includes('コミュニケーション') || text.includes('会話') || text.includes('話')) {
      return 'family conversation talking';
    }
    
    // ルーティン・習慣関連
    if (text.includes('ルーティン') || text.includes('習慣') || text.includes('日常')) {
      return 'daily routine lifestyle';
    }
    
    // ポジティブ関連
    if (text.includes('ポジティブ') || text.includes('褒める') || text.includes('強化')) {
      return 'positive encouragement support';
    }
    
    // いいね・登録関連
    if (text.includes('いいね') || text.includes('登録') || text.includes('チャンネル')) {
      return 'thumbs up positive feedback';
    }
    
    // デフォルト
    return 'lifestyle modern beautiful';
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