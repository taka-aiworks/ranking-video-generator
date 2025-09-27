// src/services/ai/keywordAnalyzer.js - 動的翻訳統合版

import openaiService from '../api/openai.js';
import translationService from '../translation/translationService.js';

class KeywordAnalyzer {
  constructor() {
    this.cache = new Map();
    this.usedKeywords = new Set();
  }

  // メイン機能：コンテンツから最適な画像キーワードを自動生成
  async generateImageKeywords(videoDesign) {
    const cacheKey = `keywords_${videoDesign.title}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const prompt = this.createKeywordPrompt(videoDesign);
      const response = await openaiService.createCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: "あなたは画像検索の専門家です。動画の内容に最適な英語の画像検索キーワードを生成してください。"
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.4
      });

      const keywords = this.parseKeywordResponse(response);
      this.cache.set(cacheKey, keywords);
      
      return keywords;

    } catch (error) {
      console.warn('⚠️ AI キーワード生成失敗、フォールバック使用:', error.message);
      return this.generateFallbackKeywords(videoDesign);
    }
  }

  // スライド別キーワード生成（動的翻訳使用）
  async generateSlideSpecificKeywords(content, slideInfo = {}) {
    const { type = 'general', index = 0, subIndex = 0 } = slideInfo;
    const cacheKey = `slide_${content}_${type}_${index}_${subIndex}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // translationService を使用して動的翻訳
      const translated = await translationService.translateForImageSearch(content, {
        type: type,
        variation: subIndex
      });

      const keywords = {
        primary: translated,
        alternatives: await translationService.generateVariations(content, 3)
      };
      
      this.cache.set(cacheKey, keywords);
      return keywords;

    } catch (error) {
      console.warn('⚠️ スライド別キーワード生成失敗:', error.message);
      return this.generateSlideKeywordFallback(content, slideInfo);
    }
  }

  // プロンプト作成
  createKeywordPrompt(videoDesign) {
    return `
動画タイトル: ${videoDesign.title}
動画内容:
${videoDesign.items?.map((item, i) => `${i+1}. ${item.name || item.title}: ${item.description || item.content?.main || ''}`).join('\n')}

上記の動画内容に基づいて、以下の形式でUnsplash画像検索に最適な英語キーワードを生成してください：

{
  "title": "タイトル画像用キーワード（3-5単語）",
  "items": [
    {
      "main": "アイテム1メインキーワード",
      "variations": ["バリエーション1", "バリエーション2", "バリエーション3"]
    },
    {
      "main": "アイテム2メインキーワード", 
      "variations": ["バリエーション1", "バリエーション2", "バリエーション3"]
    }
  ],
  "summary": "まとめ画像用キーワード（3-5単語）"
}

条件：
- 写真として実在しそうな具体的なキーワード
- YouTube、ロゴ、アイコン、矢印等は絶対に避ける
- 人物、物品、風景など実際の写真を想定
- 各アイテムで異なるバリエーションを提供
    `.trim();
  }

  // レスポンス解析
  parseKeywordResponse(response) {
    try {
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          title: parsed.title || 'concept lifestyle',
          items: parsed.items || [],
          summary: parsed.summary || 'positive feedback thumbs up'
        };
      } else {
        throw new Error('JSON形式が見つかりません');
      }
    } catch (error) {
      console.warn('⚠️ AI レスポンス解析失敗:', error.message);
      return null;
    }
  }

  // フォールバック（AI失敗時）
  generateFallbackKeywords(videoDesign) {
    const title = videoDesign.title || '';
    
    return {
      title: "lifestyle concept beautiful",
      items: [
        {
          main: "family lifestyle modern",
          variations: ["family conversation", "parent teaching child", "family bonding time"]
        },
        {
          main: "lifestyle bright clean",
          variations: ["modern design", "contemporary living", "bright space"]
        },
        {
          main: "positive concept beautiful",
          variations: ["success celebration", "accomplishment", "positive outcome"]
        }
      ],
      summary: "thumbs up positive feedback"
    };
  }

  // スライド別フォールバック
  generateSlideKeywordFallback(content, slideInfo) {
    const { type, index } = slideInfo;
    
    const fallbackSets = {
      title: ['concept inspiration', 'lifestyle beautiful', 'modern design'],
      item: [
        'lifestyle modern clean',
        'professional environment bright', 
        'natural light beautiful',
        'contemporary design space',
        'elegant simplicity'
      ],
      summary: ['thumbs up positive', 'like approval good', 'success celebration']
    };
    
    const typeSet = fallbackSets[type] || fallbackSets.item;
    const selected = typeSet[index % typeSet.length];
    
    return {
      primary: selected,
      alternatives: typeSet.filter(k => k !== selected).slice(0, 3)
    };
  }

  // キーワード重複チェック・追加
  markKeywordAsUsed(keyword) {
    this.usedKeywords.add(keyword);
  }

  // 未使用キーワード取得
  getUnusedKeyword(candidates) {
    for (const candidate of candidates) {
      if (!this.usedKeywords.has(candidate)) {
        this.markKeywordAsUsed(candidate);
        return candidate;
      }
    }
    // 全て使用済みの場合、リセットして最初を返す
    this.usedKeywords.clear();
    this.markKeywordAsUsed(candidates[0]);
    return candidates[0];
  }

  // キーワード改善（人間による微調整用）
  enhanceKeywords(aiKeywords, userPreferences = {}) {
    const enhanced = { ...aiKeywords };
    
    if (userPreferences.style === 'minimalist') {
      enhanced.title += " clean minimalist white background";
    }
    
    if (userPreferences.mood === 'professional') {
      if (enhanced.items && Array.isArray(enhanced.items)) {
        enhanced.items = enhanced.items.map(item => ({
          ...item,
          main: item.main + " professional business"
        }));
      }
    }
    
    return enhanced;
  }

  // 統計情報取得
  getStats() {
    return {
      cacheSize: this.cache.size,
      usedKeywords: this.usedKeywords.size,
      recentUsed: Array.from(this.usedKeywords).slice(-5)
    };
  }

  // キャッシュクリア
  clearCache() {
    this.cache.clear();
    this.usedKeywords.clear();
    console.log('🗑️ KeywordAnalyzer キャッシュクリア');
  }
}

const keywordAnalyzer = new KeywordAnalyzer();
export default keywordAnalyzer;