// src/services/ai/keywordAnalyzer.js - スライド別対応改良版

import openaiService from '../api/openai.js';

class KeywordAnalyzer {
  constructor() {
    this.cache = new Map();
    this.usedKeywords = new Set(); // 重複回避用
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
        max_tokens: 500, // 増量：スライド別対応で多くのキーワードが必要
        temperature: 0.4 // 少し上げる：バリエーション増加
      });

      const keywords = this.parseKeywordResponse(response);
      this.cache.set(cacheKey, keywords);
      
      return keywords;

    } catch (error) {
      console.warn('⚠️ AI キーワード生成失敗、フォールバック使用:', error.message);
      return this.generateFallbackKeywords(videoDesign);
    }
  }

  // 🆕 スライド別キーワード生成（新規追加）
  async generateSlideSpecificKeywords(content, slideInfo = {}) {
    const { type = 'general', index = 0, subIndex = 0 } = slideInfo;
    const cacheKey = `slide_${content}_${type}_${index}_${subIndex}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const prompt = this.createSlidePrompt(content, slideInfo);
      const response = await openaiService.createCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "あなたは画像検索の専門家です。スライド内容から、Unsplash検索に最適で重複しない英語キーワードを生成してください。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.5 // バリエーション重視
      });

      const keywords = this.parseSlideResponse(response);
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
    },
    {
      "main": "アイテム3メインキーワード",
      "variations": ["バリエーション1", "バリエーション2", "バリエーション3"]
    }
  ],
  "summary": "まとめ画像用キーワード（3-5単語）"
}

条件：
- 写真として実在しそうな具体的なキーワード
- 抽象的すぎない、視覚的に表現可能なもの
- YouTube、ロゴ、アイコン、矢印等は絶対に避ける
- 人物、物品、風景など実際の写真を想定
- 各アイテムで異なるバリエーションを提供
    `.trim();
  }

  // 🆕 スライド別プロンプト作成
  createSlidePrompt(content, slideInfo) {
    const { type, index, subIndex } = slideInfo;
    const usedList = Array.from(this.usedKeywords).join(', ');
    
    return `
スライド内容: ${content}
スライド種類: ${type}
スライド番号: ${index}
サブスライド: ${subIndex}
使用済みキーワード（避ける）: ${usedList}

上記の情報から、Unsplash画像検索用の英語キーワードを3-5個生成してください：

{
  "primary": "メインキーワード（3-4単語）",
  "alternatives": ["代替案1", "代替案2", "代替案3"]
}

条件：
- 使用済みキーワードと重複しない
- YouTube、矢印、ロゴ、ボタン等は絶対に避ける
- 実際に撮影された写真として存在しそう
- スライド番号${index}とサブ${subIndex}に適した内容
    `.trim();
  }

  // レスポンス解析（改良版）
  parseKeywordResponse(response) {
    try {
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 新しい構造に対応
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

  // 🆕 スライド別レスポンス解析
  parseSlideResponse(response) {
    try {
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          primary: parsed.primary || 'lifestyle modern',
          alternatives: parsed.alternatives || ['concept', 'beautiful', 'clean']
        };
      }
      
      // JSON形式でない場合のテキスト解析
      const words = content.match(/\b[a-zA-Z]{3,}\b/g) || [];
      return {
        primary: words.slice(0, 3).join(' ') || 'lifestyle modern',
        alternatives: words.slice(3, 6)
      };
      
    } catch (error) {
      return {
        primary: 'lifestyle modern clean',
        alternatives: ['concept beautiful', 'professional bright', 'natural light']
      };
    }
  }

  // フォールバック（AI失敗時）- 改良版
  generateFallbackKeywords(videoDesign) {
    const title = videoDesign.title || '';
    
    // コンテンツ分析ベース
    if (title.includes('子育て') || title.includes('育児')) {
      return {
        title: "family parenting children happy",
        items: [
          {
            main: "parent child communication love",
            variations: ["family conversation", "parent teaching child", "family bonding time"]
          },
          {
            main: "family time together activities",
            variations: ["children playing", "family fun", "home activities"]
          },
          {
            main: "children learning education play",
            variations: ["child development", "educational toys", "learning together"]
          }
        ],
        summary: "thumbs up positive feedback appreciation"
      };
    }
    
    if (title.includes('ワイヤレスイヤホン') || title.includes('イヤホン')) {
      return {
        title: "wireless earbuds headphones music",
        items: [
          {
            main: "bluetooth earbuds white background",
            variations: ["earbuds technology", "wireless audio", "modern headphones"]
          },
          {
            main: "person listening music headphones",
            variations: ["music lifestyle", "audio enjoyment", "sound quality"]
          },
          {
            main: "audio device technology modern",
            variations: ["tech gadgets", "electronic devices", "innovation"]
          }
        ],
        summary: "thumbs up tech review positive"
      };
    }
    
    // デフォルト（各スライドで異なるバリエーション）
    return {
      title: "concept idea lightbulb inspiration",
      items: [
        {
          main: "business concept professional",
          variations: ["workplace modern", "office lifestyle", "professional environment"]
        },
        {
          main: "lifestyle modern clean",
          variations: ["minimalist design", "contemporary living", "bright space"]
        },
        {
          main: "success achievement goal",
          variations: ["victory celebration", "accomplishment", "positive outcome"]
        }
      ],
      summary: "positive feedback thumbs up"
    };
  }

  // 🆕 スライド別フォールバック
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

  // 🆕 キーワード重複チェック・追加
  markKeywordAsUsed(keyword) {
    this.usedKeywords.add(keyword);
  }

  // 🆕 未使用キーワード取得
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
    
    // ユーザー設定による調整
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

  // 🆕 統計情報取得
  getStats() {
    return {
      cacheSize: this.cache.size,
      usedKeywords: this.usedKeywords.size,
      recentUsed: Array.from(this.usedKeywords).slice(-5)
    };
  }

  // キャッシュクリア（改良版）
  clearCache() {
    this.cache.clear();
    this.usedKeywords.clear();
    console.log('🗑️ KeywordAnalyzer キャッシュクリア');
  }
}

const keywordAnalyzer = new KeywordAnalyzer();
export default keywordAnalyzer;