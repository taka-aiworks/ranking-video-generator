// src/services/ai/keywordAnalyzer.js - AI自動キーワード生成

import openaiService from '../api/openai.js';

class KeywordAnalyzer {
  constructor() {
    this.cache = new Map();
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
        max_tokens: 300,
        temperature: 0.3
      });

      const keywords = this.parseKeywordResponse(response);
      this.cache.set(cacheKey, keywords);
      
      return keywords;

    } catch (error) {
      console.warn('⚠️ AI キーワード生成失敗、フォールバック使用:', error.message);
      return this.generateFallbackKeywords(videoDesign);
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
    "アイテム1用キーワード（3-5単語）",
    "アイテム2用キーワード（3-5単語）",
    "アイテム3用キーワード（3-5単語）"
  ],
  "summary": "まとめ画像用キーワード（3-5単語）"
}

条件：
- 写真として実在しそうな具体的なキーワード
- 抽象的すぎない、視覚的に表現可能なもの
- YouTube、ロゴ、アイコン等は避ける
- 人物、物品、風景など実際の写真を想定
    `.trim();
  }

  // レスポンス解析
  parseKeywordResponse(response) {
    try {
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
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
    
    // コンテンツ分析ベース
    if (title.includes('子育て') || title.includes('育児')) {
      return {
        title: "family parenting children happy",
        items: [
          "parent child communication love",
          "family time together activities", 
          "children learning education play"
        ],
        summary: "thumbs up positive feedback appreciation"
      };
    }
    
    if (title.includes('ワイヤレスイヤホン') || title.includes('イヤホン')) {
      return {
        title: "wireless earbuds headphones music",
        items: [
          "bluetooth earbuds white background",
          "person listening music headphones",
          "audio device technology modern"
        ],
        summary: "thumbs up tech review positive"
      };
    }
    
    // デフォルト
    return {
      title: "concept idea lightbulb inspiration",
      items: [
        "business concept professional",
        "lifestyle modern clean",
        "success achievement goal"
      ],
      summary: "positive feedback thumbs up"
    };
  }

  // キーワード改善（人間による微調整用）
  enhanceKeywords(aiKeywords, userPreferences = {}) {
    const enhanced = { ...aiKeywords };
    
    // ユーザー設定による調整
    if (userPreferences.style === 'minimalist') {
      enhanced.title += " clean minimalist white background";
    }
    
    if (userPreferences.mood === 'professional') {
      enhanced.items = enhanced.items.map(kw => kw + " professional business");
    }
    
    return enhanced;
  }

  // キャッシュクリア
  clearCache() {
    this.cache.clear();
  }
}

const keywordAnalyzer = new KeywordAnalyzer();
export default keywordAnalyzer;