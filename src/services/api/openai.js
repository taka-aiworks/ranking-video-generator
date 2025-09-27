// src/services/api/openai.js - createCompletionメソッド追加版

import { API_CONFIG, ENV, ENDPOINTS } from '../../config/api.js';

class OpenAIService {
  constructor() {
    this.apiKey = ENV.openaiApiKey;
    this.baseURL = API_CONFIG.openai.baseURL;
    this.model = API_CONFIG.openai.model;
  }

  // 🆕 キーワード生成用のcreateCompletionメソッド追加
  async createCompletion(options) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.chatgpt.completion}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages: options.messages,
          max_tokens: options.max_tokens || 300,
          temperature: options.temperature || 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('🚨 OpenAI API呼び出しエラー:', error);
      throw error;
    }
  }

  getCurrentYear() {
    return new Date().getFullYear();
  }

  // 分野自動判別
  async detectCategory(keyword) {
    if (!this.apiKey) {
      return this.detectCategoryOffline(keyword);
    }

    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.chatgpt.completion}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `"${keyword}" は以下のどの分野ですか？1つだけ選んで回答してください：

1. product - 商品おすすめ・比較・レビュー・ランキング
2. health - 筋トレ・ダイエット・健康・美容・運動
3. money - 副業・投資・節約・転職・お金・ビジネス
4. lifestyle - 子育て・料理・掃除・生活・趣味
5. skill - 勉強・スキル・プログラミング・学習・資格

回答例: product`
          }],
          max_tokens: 10,
          temperature: 0
        })
      });

      const data = await response.json();
      const result = data.choices[0].message.content.toLowerCase().trim();
      
      const validCategories = ['product', 'health', 'money', 'lifestyle', 'skill'];
      if (validCategories.includes(result)) {
        console.log(`🎯 AI分野判定: "${keyword}" → ${result}`);
        return result;
      } else {
        console.warn(`⚠️ 無効な分野判定: ${result}, デフォルト使用`);
        return 'product';
      }

    } catch (error) {
      console.error('❌ 分野判定エラー:', error);
      return this.detectCategoryOffline(keyword);
    }
  }

  // オフライン分野判定
  detectCategoryOffline(keyword) {
    const lower = keyword.toLowerCase();
    
    if (lower.includes('おすすめ') || lower.includes('比較') || lower.includes('レビュー') || 
        lower.includes('ランキング') || lower.includes('vs')) {
      return 'product';
    }
    if (lower.includes('筋トレ') || lower.includes('ダイエット') || lower.includes('健康') || 
        lower.includes('美容') || lower.includes('運動')) {
      return 'health';
    }
    if (lower.includes('副業') || lower.includes('投資') || lower.includes('節約') || 
        lower.includes('転職') || lower.includes('お金')) {
      return 'money';
    }
    if (lower.includes('子育て') || lower.includes('料理') || lower.includes('掃除') || 
        lower.includes('生活') || lower.includes('趣味')) {
      return 'lifestyle';
    }
    if (lower.includes('勉強') || lower.includes('学習') || lower.includes('スキル') || 
        lower.includes('プログラミング') || lower.includes('資格')) {
      return 'skill';
    }
    
    return 'product';
  }

  // 実用的なプロンプト生成（架空の話を排除）
  getCategoryPrompt(keyword, category, format, duration) {
    const formatSpecs = {
      short: { width: 1080, height: 1920 },
      medium: { width: 1920, height: 1080 }
    };
    const spec = formatSpecs[format] || formatSpecs.medium;

    const prompts = {
      product: `「${keyword}」について、実際に役立つ具体的な情報を3つのポイントで解説してください。

**重要な条件:**
- 架空の人物や会社は使わない
- 具体的で実用的な情報のみ
- 初心者にわかりやすく説明
- 実在する商品・サービス・方法を紹介`,

      health: `「${keyword}」について、実際に効果的な方法を3つのポイントで解説してください。

**重要な条件:**
- 科学的根拠に基づいた情報
- 具体的な数字・時間・方法
- 初心者が実践しやすい内容
- 安全で現実的なアドバイス`,

      money: `「${keyword}」について、実際に役立つ具体的な情報を3つのポイントで解説してください。

**重要な条件:**
- 架空の成功談は使わない
- 具体的な金額・時間・方法
- 初心者が始めやすい内容
- 現実的で安全な方法のみ`,

      lifestyle: `「${keyword}」について、実際に役立つ具体的な方法を3つのポイントで解説してください。

**重要な条件:**
- 実践的で具体的な方法
- 時短・効率化のコツ
- 初心者でも簡単にできる
- 日常生活に取り入れやすい`,

      skill: `「${keyword}」について、効率的な学習方法を3つのポイントで解説してください。

**重要な条件:**
- 具体的な学習時間・手順
- 初心者向けの段階的な方法
- 実際に使える学習リソース
- 挫折しにくい継続のコツ`
    };

    const basePrompt = prompts[category] || prompts.product;

    const jsonTemplate = `{
  "title": "${keyword}について知っておくべき3つのポイント",
  "videoType": "${category}情報",
  "duration": ${duration},
  "canvas": {
    "width": ${spec.width},
    "height": ${spec.height},
    "backgroundColor": "#ffffff"
  },
  "content": {
    "description": "${keyword}について実用的で役立つ情報",
    "structure": "基本知識→具体的方法→実践のコツ"
  },
  "items": [
    {
      "id": 1,
      "name": "具体的なポイント1",
      "content": {
        "main": "わかりやすい説明",
        "details": "詳細な解説と具体例"
      }
    },
    {
      "id": 2,
      "name": "具体的なポイント2", 
      "content": {
        "main": "わかりやすい説明",
        "details": "詳細な解説と具体例"
      }
    },
    {
      "id": 3,
      "name": "具体的なポイント3",
      "content": {
        "main": "わかりやすい説明", 
        "details": "詳細な解説と具体例"
      }
    }
  ]
}`;

    return `${basePrompt}

以下のJSON形式で出力してください：
${jsonTemplate}

重要：
- 実用的で具体的な内容のみ
- 架空の話や誇大な表現は避ける
- 初心者が実際に行動できる情報`;
  }

  // メイン生成関数
  async generateVideoDesign(keyword, template, format = 'short', duration = 30) {
    console.log(`🎯 実用的AI生成開始: ${keyword}`);

    try {
      // 分野判定
      const category = await this.detectCategory(keyword);
      console.log(`📂 判定された分野: ${category}`);

      // APIなしの場合はモックデータ
      if (!this.apiKey) {
        console.warn('⚠️ APIキー未設定、実用的モックデータ使用');
        return this.getRealisticMockData(keyword, category, format, duration);
      }

      // API呼び出し
      const prompt = this.getCategoryPrompt(keyword, category, format, duration);
      
      const response = await fetch(`${this.baseURL}${ENDPOINTS.chatgpt.completion}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `あなたは${category}分野の専門家です。実用的で初心者にわかりやすい情報を提供してください。架空の話は使わず、具体的で実践的な内容に焦点を当ててください。`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      const result = JSON.parse(jsonString);
      
      result.duration = duration;
      result.category = category;
      
      console.log(`✅ 実用的AI設計図完成: ${category} - ${result.title}`);
      return result;

    } catch (error) {
      console.error('❌ 実用的生成エラー:', error);
      const fallbackCategory = this.detectCategoryOffline(keyword);
      return this.getRealisticMockData(keyword, fallbackCategory, format, duration);
    }
  }

  // 実用的なモックデータ（分野別）
  getRealisticMockData(keyword, category, format, duration) {
    const spec = format === 'short' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    
    // 汎用版（その他のキーワード）
    return {
      title: `${keyword}について知っておくべき3つのポイント`,
      videoType: `${category}情報`,
      duration: duration,
      canvas: { width: spec.width, height: spec.height, backgroundColor: "#ffffff" },
      content: {
        description: `${keyword}について実用的で役立つ情報`,
        structure: "基本知識→具体的方法→実践のコツ"
      },
      items: [
        {
          id: 1,
          name: "基本的な知識",
          content: {
            main: "初心者が知っておくべき基本",
            details: "まず理解すべき重要なポイントです"
          }
        },
        {
          id: 2,
          name: "具体的な方法",
          content: {
            main: "実際に始める具体的な手順",
            details: "段階的に進めることで確実に習得できます"
          }
        },
        {
          id: 3,
          name: "継続のコツ",
          content: {
            main: "長く続けるための秘訣",
            details: "習慣化して継続することが成功の鍵です"
          }
        }
      ]
    };
  }

  // 後方互換性
  async generateContent(keyword, template) {
    const videoDesign = await this.generateVideoDesign(keyword, template, 'short', 30);
    return {
      title: videoDesign.title,
      items: videoDesign.items,
      script: `${videoDesign.title}について解説します。`
    };
  }
}

const openaiService = new OpenAIService();
export default openaiService;