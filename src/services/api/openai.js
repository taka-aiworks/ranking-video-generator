// src/services/api/openai.js - API自動分野判別版

import { API_CONFIG, ENV, ENDPOINTS } from '../../config/api.js';

class OpenAIService {
  constructor() {
    this.apiKey = ENV.openaiApiKey;
    this.baseURL = API_CONFIG.openai.baseURL;
    this.model = API_CONFIG.openai.model;
  }

  getCurrentYear() {
    return new Date().getFullYear();
  }

  // Step 1: APIで分野自動判別
  async detectCategory(keyword) {
    if (!this.apiKey) {
      // APIなしの場合は簡易判定
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
      
      // 有効な分野かチェック
      const validCategories = ['product', 'health', 'money', 'lifestyle', 'skill'];
      if (validCategories.includes(result)) {
        console.log(`🎯 AI分野判定: "${keyword}" → ${result}`);
        return result;
      } else {
        console.warn(`⚠️ 無効な分野判定: ${result}, デフォルト使用`);
        return 'product'; // デフォルト
      }

    } catch (error) {
      console.error('❌ 分野判定エラー:', error);
      return this.detectCategoryOffline(keyword);
    }
  }

  // オフライン分野判定（フォールバック）
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
    
    return 'product'; // デフォルト
  }

  // Step 2: 分野別プロンプト生成
  async getCategorySpecificPrompt(keyword, category, format, duration) {
    const formatSpecs = {
      short: { width: 1080, height: 1920 },
      medium: { width: 1920, height: 1080 }
    };
    const spec = formatSpecs[format] || formatSpecs.medium;

    const prompts = {
      product: `あなたは"${keyword}"の商品専門家です。具体的な商品レビュー動画を作成してください。

**必須要素:**
- 具体的な商品名・ブランド名・モデル名
- 実際の価格・スペック・機能
- 他製品との具体的比較

**出力例:**
- "Sony WF-1000XM4 28,000円、ノイキャン性能95%"
- "iPhone 15 Pro vs Galaxy S24、カメラ性能テスト結果"
- "Nintendo Switch 32,978円、バッテリー4.5-9時間"`,

      health: `あなたは"${keyword}"の健康・フィットネス専門家です。具体的な実践方法を教えてください。

**必須要素:**
- 具体的なフォーム・姿勢・やり方
- 正確な回数・時間・重量・頻度
- 身体への具体的効果・変化

**出力例:**
- "プランク30秒×3セット、腹筋に効果"
- "スクワット背筋まっすぐ、膝がつま先より前に出ない"
- "週2-3回、48-72時間休息、タンパク質体重×1.6g"`,

      money: `あなたは"${keyword}"のお金・ビジネス専門家です。具体的な方法と数字を教えてください。

**必須要素:**
- 具体的な金額・利益・コスト
- 実際の手順・ツール・サービス名
- リアルな時間・労力・成果

**出力例:**
- "メルカリ転売、仕入れ1000円→販売3000円、月利5万円"
- "つみたてNISA月33,333円、年利4%で20年後1640万円"
- "ブログ収益化、月10記事×6ヶ月で月1万円"`,

      lifestyle: `あなたは"${keyword}"の生活・育児専門家です。具体的な方法と効果を教えてください。

**必須要素:**
- 具体的な手順・タイミング・頻度
- 実際にかかる時間・コスト
- 期待できる具体的な効果・変化

**出力例:**
- "寝る前読み聞かせ15分、語彙力30%向上"
- "作り置き日曜2時間、平日夕飯準備10分"
- "子供と公園週3回、運動能力・社交性向上"`,

      skill: `あなたは"${keyword}"の学習・スキル専門家です。具体的な習得方法を教えてください。

**必須要素:**
- 具体的な学習手順・教材・ツール名
- 実際の学習時間・期間・レベル
- 習得後の具体的なスキル・成果

**出力例:**
- "Python入門、Progate 1日1時間×30日で基礎習得"
- "TOEIC600→800点、公式問題集3冊×2周、3ヶ月"
- "Excel関数50個覚える、VLOOKUP・SUMIF等、業務効率3倍"`
    };

    const basePrompt = prompts[category] || prompts.product;

    return `${basePrompt}

**出力形式:**
\`\`\`json
{
  "title": "${keyword}の具体的なタイトル",
  "videoType": "${category}ガイド",
  "duration": ${duration},
  "canvas": {
    "width": ${spec.width},
    "height": ${spec.height},
    "backgroundColor": "#ffffff"
  },
  "content": {
    "description": "${keyword}について具体的で実践的な情報",
    "structure": "具体的な商品名・数字・手順で構成"
  },
  "items": [
    {
      "id": 1,
      "type": "具体的内容",
      "name": "1つ目の具体的な項目",
      "content": {
        "main": "具体的な名前・数字・方法",
        "details": "詳しいスペック・手順・データ",
        "extra": "実践時の具体的なコツ"
      }
    },
    {
      "id": 2,
      "type": "具体的内容",
      "name": "2つ目の具体的な項目",
      "content": {
        "main": "具体的な名前・数字・方法",
        "details": "詳しいスペック・手順・データ",
        "extra": "実践時の具体的なコツ"
      }
    },
    {
      "id": 3,
      "type": "具体的内容", 
      "name": "3つ目の具体的な項目",
      "content": {
        "main": "具体的な名前・数字・方法",
        "details": "詳しいスペック・手順・データ",
        "extra": "実践時の具体的なコツ"
      }
    }
  ]
}
\`\`\`

**重要**: 必ず具体的な商品名・数字・手順を含めて、実践的な内容にしてください。`;
  }

  // メイン生成関数（2段階：分野判定→専門プロンプト）
  async generateVideoDesign(keyword, template, format = 'short', duration = 30) {
    console.log(`🎯 2段階AI生成開始: ${keyword}`);

    try {
      // Step 1: 分野判定
      const category = await this.detectCategory(keyword);
      console.log(`📂 判定された分野: ${category}`);

      // Step 2: 分野別プロンプトで生成
      if (!this.apiKey) {
        console.warn('⚠️ APIキー未設定、分野別モックデータ使用');
        return this.getCategoryMockData(keyword, category, format, duration);
      }

      const prompt = await this.getCategorySpecificPrompt(keyword, category, format, duration);
      
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
              content: `あなたは${category}分野の専門家です。具体的で実用的な動画設計を作成してください。`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2500,
          temperature: 0.6
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const result = JSON.parse(jsonString);
      
      result.duration = duration;
      result.category = category;
      
      console.log(`✅ 分野別AI設計図完成: ${category} - ${result.title}`);
      return result;

    } catch (error) {
      console.error('❌ 2段階生成エラー:', error);
      const fallbackCategory = this.detectCategoryOffline(keyword);
      return this.getCategoryMockData(keyword, fallbackCategory, format, duration);
    }
  }

  // 分野別モックデータ（APIなし時のフォールバック）
  getCategoryMockData(keyword, category, format, duration) {
    const spec = format === 'short' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    
    const mockData = {
      product: {
        title: `${keyword}おすすめ3選`,
        items: [
          {
            id: 1,
            name: "Sony WF-1000XM4",
            content: {
              main: "28,000円、ノイキャン性能95%",
              details: "8時間連続再生、急速充電5分で60分",
              extra: "AndroidでもiPhoneでも高音質"
            }
          }
        ]
      },
      health: {
        title: `${keyword}で効果的な3つの方法`,
        items: [
          {
            id: 1,
            name: "正しいスクワットフォーム",
            content: {
              main: "背筋まっすぐ、膝がつま先より前に出ない",
              details: "太ももが床と平行まで下げる",
              extra: "週2-3回、1セット8-12回"
            }
          }
        ]
      }
      // 他の分野も同様...
    };

    return {
      title: mockData[category]?.title || `${keyword}について`,
      videoType: `${category}ガイド`,
      duration: duration,
      canvas: { width: spec.width, height: spec.height, backgroundColor: '#ffffff' },
      content: { description: `${keyword}について${category}分野の専門的な情報` },
      items: mockData[category]?.items || [],
      category: category
    };
  }

  // 後方互換性
  async generateContent(keyword, template) {
    const videoDesign = await this.generateVideoDesign(keyword, template, 'medium', 30);
    return {
      title: videoDesign.title,
      items: videoDesign.items,
      script: `${videoDesign.title}について解説します。`
    };
  }
}

const openaiService = new OpenAIService();
export default openaiService;