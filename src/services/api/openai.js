// src/services/api/openai.js - 面白いコンテンツ生成版

import { API_CONFIG, ENV, ENDPOINTS } from '../../config/api.js';

class OpenAIService {
  constructor() {
    this.apiKey = ENV.openaiApiKey;
    this.baseURL = API_CONFIG.openai.baseURL;
    this.model = API_CONFIG.openai.model;
  }

  // 年号を動的取得
  getCurrentYear() {
    return new Date().getFullYear();
  }

  // AI自動コンテンツタイプ判定
  async analyzeContentType(keyword) {
    if (!this.apiKey) {
      if (keyword.includes('方法') || keyword.includes('やったほうがいい')) return 'method';
      if (keyword.includes('比較') || keyword.includes('vs') || keyword.includes('どっち')) return 'comparison';
      return 'ranking';
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
            content: `"${keyword}" に最適な動画形式を選んでください：

1. "ranking" - おすすめ・ランキング・TOP3系
2. "comparison" - 比較・vs・どっち系  
3. "tutorial" - 方法・やり方・手順系
4. "explanation" - 解説・について・とは系

1つだけ回答してください。`
          }],
          max_tokens: 20,
          temperature: 0
        })
      });

      const data = await response.json();
      const result = data.choices[0].message.content.toLowerCase();
      
      if (result.includes('comparison')) return 'comparison';
      if (result.includes('tutorial')) return 'tutorial';
      if (result.includes('explanation')) return 'explanation';
      return 'ranking';
      
    } catch (error) {
      console.warn('AI判定エラー、デフォルトをrankingに設定:', error);
      return 'ranking';
    }
  }

  // 🎬 超面白いコンテンツ生成プロンプト
  async getVideoDesignPrompt(keyword, template, format, duration) {
    const formatSpecs = {
      short: { width: 1080, height: 1920 },
      medium: { width: 1920, height: 1080 }
    };
    const spec = formatSpecs[format] || formatSpecs.medium;

    return `あなたは**バズるコンテンツクリエイター**です。「${keyword}」について、視聴者が最後まで見たくなる超面白い動画を作成してください。

**🔥 バズる要素を必ず含める:**
- 刺激的なタイトル（「ヤバい」「禁断の」「絶対に」「秘密の」等）
- 具体的な数字とメリット（「30秒で」「3倍」「90%の人が知らない」）
- 意外性と驚き（「実は」「逆に」「騙されてた」）
- 緊急性（「今すぐ」「手遅れになる前に」）

**🎯 動画構成パターン例:**
1. **衝撃の事実** → **具体的な方法/商品** → **行動促進**
2. **問題提起** → **解決策3選** → **今すぐできること**
3. **失敗談** → **成功の秘訣** → **あなたも変われる**

**⚡ 制約条件:**
- 動画時間: ${duration}秒
- Canvas: ${spec.width}x${spec.height}
- 必須: タイトルに数字を含める
- 必須: 各シーンに具体的なメリット/デメリット

**出力形式:**
\`\`\`json
{
  "title": "【衝撃】${keyword}で人生が変わる!知らないとヤバい理由3選",
  "videoType": "選択した最適な形式",
  "duration": ${duration},
  "canvas": {
    "width": ${spec.width},
    "height": ${spec.height},
    "backgroundColor": "#1a1a2e,#16213e,#0f3460"
  },
  "content": {
    "description": "この動画の魅力と視聴者にとってのメリット",
    "structure": "なぜこの構成が効果的なのか"
  },
  "items": [
    {
      "id": 1,
      "type": "ショック要素",
      "name": "90%の人が知らない${keyword}の真実",
      "content": {
        "main": "具体的で衝撃的な事実",
        "details": "詳しい説明と具体例",
        "extra": "追加の驚き要素"
      }
    },
    {
      "id": 2,
      "type": "解決策",
      "name": "たった○分で効果が出る方法",
      "content": {
        "main": "具体的な手順・商品・方法",
        "details": "実際の効果・体験談",
        "extra": "さらなるメリット"
      }
    },
    {
      "id": 3,
      "type": "行動促進",
      "name": "今すぐやらないと後悔する理由",
      "content": {
        "main": "緊急性のある理由",
        "details": "具体的な行動ステップ",
        "extra": "成功した未来の姿"
      }
    }
  ],
  "scenes": [
    {
      "startTime": 0,
      "endTime": ${Math.floor(duration * 0.25)},
      "type": "衝撃の導入",
      "content": {
        "mainText": "【警告】${keyword}について知らないとヤバい！",
        "subText": "90%の人が間違っている事実を暴露",
        "announcement": "まず最初に衝撃の事実をお伝えします",
        "visualStyle": "赤色警告・緊急感演出"
      }
    },
    {
      "startTime": ${Math.floor(duration * 0.25)},
      "endTime": ${Math.floor(duration * 0.7)},
      "type": "解決策提示",
      "content": {
        "mainText": "実は○○するだけで全て解決！",
        "subText": "具体的な方法・商品・手順を公開",
        "announcement": "ここからが本当に重要なポイントです",
        "visualStyle": "希望的・明るい色調"
      }
    },
    {
      "startTime": ${Math.floor(duration * 0.7)},
      "endTime": ${duration},
      "type": "行動促進",
      "content": {
        "mainText": "今すぐ行動しないと手遅れに！",
        "subText": "成功する人と失敗する人の違い",
        "announcement": "あなたの人生を変えるチャンスです",
        "visualStyle": "キラキラ・成功感演出"
      }
    }
  ]
}
\`\`\`

**重要**: 「${keyword}」の特性を活かし、視聴者が「見て良かった」「シェアしたい」と思える価値ある内容にしてください。`
  }

  // 本番ChatGPT API呼び出し
  async generateVideoDesign(keyword, template, format = 'medium', duration = 30) {
    console.log(`🚀 超面白いAI動画設計: ${keyword}, ${format}, ${duration}秒`);

    if (!this.apiKey) {
      console.warn('⚠️ APIキー未設定、面白いモックデータ使用');
      return this.getEngagingMockVideoDesign(keyword, format, duration);
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
              content: '面白くてバズる動画設計図をJSON形式で作成する専門家です。'
            },
            {
              role: 'user',
              content: await this.getVideoDesignPrompt(keyword, template, format, duration)
            }
          ],
          max_tokens: 2000,
          temperature: 0.8 // 創造性を高める
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
      
      console.log(`✅ 超面白いAI設計図完成: ${result.title}`);
      return result;

    } catch (error) {
      console.error('❌ API呼び出しエラー:', error);
      return this.getEngagingMockVideoDesign(keyword, format, duration);
    }
  }

  // 面白いモックデータ
  getEngagingMockVideoDesign(keyword, format, duration) {
    const spec = format === 'short' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };

    return {
      title: `【衝撃】${keyword}で人生激変！99%が知らない秘密3選`,
      videoType: "衝撃バズ型",
      duration: duration,
      canvas: {
        width: spec.width,
        height: spec.height,
        backgroundColor: '#ff1744,#f50057,#e91e63'
      },
      content: {
        description: `${keyword}について、多くの人が知らない衝撃的な真実と、人生を変える具体的な方法を暴露します。`,
        structure: "衝撃→解決策→行動促進の黄金パターンで、最後まで視聴されやすい構成にしています。"
      },
      items: [
        {
          id: 1,
          type: "衝撃事実",
          name: `99%の人が知らない${keyword}の真実`,
          content: {
            main: "一般常識と真逆の衝撃的事実",
            details: "具体的なデータと実例で証明",
            extra: "この事実を知らないと損をし続ける"
          }
        },
        {
          id: 2,
          type: "秘密の方法",
          name: `たった30秒で${keyword}が10倍効果的になる方法`,
          content: {
            main: "プロだけが知っている裏技",
            details: "今すぐ実践できる具体的手順",
            extra: "実際に試した人の驚きの結果"
          }
        },
        {
          id: 3,
          type: "人生激変",
          name: `${keyword}で人生が変わった人の共通点`,
          content: {
            main: "成功者だけが実践している秘密",
            details: "あなたも今日から変われる理由",
            extra: "行動しないと一生後悔する"
          }
        }
      ],
      scenes: [
        {
          startTime: 0,
          endTime: Math.floor(duration * 0.3),
          type: "衝撃導入",
          content: {
            mainText: `【警告】${keyword}で騙されてませんか？`,
            subText: "99%の人が知らない衝撃の真実",
            announcement: "この動画を見ないと一生損します"
          }
        },
        {
          startTime: Math.floor(duration * 0.3),
          endTime: Math.floor(duration * 0.7),
          type: "秘密暴露",
          content: {
            mainText: "プロが絶対教えない裏技公開！",
            subText: "たった30秒で効果10倍の方法",
            announcement: "ここからが本当に重要です"
          }
        },
        {
          startTime: Math.floor(duration * 0.7),
          endTime: duration,
          type: "行動促進",
          content: {
            mainText: "今すぐやらないと一生後悔！",
            subText: "成功する人としない人の決定的違い",
            announcement: "あなたの人生が今日から変わります"
          }
        }
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