// src/services/api/openai.js - 動画時間修正版

import { API_CONFIG, ENV, ENDPOINTS } from '../../config/api.js';

class OpenAIService {
  constructor() {
    this.apiKey = ENV.openaiApiKey;
    this.baseURL = API_CONFIG.openai.baseURL;
    this.model = API_CONFIG.openai.model;
  }

  // 改良版プロンプト（動画時間を確実に設定）
  getVideoDesignPrompt(keyword, template, format, duration) {
    const formatSpecs = {
      short: { 
        width: 1080, 
        height: 1920, 
        aspect: '9:16縦型', 
        platform: 'TikTok/YouTube Shorts',
        maxItems: Math.min(Math.floor(duration / 5), 3), // 5秒/アイテム、最大3個
        timePerItem: Math.max(Math.floor(duration / 3), 5) // 最低5秒/アイテム
      },
      medium: { 
        width: 1920, 
        height: 1080, 
        aspect: '16:9横型', 
        platform: 'YouTube通常動画',
        maxItems: Math.min(Math.floor(duration / 10), 5), // 10秒/アイテム、最大5個
        timePerItem: Math.max(Math.floor(duration / 5), 4) // 最低4秒/アイテム
      }
    };
    
    const spec = formatSpecs[format] || formatSpecs.medium;
    
    return `あなたは動画制作のプロです。以下の指定で${template}形式の動画設計図を作成してください。

**最重要条件:**
- **動画時間**: 必ず${duration}秒（短縮不可）
- キーワード: ${keyword}
- 形式: ${spec.aspect} (${spec.width}x${spec.height})
- アイテム数: ${spec.maxItems}個
- 各アイテム表示時間: ${spec.timePerItem}秒

**時間配分の例（${duration}秒動画）:**
- タイトル表示: 0-3秒
- アイテム1: 3-${3 + spec.timePerItem}秒
- アイテム2: ${3 + spec.timePerItem}-${3 + spec.timePerItem * 2}秒
- アイテム3: ${3 + spec.timePerItem * 2}-${duration}秒
- まとめ: ${Math.max(duration - 3, duration * 0.9)}-${duration}秒

**必須JSON構造（動画時間${duration}秒）:**
\`\`\`json
{
  "title": "【2024年最新】${keyword} おすすめランキングTOP${spec.maxItems}",
  "duration": ${duration},
  "canvas": {
    "width": ${spec.width},
    "height": ${spec.height},
    "backgroundColor": "#1e3a8a,#7c3aed,#db2777"
  },
  "scenes": [
    {
      "startTime": 0,
      "endTime": 3,
      "type": "title",
      "content": {
        "mainText": "【最新版】${keyword}ランキング",
        "subText": "プロが厳選したTOP${spec.maxItems}",
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
        "name": "具体的な商品名（実在）",
        "price": "¥XX,XXX",
        "rating": 4.8,
        "features": ["特徴1", "特徴2", "特徴3"],
        "colors": {
          "rank": "#fbbf24",
          "name": "#ffffff", 
          "price": "#10b981",
          "features": "#60a5fa"
        },
        "positions": {
          "rank": {"x": ${spec.width / 2}, "y": ${format === 'short' ? 500 : 350}},
          "name": {"x": ${spec.width / 2}, "y": ${format === 'short' ? 600 : 450}},
          "price": {"x": ${spec.width / 2}, "y": ${format === 'short' ? 680 : 520}},
          "features": {"x": ${spec.width / 2}, "y": ${format === 'short' ? 750 : 580}}
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
      "name": "${keyword}の実際の商品名",
      "price": "リアルな価格",
      "rating": 4.8,
      "features": ["具体的特徴1", "具体的特徴2", "具体的特徴3"]
    }
  ],
  "metadata": {
    "seoTitle": "【2024年最新】${keyword} おすすめランキングTOP${spec.maxItems}｜プロが厳選",
    "description": "${keyword}のおすすめ商品を専門家が厳選してランキング形式で紹介。価格・性能・口コミを徹底比較した結果をお届けします。",
    "tags": ["${keyword}", "${template}", "おすすめ", "2024年", "ランキング", "比較", "レビュー"]
  }
}
\`\`\`

**重要指示:**
1. duration は必ず ${duration} に設定
2. ${keyword} の実在商品知識を活用
3. scenes配列で時間軸を正確に管理
4. ${spec.maxItems}個のアイテムを完全に表示
5. 各シーンの時間は重複しない連続性を保つ`;
  }

