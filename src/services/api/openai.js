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
      // OpenAI API呼び出しエラー（CORSは想定内）
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
      // Viteプロキシ経由で呼び出し
      const response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `"${keyword}" は以下のどの分野ですか？1つだけ選んで回答してください：

1. sexed - 性教育・性の雑学・避妊・性感染症・生理・妊娠
2. product - 商品おすすめ・比較・レビュー・ランキング
3. health - 筋トレ・ダイエット・健康・美容・運動
4. money - 副業・投資・節約・転職・お金・ビジネス
5. lifestyle - 子育て・料理・掃除・生活・趣味
6. skill - 勉強・スキル・プログラミング・学習・資格

回答例: sexed`
          }],
          max_tokens: 10,
          temperature: 0
        })
      });

      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || '').toLowerCase();
      const validCategories = ['sexed', 'product', 'health', 'money', 'lifestyle', 'skill'];

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
    
    // 🆕 性教育キーワード（過激な内容も含む）
    if (lower.match(/性|セックス|避妊|コンドーム|ピル|性感染症|生理|月経|妊娠|中絶|性交|性行為|性器|性欲|射精|体位|性病|HIV|エイズ|包茎|早漏|ED|勃起|オーガズム|イク|オナ禁|オナニー|マスターベーション|精子|精液|ザーメン|テストステロン|ホルモン|性的|セックスレス|性生活|性機能|性能力|勃起不全|射精障害/)) {
      return 'sexed';
    }
    
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
    const spec = formatSpecs[format] || formatSpecs.short; // デフォルトはshort
    
    // 🎯 修正：ショート動画の場合、60秒を上限にする
    const actualDuration = format === 'short' ? Math.min(duration, 60) : duration; // shortは最大60秒
    
    // 読み上げ速度を考慮した適切なテキスト量を計算（10文字/秒に変更）
    const targetCharCount = Math.floor(actualDuration * 10 * 0.8); // さらに短く（0.8倍）
    const detailsPerItem = Math.floor((targetCharCount - 80) / 3); // タイトルなど80文字を引いて3等分

    const diversityRules = `多様性ルール（厳守）:\n- 各文の主題を必ず変える（例: 指標/時間/確率/頻度/安全/コスト/年齢差/環境/パフォーマンス/ライフハック）\n- 同じ観点の言い換えは禁止（内容重複NG）\n- 数字・時間・%・期間は毎文で異なる具体値を使う\n\n出力条件:\n- 1文25-40文字の自然な日本語\n- 必ず具体的な数字/時間/%/期間を含む\n- 文末に超短い行動（5-10字）を「→」で付ける（例: 「→水500ml」「→ピル相談」「→睡眠7h」）`;

    const prompts = {
      sexed: `「${keyword}」について、誰も教えてくれない本当に知りたい性の知識を紹介してください。\n\n${diversityRules}\n\n参考観点（例、全てを網羅不要・重複禁止）:\n- ホルモン（テストステロン/プロラクチン）\n- 回復時間/間隔（24-72時間/年齢差）\n- 睡眠の質、深い眠りの開始時刻\n- 栄養（亜鉛/ビタミンD/オメガ3/水分）\n- 安全性/避妊/性感染症の実効率\n- メンタル/集中/意思決定\n- パフォーマンス（消費kcal/心拍）`,
      health: `「${keyword}」について、エビデンスに基づく実践的な健康知識を紹介してください。\n\n${diversityRules}\n\n参考観点: 負荷/回数/頻度/休息/栄養/睡眠/有酸素/筋力/柔軟/ケガ予防/コスト`,
      money: `「${keyword}」について、再現性のあるお金の知識を紹介してください。\n\n${diversityRules}\n\n参考観点: 期待利回り/ドローダウン/貯蓄率/固定費/変動費/税/手数料/分散/時間分散/副業時間`,
      lifestyle: `「${keyword}」について、今日から使える生活の実用知識を紹介してください。\n\n${diversityRules}\n\n参考観点: 時短/習慣/家事/睡眠/食事/整理/衛生/安全/家計/子育て`,
      skill: `「${keyword}」について、短期で上達する学習の実践知を紹介してください。\n\n${diversityRules}\n\n参考観点: 学習時間/反復間隔/ミス率/練習量/難易度調整/睡眠/復習/環境`,
      product: `「${keyword}」について、失敗しない選び方・使い方を紹介してください。\n\n${diversityRules}\n\n参考観点: 価格/コスパ/耐久/保証/代替/比較/使い方/保守/レビュー偏り`
    };

    let basePrompt = prompts[category] || prompts.lifestyle;
    if (format !== 'short') {
      basePrompt = `${basePrompt}\n\n${prompts.generic_deep}`;
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
      "text": "自然な1文（25-40文字、必ず具体的な数字・時間・%入り）"
    }
  ]
}`;

    return `${basePrompt}\n\n以下のJSON形式で出力してください：\n${jsonTemplate}`;
  }

  // メイン生成関数
  async generateVideoDesign(keyword, template, format = 'short', duration = 40) {
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

      // Viteプロキシ経由でAPI呼び出し
      const prompt = this.getCategoryPrompt(keyword, category, format, duration);
      
      const response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `あなたは${category}分野の専門家です。ショート動画用の超簡潔で具体的、そして**誰も教えてくれない本当に知りたい情報**を提供してください。

