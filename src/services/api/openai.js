// src/services/api/openai.js - シンプル版（年号可変化+AI判定+3位→1位順序）

import { API_CONFIG, ENV, ENDPOINTS } from '../../config/api.js';

class OpenAIService {
  constructor() {
    this.apiKey = ENV.openaiApiKey;
    this.baseURL = API_CONFIG.openai.baseURL;
    this.model = API_CONFIG.openai.model;
  }

  // 🆕 年号を動的取得
  getCurrentYear() {
    return new Date().getFullYear();
  }

  // 🤖 完全自由形式AI判定（制限なし）
  async analyzeContentType(keyword) {
    // AIに最適な構成を完全自由に決めてもらう
    return 'free'; // 常に自由形式
  }

  // 🆕 完全自由形式プロンプト（AIが全て決める）
  async getVideoDesignPrompt(keyword, template, format, duration) {
    const formatSpecs = {
      short: { width: 1080, height: 1920 },
      medium: { width: 1920, height: 1080 }
    };
    const spec = formatSpecs[format] || formatSpecs.medium;

    return `あなたは動画制作のプロです。"${keyword}"について、最も効果的で魅力的な動画を作成してください。

**完全自由設定:**
- 動画の形式・構成は全てあなたが決めてください
- ランキング、比較、解説、チュートリアル、メリデメ、Q&A、ストーリー等なんでも可
- シーン数、時間配分も最適に設計
- 価格の有無も内容に応じて判断
- タイトルもあなたが自由に決めてください

**制約条件:**
- 動画時間: ${duration}秒厳守
- Canvas: ${spec.width}x${spec.height}

**出力形式（完全自由設計）:**
\`\`\`json
{
  "title": "${keyword}について最適なタイトル（完全に自由に決めてください）",
  "videoType": "あなたが選んだ形式名",
  "duration": ${duration},
  "canvas": {
    "width": ${spec.width},
    "height": ${spec.height},
    "backgroundColor": "適切な色合い"
  },
  "content": {
    "description": "この動画の構成・狙いの説明",
    "structure": "採用した構成の理由"
  },
  "items": [
    {
      "id": 1,
      "type": "あなたが決めた要素タイプ",
      "name": "要素名",
      "content": {
        "main": "メインコンテンツ",
        "details": "詳細情報",
        "extra": "追加情報（価格・評価・手順・メリット等、必要に応じて）"
      }
    }
  ],
  "scenes": [
    {
      "startTime": 0,
      "endTime": "適切な時間",
      "type": "あなたが決めたシーンタイプ",
      "content": {
        "mainText": "シーンのメインテキスト",
        "subText": "サブテキスト（任意）",
        "targetItem": "対象アイテムID（該当する場合）",
        "announcement": "アナウンステキスト（任意）",
        "visualStyle": "このシーンの視覚的特徴"
      }
    }
  ]
}
\`\`\`

**重要**: "${keyword}"に最適な形式・構成・内容・タイトルを完全に自由に設計してください。既存の形式やテンプレートに縛られる必要はありません。`;
  }

  // 本番ChatGPT API呼び出し（シンプル版）
  async generateVideoDesign(keyword, template, format = 'medium', duration = 30) {
    console.log(`🚀 AI動画設計: ${keyword}, ${format}, ${duration}秒`);

    if (!this.apiKey) {
      console.warn('⚠️ APIキー未設定、モックデータ使用');
      return this.getMockVideoDesign(keyword, format, duration);
    }

    try {
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
              content: '動画設計図をJSON形式で正確に作成してください。'
            },
            {
              role: 'user',
              content: await this.getVideoDesignPrompt(keyword, template, format, duration)
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // JSON抽出
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const result = JSON.parse(jsonString);
      
      // 基本修正
      result.duration = duration;
      
      // 年号強制削除（不要だった処理）
      // if (result.title && !result.title.includes(this.getCurrentYear())) {
      //   result.title = result.title.replace(/【\d+年/, `【${this.getCurrentYear()}年`);
      // }

      console.log(`✅ AI設計図完成: ${result.title}`);
      return result;

    } catch (error) {
      console.error('❌ API呼び出しエラー:', error);
      return this.getMockVideoDesign(keyword, format, duration);
    }
  }

  // モックデータ（シンプル版）
  getMockVideoDesign(keyword, format, duration) {
    const spec = format === 'short' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };

    return {
      title: `${keyword}について`,
      duration: duration,
      canvas: {
        width: spec.width,
        height: spec.height,
        backgroundColor: '#1e3a8a,#7c3aed,#db2777'
      },
      items: [
        {
          rank: 3,
          name: `${keyword} エントリー`,
          price: '¥12,800',
          rating: 4.4,
          features: ['お手軽', '初心者向け', 'コスパ良好']
        },
        {
          rank: 2,
          name: `${keyword} スタンダード`,
          price: '¥19,800',
          rating: 4.6,
          features: ['バランス良好', '人気', '安定性']
        },
        {
          rank: 1,
          name: `${keyword} プレミアム`,
          price: '¥29,800',
          rating: 4.8,
          features: ['最高性能', 'プロ仕様', 'No.1']
        }
      ],
      scenes: [
        { startTime: 0, endTime: 3, type: 'title', content: { mainText: `${keyword}について` } },
        { startTime: 3, endTime: Math.floor(duration * 0.4), type: 'item', content: { rank: 3, announcement: "第3位！" } },
        { startTime: Math.floor(duration * 0.4), endTime: Math.floor(duration * 0.7), type: 'item', content: { rank: 2, announcement: "第2位！" } },
        { startTime: Math.floor(duration * 0.7), endTime: duration, type: 'item', content: { rank: 1, announcement: "第1位！" } }
      ]
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