  // 本番ChatGPT API呼び出し（修正版）
  async generateVideoDesign(keyword, template, format = 'medium', duration = 30) {
    // 最小動画時間を保証
    const minDuration = format === 'short' ? 15 : 20;
    const safeDuration = Math.max(duration, minDuration);
    
    console.log(`🚀 AI動画設計依頼: ${keyword}, ${template}, ${format}, ${safeDuration}秒`);

    // APIキーチェック
    if (!this.apiKey) {
      console.warn('⚠️ OpenAI APIキー未設定、モックデータ使用');
      return this.getMockVideoDesign(keyword, template, format, safeDuration);
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
              content: 'あなたは動画制作のプロです。指定された時間・形式・内容で正確な動画設計図をJSON形式で作成してください。特に動画時間は指定された秒数を厳密に守ってください。'
            },
            {
              role: 'user',
              content: this.getVideoDesignPrompt(keyword, template, format, safeDuration)
            }
          ],
          max_tokens: 2500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ChatGPT API Error:', response.status, errorText);
        throw new Error(`ChatGPT API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      console.log('✅ ChatGPT APIレスポンス受信:', content.slice(0, 200) + '...');
      
      try {
        // JSON抽出と解析
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/) || [null, content];
        const jsonString = jsonMatch[1] || content;
        const parsedData = JSON.parse(jsonString);
        
        // データ整合性チェックと修正
        const validatedData = this.validateAndFixDesign(parsedData, keyword, template, format, safeDuration);
        
        console.log(`✅ AI設計図完成: ${validatedData.title} (${validatedData.duration}秒)`);
        return validatedData;
        
      } catch (parseError) {
        console.warn('⚠️ JSON解析エラー:', parseError.message);
        console.log('生のレスポンス:', content);
        return this.createFallbackDesign(keyword, template, format, safeDuration, content);
      }

    } catch (error) {
      console.error('❌ ChatGPT API呼び出しエラー:', error);
      console.log('🔄 モックデータで続行...');
      return this.getMockVideoDesign(keyword, template, format, safeDuration);
    }
  }

  // データ検証・修正機能（新機能）
  validateAndFixDesign(data, keyword, template, format, duration) {
    console.log('🔍 AI設計図検証中...');
    
    // 基本構造チェック
    if (!data.canvas) data.canvas = {};
    if (!data.scenes) data.scenes = [];
    if (!data.items) data.items = [];
    if (!data.metadata) data.metadata = {};

    // 動画時間の強制修正
    data.duration = duration;
    console.log(`⏰ 動画時間を${duration}秒に修正`);

    // Canvas設定修正
    const formatSpecs = {
      short: { width: 1080, height: 1920 },
      medium: { width: 1920, height: 1080 }
    };
    const spec = formatSpecs[format] || formatSpecs.medium;
    
    data.canvas.width = spec.width;
    data.canvas.height = spec.height;
    if (!data.canvas.backgroundColor) {
      data.canvas.backgroundColor = '#1e3a8a,#7c3aed,#db2777';
    }

    // シーン時間検証・修正
    if (data.scenes.length === 0) {
      console.warn('⚠️ シーンが空、デフォルトシーンを追加');
      data.scenes = this.createDefaultScenes(keyword, format, duration);
    } else {
      // 最後のシーンの終了時間を動画時間に合わせる
      if (data.scenes.length > 0) {
        const lastScene = data.scenes[data.scenes.length - 1];
        lastScene.endTime = duration;
        console.log(`⏰ 最終シーン終了時間を${duration}秒に調整`);
      }
    }

    // アイテムデータ検証
    if (data.items.length === 0) {
      data.items = [{
        rank: 1,
        name: `${keyword} おすすめ商品`,
        price: '¥19,800',
        rating: 4.5,
        features: ['高品質', '人気', 'おすすめ']
      }];
    }

    console.log('✅ AI設計図検証完了');
    return data;
  }

  // デフォルトシーン作成
  createDefaultScenes(keyword, format, duration) {
    const isShort = format === 'short';
    const spec = isShort ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    
    return [
      {
        startTime: 0,
        endTime: 3,
        type: 'title',
        content: {
          mainText: `${keyword} ランキング`,
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
          name: `${keyword} おすすめ商品`,
          price: '¥19,800',
          rating: 4.5,
          features: ['高品質', '人気', 'おすすめ'],
          colors: {
            rank: '#fbbf24',
            name: '#ffffff',
            price: '#10b981',
            features: '#60a5fa'
          },
          positions: {
            rank: { x: spec.width / 2, y: isShort ? 500 : 350 },
            name: { x: spec.width / 2, y: isShort ? 600 : 450 },
            price: { x: spec.width / 2, y: isShort ? 680 : 520 },
            features: { x: spec.width / 2, y: isShort ? 750 : 580 }
          },
          fontSizes: {
            rank: isShort ? 80 : 120,
            name: isShort ? 35 : 50,
            price: isShort ? 28 : 40,
            features: isShort ? 20 : 28
          }
        }
      }
    ];
  }

  // フォールバック設計（改良版）
  createFallbackDesign(keyword, template, format, duration, aiResponse) {
    console.log('🔄 フォールバック設計作成中...');
    
    const formatSpecs = {
      short: { width: 1080, height: 1920 },
      medium: { width: 1920, height: 1080 }
    };
    
    const spec = formatSpecs[format] || formatSpecs.medium;
    const isShort = format === 'short';
    
    const titleMatch = aiResponse.match(/title['":\s]+([^"',\n]+)/i);
    const extractedTitle = titleMatch ? titleMatch[1].replace(/['"]/g, '') : `【2024年最新】${keyword} おすすめランキング`;
    
    return {
      title: extractedTitle,
      duration: duration, // 指定時間を確実に使用
      canvas: {
        width: spec.width,
        height: spec.height,
        backgroundColor: '#1e3a8a,#7c3aed,#db2777'
      },
      scenes: [
        {
          startTime: 0,
          endTime: 3,
          type: 'title',
          content: {
            mainText: extractedTitle,
            fontSize: isShort ? 50 : 70,
            fontColor: '#ffffff',
            position: { x: spec.width / 2, y: isShort ? 300 : 200 }
          }
        },
        {
          startTime: 3,
          endTime: duration, // 残り時間すべて使用
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
              features: '#60a5fa'
            },
            positions: {
              rank: { x: spec.width / 2, y: isShort ? 500 : 350 },
              name: { x: spec.width / 2, y: isShort ? 600 : 450 },
              price: { x: spec.width / 2, y: isShort ? 680 : 520 },
              features: { x: spec.width / 2, y: isShort ? 750 : 580 }
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
        seoTitle: extractedTitle,
        description: `${keyword}のおすすめ商品を専門家が厳選。価格・性能・口コミを徹底比較した結果をお届けします。\n\n#${keyword} #おすすめ #ランキング`,
        tags: [keyword, template, 'おすすめ', '2024年', 'ランキング']
      }
    };
  }

  // モックデータ（開発用・フォールバック用・改良版）
  getMockVideoDesign(keyword, template, format, duration) {
    console.log(`🎭 モックデータ生成: ${keyword}, ${format}, ${duration}秒`);
    
    const formatSpecs = {
      short: { width: 1080, height: 1920 },
      medium: { width: 1920, height: 1080 }
    };
    
    const spec = formatSpecs[format] || formatSpecs.medium;
    const isShort = format === 'short';
    
    const templateConfigs = {
      ranking: {
        title: `【2024年最新】${keyword} おすすめランキングTOP3`,
        colorScheme: ['#1e3a8a', '#7c3aed', '#db2777'],
        items: [
          { rank: 1, name: `${keyword} プレミアム`, price: '¥29,800', rating: 4.8, features: ['高性能', '人気No.1', 'プロ推奨'] },
          { rank: 2, name: `${keyword} スタンダード`, price: '¥19,800', rating: 4.6, features: ['コスパ良好', '初心者向け', '安定'] },
          { rank: 3, name: `${keyword} ライト`, price: '¥12,800', rating: 4.4, features: ['お手軽', '軽量', '手頃'] }
        ]
      },
      comparison: {
        title: `${keyword} 徹底比較！どっちがおすすめ？`,
        colorScheme: ['#1e40af', '#059669', '#dc2626'],
        items: [
          { rank: 1, name: `${keyword} A`, price: '¥25,800', rating: 4.7, features: ['高機能', 'プロ仕様', '耐久性'] },
          { rank: 2, name: `${keyword} B`, price: '¥18,800', rating: 4.5, features: ['コスパ', 'シンプル', '使いやすい'] }
        ]
      },
      tutorial: {
        title: `初心者でもわかる！${keyword}の選び方`,
        colorScheme: ['#065f46', '#059669', '#10b981'],
        items: [
          { rank: 1, name: `${keyword} 選び方のポイント`, price: 'チェック項目', rating: 5.0, features: ['品質確認', '価格比較', '口コミチェック'] },
          { rank: 2, name: `${keyword} おすすめモデル`, price: '¥22,800', rating: 4.7, features: ['バランス良好', '実績あり', '満足度高'] }
        ]
      },
      news: {
        title: `${keyword}の2024年最新トレンド`,
        colorScheme: ['#7c2d12', '#dc2626', '#f59e0b'],
        items: [
          { rank: 1, name: `${keyword} 最新モデル`, price: '¥35,800', rating: 4.9, features: ['最新技術', 'トレンド', '話題沸騰'] },
          { rank: 2, name: `${keyword} 注目株`, price: '¥24,800', rating: 4.6, features: ['急上昇', '注目度大', '将来性'] }
        ]
      }
    };

    const config = templateConfigs[template] || templateConfigs.ranking;
    
    return {
      title: config.title,
      duration: duration, // 指定された時間を確実に使用
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
            subText: `専門家が厳選した${config.items.length}選`,
            fontSize: isShort ? 50 : 70,
            fontColor: '#ffffff',
            position: { x: spec.width / 2, y: isShort ? 300 : 200 }
          }
        },
        {
          startTime: 3,
          endTime: Math.floor(duration / 2) + 3,
          type: 'item',
          content: {
            rank: config.items[0].rank,
            name: config.items[0].name,
            price: config.items[0].price,
            rating: config.items[0].rating,
            features: config.items[0].features,
            colors: {
              rank: '#fbbf24',
              name: '#ffffff',
              price: '#10b981',
              features: '#60a5fa'
            },
            positions: {
              rank: { x: spec.width / 2, y: isShort ? 500 : 350 },
              name: { x: spec.width / 2, y: isShort ? 600 : 450 },
              price: { x: spec.width / 2, y: isShort ? 680 : 520 },
              features: { x: spec.width / 2, y: isShort ? 750 : 580 }
            },
            fontSizes: {
              rank: isShort ? 80 : 120,
              name: isShort ? 35 : 50,
              price: isShort ? 28 : 40,
              features: isShort ? 20 : 28
            }
          }
        },
        {
          startTime: Math.floor(duration / 2) + 3,
          endTime: duration,
          type: 'item',
          content: {
            rank: config.items[1]?.rank || 2,
            name: config.items[1]?.name || `${keyword} セカンド`,
            price: config.items[1]?.price || '¥19,800',
            rating: config.items[1]?.rating || 4.5,
            features: config.items[1]?.features || ['高品質', '人気', 'おすすめ'],
            colors: {
              rank: '#fbbf24',
              name: '#ffffff',
              price: '#10b981',
              features: '#60a5fa'
            },
            positions: {
              rank: { x: spec.width / 2, y: isShort ? 500 : 350 },
              name: { x: spec.width / 2, y: isShort ? 600 : 450 },
              price: { x: spec.width / 2, y: isShort ? 680 : 520 },
              features: { x: spec.width / 2, y: isShort ? 750 : 580 }
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
      items: config.items,
      metadata: {
        seoTitle: config.title,
        description: `${keyword}のおすすめ商品を専門家が厳選してランキング形式で紹介。価格・性能・口コミを徹底比較した結果をお届けします。\n\n#${keyword} #${template} #おすすめ #2024年 #ランキング`,
        tags: [keyword, template, 'おすすめ', '2024年', 'ランキング', '比較', 'レビュー']
      }
    };
  }

  // 後方互換性
  async generateContent(keyword, template) {
    const videoDesign = await this.generateVideoDesign(keyword, template, 'medium', 30);
    return {
      title: videoDesign.title,
      items: videoDesign.items,
      script: `${videoDesign.title}について詳しく解説します。`
    };
  }
}

const openaiService = new OpenAIService();
export default openaiService;