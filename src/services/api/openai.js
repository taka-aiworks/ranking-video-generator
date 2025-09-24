// src/services/api/openai.js - 本番API統合版

import { API_CONFIG, ENV, ENDPOINTS } from '../../config/api.js';

class OpenAIService {
  constructor() {
    this.apiKey = ENV.openaiApiKey;
    this.baseURL = API_CONFIG.openai.baseURL;
    this.model = API_CONFIG.openai.model;
  }

  // 本番用プロンプト（より具体的で実用的）
  getVideoDesignPrompt(keyword, template, format, duration) {
    const formatSpecs = {
      short: { 
        width: 1080, 
        height: 1920, 
        aspect: '9:16縦型', 
        platform: 'TikTok/YouTube Shorts',
        maxItems: 3,
        timePerItem: Math.floor(duration / 3)
      },
      medium: { 
        width: 1920, 
        height: 1080, 
        aspect: '16:9横型', 
        platform: 'YouTube通常動画',
        maxItems: 5,
        timePerItem: Math.floor(duration / 5)
      }
    };
    
    const spec = formatSpecs[format] || formatSpecs.medium;
    
    return `あなたは動画制作のプロです。以下のキーワードで${template}形式の動画設計図を作成してください。

**基本条件:**
- キーワード: ${keyword}
- 形式: ${spec.aspect} (${spec.width}x${spec.height})
- 時間: ${duration}秒
- プラットフォーム: ${spec.platform}
- アイテム数: ${spec.maxItems}個

**出力ルール:**
1. 必ずJSON形式のみで返答
2. 実在する商品名・価格を想定
3. ${spec.platform}に最適化された色彩・レイアウト
4. ${template}の特徴を活かした構成

**必須JSON構造:**
\`\`\`json
{
  "title": "動画タイトル（具体的でSEO最適化済み）",
  "duration": ${duration},
  "canvas": {
    "width": ${spec.width},
    "height": ${spec.height},
    "backgroundColor": "色1,色2,色3"
  },
  "scenes": [
    {
      "startTime": 0,
      "endTime": 3,
      "type": "title",
      "content": {
        "mainText": "インパクトあるタイトル",
        "fontSize": ${format === 'short' ? 50 : 70},
        "fontColor": "#ffffff",
        "position": {"x": ${spec.width / 2}, "y": ${format === 'short' ? 300 : 200}}
      }
    },
    {
      "startTime": 3,
      "endTime": ${3 + spec.timePerItem},
      "type": "item",
      "content": {
        "rank": 1,
        "name": "実在する商品名",
        "price": "¥XX,XXX",
        "rating": 4.5,
        "features": ["特徴1", "特徴2", "特徴3"],
        "colors": {
          "rank": "#fbbf24",
          "name": "#ffffff",
          "price": "#10b981",
          "features": "#10b981"
        },
        "positions": {
          "rank": {"x": ${spec.width / 2}, "y": ${format === 'short' ? 500 : 350}},
          "name": {"x": ${spec.width / 2}, "y": ${format === 'short' ? 600 : 450}},
          "price": {"x": ${spec.width / 2}, "y": ${format === 'short' ? 650 : 500}},
          "features": {"x": ${spec.width / 2}, "y": ${format === 'short' ? 700 : 550}}
        },
        "fontSizes": {
          "rank": ${format === 'short' ? 80 : 120},
          "name": ${format === 'short' ? 35 : 50},
          "price": ${format === 'short' ? 28 : 40},
          "features": ${format === 'short' ? 20 : 28}
        }
      }
    }
  ],
  "items": [
    {
      "rank": 1,
      "name": "具体的な商品名",
      "price": "¥XX,XXX",
      "rating": 4.5,
      "features": ["具体的特徴1", "具体的特徴2", "具体的特徴3"]
    }
  ],
  "metadata": {
    "seoTitle": "SEO最適化タイトル",
    "description": "YouTube説明文",
    "tags": ["${keyword}", "${template}", "おすすめ", "2024年", "ランキング"]
  }
}
\`\`\`

**重要:** ${keyword}に関する実際の知識を使って、リアルな商品名・価格・特徴を生成してください。`;
  }

