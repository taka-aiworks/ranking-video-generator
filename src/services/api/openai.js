// src/services/api/openai.js - ChatGPT API統合

import { API_CONFIG, ENV, ENDPOINTS } from '../../config/api.js';

class OpenAIService {
  constructor() {
    this.apiKey = ENV.openaiApiKey;
    this.baseURL = API_CONFIG.openai.baseURL;
    this.model = API_CONFIG.openai.model;
  }

  // プロンプトテンプレート
  getPromptTemplate(keyword, template) {
    const prompts = {
      ranking: `
        ${keyword}のおすすめランキングTOP5を作成してください。
        以下のJSON形式で返してください：
        {
          "title": "【2024年最新】${keyword} おすすめランキングTOP5",
          "items": [
            {
              "name": "商品名",
              "price": "¥XX,XXX",
              "rating": 4.5,
              "features": ["特徴1", "特徴2", "特徴3"]
            }
          ],
          "script": "動画用スクリプト"
        }
      `,
      
      comparison: `
        ${keyword}の人気商品2つを比較してください。
        以下のJSON形式で返してください：
        {
          "title": "${keyword} 徹底比較！どっちがおすすめ？",
          "productA": {
            "name": "商品A名",
            "price": "¥XX,XXX",
            "pros": ["メリット1", "メリット2"],
            "cons": ["デメリット1", "デメリット2"]
          },
          "productB": {
            "name": "商品B名", 
            "price": "¥XX,XXX",
            "pros": ["メリット1", "メリット2"],
            "cons": ["デメリット1", "デメリット2"]
          },
          "conclusion": "結論・おすすめポイント"
        }
      `,

      tutorial: `
        ${keyword}の選び方・使い方を3ステップで説明してください。
        以下のJSON形式で返してください：
        {
          "title": "初心者でもわかる！${keyword}の選び方",
          "steps": [
            {
              "step": 1,
              "title": "ステップタイトル",
              "content": "詳細説明"
            }
          ]
        }
      `,

      news: `
        ${keyword}に関する2024年の最新トレンドを3つ紹介してください。
        以下のJSON形式で返してください：
        {
          "title": "${keyword}の2024年最新トレンド",
          "trends": [
            {
              "title": "トレンド1",
              "content": "詳細説明"
            }
          ]
        }
      `
    };

    return prompts[template] || prompts.ranking;
  }

  // ChatGPT API呼び出し
  async generateContent(keyword, template) {
    // 開発環境ではモックデータを返す
    if (ENV.isDevelopment || !this.apiKey) {
      console.log('開発環境: モックデータを使用');
      return this.getMockResponse(keyword, template);
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
              role: 'user',
              content: this.getPromptTemplate(keyword, template)
            }
          ],
          max_tokens: API_CONFIG.openai.maxTokens,
          temperature: API_CONFIG.openai.temperature
        })
      });

      if (!response.ok) {
        throw new Error(`ChatGPT API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch {
        // JSON解析失敗時はフォールバック
        return this.getMockResponse(keyword, template);
      }

    } catch (error) {
      console.error('ChatGPT API呼び出しエラー:', error);
      return this.getMockResponse(keyword, template);
    }
  }

  // モックレスポンス生成
  getMockResponse(keyword, template) {
    const mockData = {
      ranking: {
        title: `【2024年最新】${keyword} おすすめランキングTOP5`,
        items: [
          { name: `${keyword} プロモデル`, price: '¥29,800', rating: 4.8, features: ['高性能', '人気No.1', '専門家推奨'] },
          { name: `${keyword} スタンダード`, price: '¥19,800', rating: 4.5, features: ['コスパ最強', '初心者向け', 'ベストセラー'] },
          { name: `${keyword} ライト`, price: '¥14,800', rating: 4.3, features: ['お手頃価格', '軽量', 'シンプル'] },
          { name: `${keyword} プレミアム`, price: '¥39,800', rating: 4.7, features: ['最高級', 'プロ仕様', '長期保証'] },
          { name: `${keyword} コンパクト`, price: '¥12,800', rating: 4.2, features: ['持ち運び便利', '省スペース', 'スタイリッシュ'] }
        ],
        script: `今回は2024年最新の${keyword}おすすめランキングTOP5をご紹介します。専門家の評価と実際のユーザーレビューを基に厳選しました。`
      },

      comparison: {
        title: `${keyword} 徹底比較！どっちがおすすめ？`,
        productA: { 
          name: `${keyword} プロ`, 
          price: '¥25,000', 
          pros: ['高品質', '多機能', '長期保証'], 
          cons: ['価格が高め', '重い'] 
        },
        productB: { 
          name: `${keyword} ライト`, 
          price: '¥18,000', 
          pros: ['コスパ良好', 'シンプル', '軽量'], 
          cons: ['機能限定', '質感やや劣る'] 
        },
        conclusion: `用途に応じて選びましょう。品質重視なら${keyword}プロ、コスパ重視なら${keyword}ライトがおすすめです。`
      },

      tutorial: {
        title: `初心者でもわかる！${keyword}の選び方`,
        steps: [
          { step: 1, title: '予算を決める', content: `${keyword}の価格帯は1万円〜5万円。用途に合わせて予算を設定しましょう。` },
          { step: 2, title: '機能を比較', content: `必要な機能をリストアップし、優先順位をつけて比較検討しましょう。` },
          { step: 3, title: 'レビューをチェック', content: `実際の利用者のレビューを確認し、購入前に最終チェックしましょう。` }
        ]
      },

      news: {
        title: `${keyword}の2024年最新トレンド`,
        trends: [
          { title: 'AI機能の進化', content: `2024年は${keyword}にAI機能が標準搭載される傾向に。` },
          { title: '環境配慮型製品の増加', content: `サステナブルな${keyword}が注目を集めています。` },
          { title: '価格の多様化', content: `エントリーモデルからハイエンドまで選択肢が拡大。` }
        ]
      }
    };

    return mockData[template] || mockData.ranking;
  }
}

// シングルトンインスタンス
const openaiService = new OpenAIService();
export default openaiService;