**必須フォーマット（絶対厳守）:**
各itemsには "text" フィールドのみ。自然な1文で具体的な情報を書く。文末に超短い行動（5-10字）を「→」で付ける（例: 「→水500ml」「→睡眠7h」「→ピル相談」）。

**良い例（性教育の場合）:**
{
  "text": "オナ禁7日でテストステロン45%上昇、14日でピーク→睡眠7h"
}
{
  "text": "射精後30分でプロラクチン分泌が始まり深い眠り→光遮断"
}
{
  "text": "精子は48-72時間で完全回復、亜鉛で20%早まる→水500ml"
}
{
  "text": "性行為1回で150-200kcal消費、心拍120前後→散歩10分"
}

**悪い例（絶対ダメ）:**
{
  "text": "コンドームは99%の避妊効果がある"  ← 薄すぎ、数値以外の具体性なし
}
{
  "text": "性行為で感染リスクが高い"  ← 当たり前、「高い」は抽象的
}
{
  "text": "排尿で尿路感染症リスクを低減できる"  ← 数字・時間がない
}

**絶対に守ること:**
- 必ず具体的な数字・時間・%・期間を入れる
- 「重要」「大切」「適切な」「高い」「低い」などの抽象語は禁止
- 1文に複数の具体的情報を詰め込む
- タブー視されがちだけど知りたい内容を優先
- 当たり前の教科書的内容は絶対NG
- 25-40文字の自然な文章\n- 文末に行動（例: 「→水500ml」）`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.35  // 多少の多様性を許容
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

      // 🆕 多様性の後処理：重複・類似の文を間引く
      const dedup = (items) => {
        if (!Array.isArray(items)) return [];
        const seenSignatures = new Set();
        const cleaned = [];
        for (const it of items) {
          const text = (it.text || `${it.name || ''} ${it.main || ''}`).trim();
          if (!text) continue;
          // 数字・記号を除去し、主要単語のシグネチャを作成（ひらがな/カタカナ/漢字/英字）
          const core = text
            .replace(/[0-9０-９%％\.\-\+\,\s]/g, '')
            .replace(/[。、「」『』（）()\[\]]/g, '')
            .toLowerCase();
          // 上位の特徴語を粗く抽出
          const signature = core.slice(0, 12); // 先頭12文字で近似
          if (seenSignatures.has(signature)) continue;
          seenSignatures.add(signature);
          cleaned.push({ text });
        }
        return cleaned;
      };

      if (Array.isArray(result.items)) {
        const diversified = dedup(result.items);
        // 3件未満なら元を補完（最低3件確保）
        if (diversified.length >= 3) {
          result.items = diversified;
        }
      }
      
      // デバッグ：itemsの中身を確認
      console.log('🔍 AIレスポンス確認:', {
        title: result.title,
        itemsCount: result.items?.length,
        sample: result.items?.slice(0, 5)
      });
      
      result.duration = duration;
      result.category = category;
      
      console.log(`✅ 実用的AI設計図完成: ${category} - ${result.title}`);
      return result;

    } catch (error) {
      console.error('❌ 実用的生成エラー:', error);
      console.error('❌ エラー詳細:', error.message);
      console.error('❌ スタック:', error.stack);
      const fallbackCategory = this.detectCategoryOffline(keyword);
      console.warn('⚠️ モックデータにフォールバック:', { keyword, category: fallbackCategory });
      return this.getRealisticMockData(keyword, fallbackCategory, format, duration);
    }
  }

  // 既存スクリプトを深掘りして具体性・数値を強化
  async refineVideoDesign(keyword, existingDesign, format = 'short', duration = 40) {
    try {
      const items = existingDesign?.items || [];
      const compactList = items.map((it, idx) => {
        const text = it.text || `${it.name || ''} ${it.main || ''}`.trim();
        return `${idx + 1}. ${text}`;
      }).join('\n');

      const systemPrompt = `あなたは${existingDesign?.category || 'sexed'}分野の専門家です。既存の文を、教育的で科学的に正確に、さらに踏み込んで具体化してください。\n- 抽象語は使わない（重要/適切/高い/低い等）\n- 必ず具体的な数字・時間・%・期間を入れる\n- 各文の主題を変える（重複禁止）\n- 文末に超短い行動（5-10字）を「→」で付ける（例: 「→水500ml」「→睡眠7h」「→ピル相談」）\n- 危険行為の助長や扇情的表現は禁止\n- 1文25-40文字で自然な日本語\n- 出力はJSONのitems配列のみ（各要素は {"text": "..."} ）`;

      const userPrompt = `キーワード: ${keyword}\n既存文:\n${compactList}\n\n要件:\n- 重複を避け、情報密度を上げる\n- 曖昧表現を数値に置換\n- 文末に1アクションを追加（「→水500ml」など）\n- 誤解を招く表現は修正\n- 同じ項目数で返す`;

      const response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1200,
          temperature: 0.1
        })
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      let refined;
      try { refined = JSON.parse(jsonString); } catch (e) {
        // items配列のみを期待
        refined = { items: [] };
      }

      const refinedItems = Array.isArray(refined) ? refined : refined.items;
      if (!Array.isArray(refinedItems)) throw new Error('Invalid refine response');

      const newDesign = { ...existingDesign };
      newDesign.items = refinedItems.map((it) => ({ text: it.text?.trim?.() || '' }));
      newDesign.duration = duration;
      newDesign.category = 'sexed';
      console.log('✅ 深掘り完了 items:', newDesign.items);
      return newDesign;
    } catch (error) {
      console.error('❌ 深掘り失敗:', error);
      return existingDesign;
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
    
    // カテゴリー別の専門的なパターン
    const categoryPatterns = {
      sexed: [
        `${base}｜正しい知識と実践方法【医学的根拠】`,
        `${base}の真実｜科学的に正しい3つの方法`,
        `${base}で失敗しない｜安全性を最優先した解説`,
        `${base}｜専門家が教える正確な知識【保存版】`
      ],
      health: [
        `${base}｜科学的に効果的な3つの方法【最新研究】`,
        `${base}の最短ロードマップ【具体的手順】`,
        `${base}｜医学的根拠のある実践法【専門家監修】`
      ],
      lifestyle: [
        `${base}｜今日から変わる3つの習慣【実践編】`,
        `${base}で人生を変える｜具体的ステップ解説`
      ],
      money: [
        `${base}｜現実的な方法3選【失敗しない】`,
        `${base}の真実｜専門家が教える安全な始め方`
      ]
    };
    
    // カテゴリー固有のパターンがあればそれを使う
    if (categoryPatterns[category]) {
      const patterns = categoryPatterns[category];
      return patterns[base.length % patterns.length];
    }
    
    // デフォルトパターン（「雑学」「豆知識」を避ける）
    const patterns = [
      `${base}｜今日からできる3つの実践【保存版】`,
      `${base}で失敗しないための3原則【具体例付き】`,
      `${base}の真実｜専門家が教える正しい方法`,
      `${base}はコレだけ！初心者向け3ステップ【実践編】`,
      `${base}で後悔しないために｜最初の3アクション`
    ];
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