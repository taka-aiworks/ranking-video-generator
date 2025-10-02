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
      const content = (data.choices?.[0]?.message?.content || '').toLowerCase();
      const validCategories = ['product', 'health', 'money', 'lifestyle', 'skill'];

      // 応答文中に含まれる有効カテゴリを抽出（説明文や番号付き回答にも対応）
      for (const cat of validCategories) {
        if (content.includes(cat)) {
          console.log(`🎯 AI分野判定: "${keyword}" → ${cat}`);
          return cat;
        }
      }

      console.warn(`⚠️ 無効な分野判定: ${content.slice(0, 30)}..., デフォルト使用`);
      return 'product';

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
      // 全ジャンル共通で深掘りを促す追加要件
      generic_deep: `以下の観点を必ず含めて、具体性と再現性を高めてください：
- 冒頭3秒のフック（よくある失敗→一言の解決策）
- ターゲット明確化（誰向け/前提条件）
- 3ポイントのそれぞれに：具体例3つ・チェックリスト・頻出ミスと対策・今日からの1アクション
- クイックスタート（最短で成果を出すために今日やる1つ）
- 短期ロードマップ（7日 or 30日など段階的ステップ）
- 神話と事実（誤解を正す）
`,
      product: `「${keyword}」について、視聴維持率が上がる構成で、実際に役立つ具体的な情報を3つのポイントで解説してください。

**重要な条件:**
- 架空の人物や会社は使わない
- 具体的で実用的な情報のみ
- 初心者にわかりやすく説明
- 実在する商品・サービス・方法を紹介
- クリックしたくなる日本語タイトル（ターゲット明確、ベネフィット、数字/括弧/強調）、28〜36文字程度`,

      health: `「${keyword}」について、視聴維持率が上がる構成で、実際に効果的な方法を3つのポイントで解説してください。

**重要な条件:**
- 科学的根拠に基づいた情報
- 具体的な数字・時間・方法
- 初心者が実践しやすい内容
- 安全で現実的なアドバイス
- クリックしたくなる日本語タイトル（ターゲット明確、ベネフィット、数字/括弧/強調）、28〜36文字程度`,

      // 追加の深掘り要件（health系はより具体化）
      health_deep: `以下の観点を必ず含めて、より具体的に：
- 冒頭3秒のフック（ありがちな失敗→一言で解決策）
- 週あたりの頻度・セット数・回数・休息（例: 週3回/1部位あたり8〜12回×3セット/60〜90秒レスト）
- 1週間のサンプル計画（メニュー・曜日・所要時間）
- よくあるフォームミス3つと修正ポイント
- 器具あり/なしの代替案（自重/ゴムバンド）
- 神話と事実（間違いやすい考えを正す）
- 30日ロードマップ（初週→2週目→3〜4週目の伸ばし方）
- 1日の栄養・睡眠の最低ライン（タンパク質/体重, 睡眠時間）
`,

      money: `「${keyword}」について、視聴維持率が上がる構成で、実際に役立つ具体的な情報を3つのポイントで解説してください。

**重要な条件:**
- 架空の成功談は使わない
- 具体的な金額・時間・方法
- 初心者が始めやすい内容
- 現実的で安全な方法のみ
- クリックしたくなる日本語タイトル（ターゲット明確、ベネフィット、数字/括弧/強調）、28〜36文字程度`,

      lifestyle: `「${keyword}」について、視聴維持率が上がる構成で、実際に役立つ具体的な方法を3つのポイントで解説してください。

**重要な条件:**
- 実践的で具体的な方法
- 時短・効率化のコツ
- 初心者でも簡単にできる
- 日常生活に取り入れやすい
- クリックしたくなる日本語タイトル（ターゲット明確、ベネフィット、数字/括弧/強調）、28〜36文字程度`,

      skill: `「${keyword}」について、視聴維持率が上がる構成で、効率的な学習方法を3つのポイントで解説してください。

**重要な条件:**
- 具体的な学習時間・手順
- 初心者向けの段階的な方法
- 実際に使える学習リソース
- 挫折しにくい継続のコツ
- クリックしたくなる日本語タイトル（ターゲット明確、ベネフィット、数字/括弧/強調）、28〜36文字程度`
    };

    let basePrompt = prompts[category] || prompts.product;
    // 全ジャンルに共通の深掘り要件を付与
    basePrompt = `${basePrompt}\n\n${prompts.generic_deep}`;
    // カテゴリ個別の深掘りがあればさらに付与
    if (category === 'health') {
      basePrompt = `${basePrompt}\n\n${prompts.health_deep}`;
    }

    const jsonTemplate = `{
  "title": "",  
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
        "main": "わかりやすい説明（全体像→結論→理由の順で簡潔に）",
        "details": "深掘り解説（具体例3つ・チェックリスト・頻出ミスと対策・今日からできる1アクション）"
      }
    },
    {
      "id": 2,
      "name": "具体的なポイント2", 
      "content": {
        "main": "わかりやすい説明",
        "details": "詳細な解説と具体例（数値・頻度・場面別）"
      }
    },
    {
      "id": 3,
      "name": "具体的なポイント3",
      "content": {
        "main": "わかりやすい説明", 
        "details": "詳細な解説と具体例（メリット/デメリット・注意点・長期的効果）"
      }
    }
  ]
}`;

    return `${basePrompt}

以下のJSON形式で出力してください：
${jsonTemplate}

重要：
- タイトルは日本語で、クリックされやすい強い表現にする（ベネフィット・数字・括弧）
- items[0] は特に深掘りし、detailsに具体例3つ・チェックリストを含める
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
    
    const title = this.generateClickableTitle(keyword, category);
    
    // health × 筋トレ 初心者向けのリッチモック
    if (category === 'health' && /筋トレ|トレーニング|ワークアウト|初心者/.test(keyword)) {
      return {
        title: title,
        videoType: `${category}情報`,
        duration: duration,
        canvas: { width: spec.width, height: spec.height, backgroundColor: "#ffffff" },
        content: {
          description: `${keyword}を30日で習慣化するための最短ロードマップ`,
          structure: "フック→全体像→具体メニュー→ミス修正→ロードマップ→今日の1歩"
        },
        items: [
          {
            id: 1,
            name: "最短で結果を出す基礎（まずコレだけ）",
            content: {
              main: "週3回・8〜12回×3セット・レスト60〜90秒が最短コスパ",
              details: "具体例3つ: スクワット/腕立て/プランク（器具なし）。\n" +
                "チェックリスト: 24〜48時間空ける/最後2回がギリ/痛みは中止/フォームを鏡で確認。\n" +
                "ミスと修正: 1) 反動→ゆっくり下ろす 2) 可動域が浅い→膝/肘が伸び切らない範囲で深く 3) 呼吸止め→上げで吐く。\n" +
                "今日の1歩: スクワット10回×2セット（壁に背を向けてしゃがむと姿勢が安定）。"
            }
          },
          {
            id: 2,
            name: "1週間のサンプル計画（器具なし/あり）",
            content: {
              main: "月: 下半身/水: 上半身/金: 体幹（各15分でOK）",
              details: "器具なし: 月(スクワット/ランジ/ヒップリフト), 水(プッシュアップ/パイク/ディップ), 金(プランク/サイドプランク/バードドッグ)。\n" +
                "器具あり: 月(レッグプレス/レッグカール), 水(ラットプル/ダンベルプレス), 金(ケーブルクランチ)。\n" +
                "頻度: 週3回/各15〜20分/合計45〜60分。栄養: 体重×1.5gのタンパク質/日、睡眠7時間以上。"
            }
          },
          {
            id: 3,
            name: "30日ロードマップ（停滞しない伸ばし方）",
            content: {
              main: "1週目: フォーム固め → 2週目: 反復増 → 3〜4週目: 負荷微増",
              details: "1週目: 動作を撮影してチェック/関節痛ゼロを優先。\n" +
                "2週目: 10回×3セットが余裕なら12回まで増やす。\n" +
                "3〜4週目: 回数が伸びた種目だけ1〜2kg重く/チューブを固く。\n" +
                "神話と事実: 『毎日やるほど早く伸びる』→回復が足りず逆効果。『痛みは成長のサイン』→怪我のサイン。"
            }
          }
        ]
      };
    }

    // 分野別のより実用的なモック（特に lifestyle×子育て を強化）
    if (category === 'lifestyle' && keyword.includes('子育て')) {
      return {
        title: title,
        videoType: `${category}情報`,
        duration: duration,
        canvas: { width: spec.width, height: spec.height, backgroundColor: "#ffffff" },
        content: {
          description: `${keyword}を今日から実践できる形で解説`,
          structure: "基本→具体→コツ（短時間で続けられる）"
        },
        items: [
          {
            id: 1,
            name: "コミュニケーションを深める",
            content: {
              main: "1日5分×3回の対話・共感・笑顔の時間を作る",
              details: "具体例: 朝の" +
                "『今日の楽しみ何？』、帰宅後の『今日一番嬉しかったこと』、寝る前の読み聞かせ1話。\n" +
                "チェックリスト: 目を見る/最後まで聞く/感情を言葉にする（『そうだったんだね』）/否定しない/1つ褒める。\n" +
                "頻出ミス: 指示が多すぎる、問い詰める、スマホを見ながら話す→対策: まず共感、短い質問、結論を急がない。\n" +
                "今日からの1アクション: 食後に3分だけ『今日の良かったこと』を親子で1つずつ共有する。"
            }
          },
          {
            id: 2,
            name: "安心できるルーティンを作る",
            content: {
              main: "『起きる→食べる→遊ぶ→片付け→寝る』のシンプルな流れ",
              details: "時間帯ごとに1つだけ決める（例: 寝る前は本を1冊）。\n" +
                "具体例: 朝は『自分で服を選ぶ』、夕方は『おもちゃタイマー5分で片付け』。\n" +
                "効果: 先読みできて安心、癇癪が減る、自立が育つ。"
            }
          },
          {
            id: 3,
            name: "自己肯定感を育む",
            content: {
              main: "『できた量』ではなく『取り組み方』を褒める",
              details: "言い換え例: 『早いね』→『最後までやったね』『諦めずに試したね』。\n" +
                "家庭ルール: 失敗を笑わない、発表を遮らない、努力の途中を認める。\n" +
                "長期効果: 新しい挑戦への抵抗が減り、親子の会話量が増える。"
            }
          }
        ]
      };
    }

    // 汎用版（その他のキーワード）
    return {
      title: title,
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
            main: "初心者が知っておくべき基本（全体像→結論→理由）",
            details: "具体例3つ・チェックリスト・よくあるミスと対策・今日から1アクション"
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

  // クリックされやすい日本語タイトル生成（オフライン用簡易版）
  generateClickableTitle(keyword, category) {
    const base = keyword.replace(/について|とは/g, '').trim();
    const patterns = [
      `${base}｜今日からできる3つの実践(保存版)`,
      `${base}で失敗しないための3原則（誰でも簡単）`,
      `${base}のコツ3選［具体例付き］`,
      `${base}はコレだけ！初心者向け3ステップ`,
      `${base}で後悔しないために｜最初の3アクション`
    ];
    if (category === 'lifestyle' && keyword.includes('子育て')) {
      return `子育てがラクになる3習慣［会話・生活・自信］`;
    }
    if (category === 'health' && /筋トレ|トレーニング|ワークアウト|初心者/.test(keyword)) {
      return `筋トレ初心者の最短ロードマップ【週3×15分で変わる】`;
    }
    return patterns[base.length % patterns.length];
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