  // 本番ChatGPT API呼び出し
  async generateVideoDesign(keyword, template, format = 'medium', duration = 30) {
    // APIキーチェック
    if (!this.apiKey) {
      console.warn('OpenAI APIキーが設定されていません。モックデータを使用します。');
      return this.getMockVideoDesign(keyword, template, format, duration);
    }

    console.log('🚀 ChatGPT APIに動画設計を依頼中...', { keyword, template, format, duration });

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
              content: 'あなたは動画制作のプロフェッショナルです。与えられたキーワードに基づいて、実用的で魅力的な動画設計図をJSONで作成してください。実在する商品知識を活用し、視聴者にとって価値ある内容にしてください。'
            },
            {
              role: 'user',
              content: this.getVideoDesignPrompt(keyword, template, format, duration)
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ChatGPT API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      console.log('✅ ChatGPT APIレスポンス受信:', content.slice(0, 200) + '...');
      
      try {
        // JSONを抽出（```json ``` で囲まれている場合も対応）
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/) || [null, content];
        const jsonString = jsonMatch[1] || content;
        
        const parsedData = JSON.parse(jsonString);
        
        // 必要なフィールドをチェック
        if (!parsedData.canvas || !parsedData.scenes || !parsedData.items) {
          throw new Error('必要なフィールドが不足しています');
        }
        
        console.log('✅ JSON解析成功:', parsedData.title);
        return parsedData;
        
      } catch (parseError) {
        console.warn('JSON解析エラー:', parseError.message);
        console.log('生のレスポンス:', content);
        
        // フォールバック: 部分的にAI情報を使用
        return this.createFallbackDesign(keyword, template, format, duration, content);
      }

    } catch (error) {
      console.error('ChatGPT API呼び出しエラー:', error);
      
      // ネットワークエラー等の場合はモックデータで続行
      console.log('モックデータで続行します...');
      return this.getMockVideoDesign(keyword, template, format, duration);
    }
  }

  // フォールバック設計（AIレスポンスを部分活用）
  createFallbackDesign(keyword, template, format, duration, aiResponse) {
    console.log('フォールバック設計を作成中...');
    
    const formatSpecs = {
      short: { width: 1080, height: 1920 },
      medium: { width: 1920, height: 1080 }
    };
    
    const spec = formatSpecs[format] || formatSpecs.medium;
    const isShort = format === 'short';
    
    // AIレスポンスからタイトルを抽出
    const titleMatch = aiResponse.match(/title['":\s]+([^"',\n]+)/i);
    const extractedTitle = titleMatch ? titleMatch[1].replace(/['"]/g, '') : `${keyword} おすすめ情報`;
    
    return {
      title: extractedTitle,
      duration: duration,
      canvas: {
        width: spec.width,
        height: spec.height,
        backgroundColor: "#1e3a8a,#7c3aed,#db2777"
      },
      scenes: [
        {
          startTime: 0,
          endTime: 3,
          type: "title",
          content: {
            mainText: extractedTitle,
            fontSize: isShort ? 50 : 70,
            fontColor: "#ffffff",
            position: { x: spec.width / 2, y: isShort ? 300 : 200 }
          }
        },
        {
          startTime: 3,
          endTime: duration,
          type: "item",
          content: {
            rank: 1,
            name: `${keyword} おすすめ商品`,
            price: "¥19,800",
            rating: 4.5,
            features: ["高品質", "人気", "おすすめ"],
            colors: {
              rank: "#fbbf24",
              name: "#ffffff",
              price: "#10b981",
              features: "#10b981"
            },
            positions: {
              rank: { x: spec.width / 2, y: isShort ? 500 : 350 },
              name: { x: spec.width / 2, y: isShort ? 600 : 450 },
              price: { x: spec.width / 2, y: isShort ? 650 : 500 },
              features: { x: spec.width / 2, y: isShort ? 700 : 550 }
            },
            fontSizes: {
              rank: isShort ? 80 : 120,
              name: isShort ? 35 : 50,
              price: isShort ? 28 : 40,
              features: isShort ? 20 : 28
            }
          }
        }
      ],
      items: [
        {
          rank: 1,
          name: `${keyword} おすすめ商品`,
          price: "¥19,800",
          rating: 4.5,
          features: ["高品質", "人気", "おすすめ"]
        }
      ],
      metadata: {
        seoTitle: extractedTitle,
        description: `${keyword}のおすすめ情報をお届けします。\n\n#${keyword} #おすすめ #ランキング`,
        tags: [keyword, template, "おすすめ", "2024年"]
      }
    };
  }

  // モックデータ（開発用・フォールバック用）
  getMockVideoDesign(keyword, template, format, duration) {
    const formatSpecs = {
      short: { width: 1080, height: 1920 },
      medium: { width: 1920, height: 1080 }
    };
    
    const spec = formatSpecs[format] || formatSpecs.medium;
    const isShort = format === 'short';
    
    const templateConfigs = {
      ranking: {
        title: `【2024年最新】${keyword} おすすめランキングTOP5`,
        colorScheme: ['#1e3a8a', '#7c3aed', '#db2777']
      },
      comparison: {
        title: `${keyword} 徹底比較！どっちがおすすめ？`,
        colorScheme: ['#1e40af', '#059669', '#dc2626']
      },
      tutorial: {
        title: `初心者でもわかる！${keyword}の選び方`,
        colorScheme: ['#065f46', '#059669', '#10b981']
      },
      news: {
        title: `${keyword}の2024年最新トレンド`,
        colorScheme: ['#7c2d12', '#dc2626', '#f59e0b']
      }
    };

    const config = templateConfigs[template] || templateConfigs.ranking;
    
    return {
      title: config.title,
      duration: duration,
      canvas: {
        width: spec.width,
        height: spec.height,
        backgroundColor: config.colorScheme.join(',')
      },
      scenes: [
        {
          startTime: 0,
          endTime: 3,
          type: 'title',
          content: {
            mainText: config.title,
            fontSize: isShort ? 50 : 70,
            fontColor: '#ffffff',
            position: { x: spec.width / 2, y: isShort ? 300 : 200 }
          }
        },
        {
          startTime: 3,
          endTime: duration,
          type: 'item',
          content: {
            rank: 1,
            name: `${keyword} プレミアム`,
            price: '¥29,800',
            rating: 4.8,
            features: ['高性能', '人気No.1', 'プロ推奨'],
            colors: {
              rank: '#fbbf24',
              name: '#ffffff',
              price: '#10b981',
              features: '#10b981'
            },
            positions: {
              rank: { x: spec.width / 2, y: isShort ? 500 : 350 },
              name: { x: spec.width / 2, y: isShort ? 600 : 450 },
              price: { x: spec.width / 2, y: isShort ? 650 : 500 },
              features: { x: spec.width / 2, y: isShort ? 700 : 550 }
            },
            fontSizes: {
              rank: isShort ? 80 : 120,
              name: isShort ? 35 : 50,
              price: isShort ? 28 : 40,
              features: isShort ? 20 : 28
            }
          }
        }
      ],
      items: [
        {
          rank: 1,
          name: `${keyword} プレミアム`,
          price: '¥29,800',
          rating: 4.8,
          features: ['高性能', '人気No.1', 'プロ推奨']
        }
      ],
      metadata: {
        seoTitle: config.title,
        description: `${keyword}のおすすめ情報を専門家が解説。\n\n#${keyword} #${template} #おすすめ #2024年`,
        tags: [keyword, template, 'おすすめ', '2024年', 'ランキング']
      }
    };
  }

  // 後方互換性
  async generateContent(keyword, template) {
    const videoDesign = await this.generateVideoDesign(keyword, template);
    return {
      title: videoDesign.title,
      items: videoDesign.items,
      script: `${videoDesign.title}について詳しく解説します。`
    };
  }
}

const openaiService = new OpenAIService();
export default openaiService;