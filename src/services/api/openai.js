// src/services/api/openai.js - createCompletionメソッド追加版

import { API_CONFIG, ENV, ENDPOINTS } from '../../config/api.js';

class OpenAIService {
  constructor() {
    this.apiKey = ENV.openaiApiKey;
    this.baseURL = API_CONFIG.openai.baseURL;
    this.model = API_CONFIG.openai.model;
  }

  // === Historical figure detection (lightweight, offline-safe) ===
  isLikelyPersonName(keyword) {
    if (!keyword || typeof keyword !== 'string') return false;
    const k = keyword.trim();
    if (k.length === 0) return false;
    // Heuristics:
    // - Contains middle dot or space separating tokens (e.g., "坂本 龍馬", "フローレンス・ナイチンゲール")
    // - Two or more Kanji clusters possibly separated by space/・
    // - Latin name with a space (e.g., "Albert Einstein")
    const hasSeparator = /[・·・\s]/.test(k);
    const latinFullName = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(k);
    const kanjiName = /[一-龥]{2,}(?:[・\s][一-龥]{1,})+/.test(k);
    const katakanaName = /[ァ-ヴー]{2,}(?:[・\s][ァ-ヴー]{2,})+/.test(k);
    // Dynamic name hints from localStorage (comma-separated or JSON array), with safe fallback
    const defaultHints = [
      '徳川','織田','豊臣','聖徳','紫式部','清少納言','坂本','西郷','渋沢','与謝野','夏目',
      '孔子','韓非','プラトン','アリストテレス','ナポレオン','リンカーン','キュリー','エジソン','テスラ','ダ・ヴィンチ','ナイチンゲール'
    ];
    let dynamicHints = [];
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('historical_name_hints') : null;
      if (raw) {
        if (raw.trim().startsWith('[')) dynamicHints = JSON.parse(raw);
        else dynamicHints = raw.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch (_) { /* ignore parse errors */ }
    const allHints = (Array.isArray(dynamicHints) && dynamicHints.length > 0) ? dynamicHints : defaultHints;
    const escaped = allHints
      .filter(v => typeof v === 'string' && v.trim().length > 0)
      .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const hintsRegex = escaped.length ? new RegExp(`(${escaped.join('|')})`, 'u') : null;
    return (
      latinFullName ||
      kanjiName ||
      katakanaName ||
      (hasSeparator && /[\p{L}\p{Script=Han}\p{Script=Katakana}]/u.test(k)) ||
      (hintsRegex ? hintsRegex.test(k) : false)
    );
  }

  // === Historical figure prompt builders ===
  buildHistoricalSystemPrompt() {
    return (
      'あなたは日本語の教育系YouTube台本ライターです。対象は小学生〜社会人。\n\n' +
      '【重要】人物の実際の業績を具体的に説明:\n' +
      '- 何をしたか: 具体的な数字・年代・場所を含めて説明（例: 「604年に十七条憲法を制定」）\n' +
      '- なぜすごいか: 当時の問題をどう解決したかを具体例で説明（例: 「豪族間の争いを減らすため、話し合いを重視する17の原則を作った」）\n' +
      '- 今でも使える: 現代の具体例で応用を説明（例: 「会社の会議で多数決の前に全員が意見を言う時間を作る」）\n\n' +
      '制約:\n' +
      '- 各スライドは120〜180文字、2〜3文で完結\n' +
      '- 「すごい」「重要」「偉大」などの抽象語は禁止\n' +
      '- 具体的な業績→問題解決→現代への応用の流れで書く\n' +
      '- 小学生でも「あ、これ知ってる！」と思える身近な例を必ず入れる\n' +
      '- 出力は指定のJSONのみ'
    );
  }

  buildHistoricalUserPrompt(name, format, duration) {
    const spec = format === 'medium' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
    const dur = Math.min(Math.max(180, duration || 240), 360); // clamp 180-360s
    return (
`${name}について、小学生でもわかる「今でも使える考え方・方法」を具体例で説明する動画台本を作成してください。\n\n【重要】${name}の実際の業績から「今でも使える考え方・方法」を抽出:\n- 何をしたか（具体的な業績・作品・発明・改革など）\n- なぜそれがすごいのか（当時の問題をどう解決したか）\n- 今でも使える考え方・方法（現代の具体例で説明）\n\n制約:\n- 各items[].textは120〜180文字、2〜3文\n- 「すごい」「重要」「偉大」などの抽象語は禁止\n- ${name}の実際の業績を基に説明\n- 小学生でも「あ、これ知ってる！」と思える身近な例を必ず入れる\n\n出力(JSON):\n{\n  "title": "${name}｜今でも使える考え方・方法",\n  "videoType": "解説",\n  "duration": ${dur},\n  "canvas": { "width": ${spec.width}, "height": ${spec.height}, "backgroundColor": "#ffffff" },\n  "content": {\n    "description": "${name}の業績から「今でも使える考え方・方法」を具体例で解説。昔の知恵が現代でも役立つ理由を小学生でもわかるように説明します。",\n    "structure": "業績①→業績②→業績③→考え方①→考え方②→考え方③→現代への応用→まとめ"\n  },\n  "items": [\n    { "type": "item", "text": "業績①: ${name}の具体的な業績。年代・数字・場所を含め、当時の背景と問題を一言で説明。例: 「604年に十七条憲法を制定。豪族間の争いが絶えない中、話し合いを重視する17の原則を作った。」" },\n    { "type": "item", "text": "業績②: ${name}が解決した問題。何をどうやって解決したか、結果も含める。例: 「冠位十二階で実力主義を導入。家柄だけで決まっていた地位を、能力で決める仕組みに変えた。」" },\n    { "type": "item", "text": "業績③: ${name}の代表的な作品・発明・改革。何が新しかったか、どう変わったかを説明。例: 「遣隋使を派遣し、中国から最新技術を学んだ。仏教・建築・行政システムを取り入れた。」" },\n    { "type": "item", "text": "考え方①: ${name}の思考法・仕事術。観察→仮説→実行→検証の流れなど、再現可能な手順を説明。例: 「問題を観察→原因を特定→解決策を試す→結果を確認。この流れで改革を進めた。」" },\n    { "type": "item", "text": "考え方②: ${name}の問題解決法。困難な状況をどう乗り越えたかを具体例で説明。例: 「反対派を説得するため、まず小さな成功例を作り、効果を見せてから全体に広げた。」" },\n    { "type": "item", "text": "考え方③: ${name}の学習法・成長法。どうやって能力を身につけたかを説明。例: 「中国の書物を読み、現地の専門家に学び、実際に試して失敗から学んだ。」" },\n    { "type": "item", "text": "現代への応用: ${name}の考え方を今の生活・仕事・勉強にどう活かせるか。具体的な行動例を提示。例: 「会議で多数決の前に全員が意見を言う時間を作る。これで見落としを減らせる。」" },\n    { "type": "summary", "text": "まとめ: ${name}の知恵は今でも使える。今日から試せる具体的な方法を一つ提案し、視聴者の次の一歩を促す。例: 「${name}の『話し合い重視』は今でも使える。明日の会議で全員の意見を聞いてから決めてみよう。」" }\n  ]\n}`
    );
  }

  // === API-based person detection (prefer this when API key is available) ===
  async detectPersonName(keyword) {
    if (!this.apiKey) return null; // indicate not attempted
    try {
      const response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a classification function. Answer only with one token: PERSON or OTHER.' },
            { role: 'user', content: `Is the following query a historical figure or a person name? Reply PERSON or OTHER.\n\nQuery: "${keyword}"` }
          ],
          max_tokens: 2,
          temperature: 0
        })
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();
      if (content.includes('PERSON')) return true;
      if (content.includes('OTHER')) return false;
      return null;
    } catch (e) {
      console.warn('⚠️ detectPersonName API検知失敗、ヒューリスティックにフォールバック:', e?.message || e);
      return null;
    }
  }

  // === Historical output validator ===
  validateHistoricalResult(result) {
    try {
      if (!result || !Array.isArray(result.items)) return { ok: false, reason: 'no_items' };
      const items = result.items;
      if (items.length !== 8) return { ok: false, reason: 'items_count' };
      const banned = ['大切', 'すごい', '最高', '素晴らしい', '感動', 'びっくり', 'ヤバい'];
      const sentenceCount = (text) => {
        const parts = (text || '').split(/[。\.\!\?]/).filter(s => s.trim().length > 0);
        return parts.length;
      };
      for (const it of items) {
        const text = (it && (it.text || it.content?.main || it.name)) || '';
        const len = [...text].length;
        const sc = sentenceCount(text);
        if (len < 120 || len > 180) return { ok: false, reason: 'length', value: len };
        if (sc < 2 || sc > 3) return { ok: false, reason: 'sentences', value: sc };
        if (banned.some(w => text.includes(w))) return { ok: false, reason: 'banned' };
      }
      return { ok: true };
    } catch (_e) {
      return { ok: false, reason: 'exception' };
    }
  }

  async refineHistoricalDesign(name, draft) {
    if (!this.apiKey) return draft;
    try {
      const system = this.buildHistoricalSystemPrompt();
      const user = `次のJSONを制約に合わせて厳密に修正して返してください。JSONのみを出力。\n\n制約:\n- itemsは8件、各120〜180文字、2〜3文\n- 抽象語（大切/すごい/最高/素晴らしい 等）禁止\n- 構成順: 生涯/業績/業績/方法/誤解/学び/限界/まとめ\n\n対象:${name}\n\nJSON:\n${JSON.stringify(draft)}`;
      const response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [ { role: 'system', content: system }, { role: 'user', content: user } ],
          max_tokens: 4000,
          temperature: 0.1,
          top_p: 0.6
        })
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      return JSON.parse(jsonString);
    } catch (_e) {
      return draft;
    }
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
    
    // 45-60秒の動画になるようにアイテム数を調整
    // 1アイテム = 25-40文字 = 約4-5秒の音声
    // ショート動画で1分越えそうなら1つアイテム減らす
    let itemCount = 6; // デフォルト6個
    if (format === 'short' && actualDuration > 55) {
      itemCount = 5; // 1分越えそうなら5個に減らす
    }
    const detailsPerItem = 30; // 各アイテム30文字程度

    const diversityRules = `多様性ルール（厳守）:\n- 各文の主題を必ず変える（例: 指標/時間/確率/頻度/安全/コスト/年齢差/環境/パフォーマンス/ライフハック）\n- 同じ観点の言い換えは禁止（内容重複NG）\n- 数字・時間・%・期間は毎文で異なる具体値を使う\n\n出力条件:\n- 1文25-40文字の自然な日本語\n- 必ず具体的な数字/時間/%/期間を含む\n- 各文は完結した自然な文章（記号や矢印は使わない）`;

    const prompts = {
      sexed: `「${keyword}」について、具体的な情報を5つ紹介してください。\n\n各文は25-35文字で、必ず具体的な数字・時間・%を含めてください。\n\n例：\n- オナ禁7日でテストステロン45%上昇、14日でピーク\n- 射精後30分でプロラクチン分泌、深い眠りに落ちる\n- 精子は48-72時間で完全回復、亜鉛で20%早まる\n- 性行為1回で150-200kcal消費、心拍120前後\n- 20代は週4回、40代は週2回が適切な頻度`,
      health: `「${keyword}」について、エビデンスに基づく実践的な健康知識を紹介してください。\n\n${diversityRules}\n\n参考観点: ${keyword}の負荷/回数/頻度/休息/栄養/睡眠/有酸素/筋力/柔軟/ケガ予防/コスト`,
      money: `「${keyword}」について、再現性のあるお金の知識を紹介してください。\n\n${diversityRules}\n\n参考観点: ${keyword}の期待利回り/ドローダウン/貯蓄率/固定費/変動費/税/手数料/分散/時間分散/副業時間`,
      lifestyle: `「${keyword}」について、今日から使える生活の実用知識を紹介してください。\n\n${diversityRules}\n\n参考観点: ${keyword}の時短/習慣/家事/睡眠/食事/整理/衛生/安全/家計/子育て`,
      skill: `「${keyword}」について、短期で上達する学習の実践知を紹介してください。\n\n${diversityRules}\n\n参考観点: ${keyword}の学習時間/反復間隔/ミス率/練習量/難易度調整/睡眠/復習/環境`,
      product: `「${keyword}」について、失敗しない選び方・使い方を紹介してください。\n\n${diversityRules}\n\n参考観点: ${keyword}の価格/コスパ/耐久/保証/代替/比較/使い方/保守/レビュー偏り`
    };

    let basePrompt = prompts[category] || prompts.lifestyle;
    if (format !== 'short') {
      basePrompt = `${basePrompt}\n\n${prompts.generic_deep}`;
    }

    // 動的なアイテム数のJSONテンプレートを生成
    const itemsArray = Array.from({ length: itemCount }, (_, i) => 
      `    {
      "text": "自然な1文（25-40文字、必ず具体的な数字・時間・%入り）"
    }`
    ).join(',\n');
    
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
${itemsArray}
  ]
}`;

    return `${basePrompt}\n\n以下のJSON形式で出力してください：\n${jsonTemplate}`;
  }

  // メイン生成関数
  async generateVideoDesign(keyword, template, format = 'short', duration = 40) {
    console.log(`🎯 実用的AI生成開始: ${keyword}`);

    try {
      // 人名ルート優先（API→ヒューリスティック）
      let apiPerson = await this.detectPersonName(keyword);
      const isPerson = apiPerson === null ? this.isLikelyPersonName(keyword) : apiPerson;
      let category = 'product';
      if (isPerson) {
        category = 'historical_figure';
      } else {
        // 通常分野判定
        category = await this.detectCategory(keyword);
      }
      console.log(`📂 判定: ${isPerson ? 'historical_figure' : category}`);

      // APIなしの場合は基本的なフォールバック
      if (!this.apiKey) {
        console.warn('⚠️ APIキー未設定、基本的なフォールバック使用');
        return this.getBasicFallback(keyword, category, format, duration);
      }

      // Viteプロキシ経由でAPI呼び出し
      const response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: isPerson ? [
            { role: 'system', content: this.buildHistoricalSystemPrompt() },
            { role: 'user', content: this.buildHistoricalUserPrompt(keyword, format === 'medium' ? 'medium' : 'medium', Math.max(duration, 180)) }
          ] : [
            {
              role: 'system',
              content: `あなたは${category}分野の専門家です。ショート動画用の超簡潔で具体的、そして**誰も教えてくれない本当に知りたい情報**を提供してください。

**必須フォーマット（絶対厳守）:**
各itemsには "text" フィールドのみ。自然な1文で具体的な情報を書く。完結した自然な文章にする。

**生成ルール:**
- 各文は異なる観点・主題で書く（重複禁止）
- 具体的な数字・時間・%・期間を必ず含む
- 自然で読み上げやすい文章にする

**絶対に守ること:**
- 必ず具体的な数字・時間・%・期間を入れる
- 「重要」「大切」「適切な」「高い」「低い」などの抽象語は禁止
- 1文に複数の具体的情報を詰め込む
- タブー視されがちだけど知りたい内容を優先
- 当たり前の教科書的内容は絶対NG
- 25-35文字の自然な文章（60秒動画用）
- 正常値や基本的な安全知識は避ける
- 実際の体験談や体感変化を重視`
            },
            {
              role: 'user',
              content: this.getCategoryPrompt(keyword, category, format, duration)
            }
          ],
          max_tokens: 4000,
          temperature: isPerson ? 0.2 : 0.35,
          top_p: isPerson ? 0.7 : 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      let result = JSON.parse(jsonString);
      
      // タイトルが空の場合はAPIで生成
      if (!result.title || result.title.trim() === '') {
        result.title = await this.generateTitle(keyword, category);
      }

      // YouTube説明欄を動的に生成
      if (!result.content || !result.content.description) {
        result.content = result.content || {};
        result.content.description = this.generateYouTubeDescription(keyword, category, result);
      }

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

      // Historical: validate and refine if needed
      if (isPerson) {
        let check = this.validateHistoricalResult(result);
        let attempts = 0;
        while (!check.ok && attempts < 2) {
          attempts++;
          const refined = await this.refineHistoricalDesign(keyword, result);
          result = refined;
          check = this.validateHistoricalResult(result);
        }
      }
      
      result.duration = isPerson ? Math.max(duration, 180) : duration;
      result.category = category;
      
      console.log(`✅ 実用的AI設計図完成: ${category} - ${result.title}`);
      return result;

    } catch (error) {
      console.error('❌ 実用的生成エラー:', error);
      console.error('❌ エラー詳細:', error.message);
      console.error('❌ スタック:', error.stack);
      if (this.isLikelyPersonName(keyword)) {
        console.warn('⚠️ 人名検出時のフォールバック（歴史人物テンプレ）');
        return this.getHistoricalFallback(keyword, format, Math.max(duration, 180));
      } else {
        const fallbackCategory = this.detectCategoryOffline(keyword);
        console.warn('⚠️ モックデータにフォールバック:', { keyword, category: fallbackCategory });
        return this.getRealisticMockData(keyword, fallbackCategory, format, duration);
      }
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

      const systemPrompt = `あなたは${existingDesign?.category || 'sexed'}分野の専門家です。既存の文を、教育的で科学的に正確に、さらに踏み込んで具体化してください。\n- 抽象語は使わない（重要/適切/高い/低い等）\n- 必ず具体的な数字・時間・%・期間を入れる\n- 各文の主題を変える（重複禁止）\n- 危険行為の助長や扇情的表現は禁止\n- 1文25-40文字で自然な日本語\n- 出力はJSONのitems配列のみ（各要素は {"text": "..."} ）`;

      const userPrompt = `キーワード: ${keyword}\n既存文:\n${compactList}\n\n要件:\n- 重複を避け、情報密度を上げる\n- 曖昧表現を数値に置換\n- 誤解を招く表現は修正\n- 同じ項目数で返す`;

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

  // 基本的なフォールバック（APIキーなし時）
  getBasicFallback(keyword, category, format, duration) {
    const spec = format === 'short';
    const title = `${keyword}について解説`;
    
    return {
      title: title,
      videoType: `${category}情報`,
      duration: duration,
      canvas: { width: spec.width, height: spec.height, backgroundColor: "#ffffff" },
      content: {
        description: `【${keyword}】基本的な情報を解説します。\n\n📝 この動画で学べること\n・${keyword}の基本知識\n・実践的な方法\n・継続のコツ\n\n💡 ${keyword}に興味のある方は必見！\n\n#${keyword} #${category} #情報 #コツ #方法 #実践 #初心者 #解説 #役立つ #おすすめ`,
        structure: "基本知識→具体的方法→実践のコツ"
      },
      items: [
        {
          id: 1,
          name: "基本的な知識",
          content: {
            main: `${keyword}についての基本知識`,
            details: "初心者が知っておくべき基本情報を説明します"
          }
        },
        {
          id: 2,
          name: "具体的な方法",
          content: {
            main: `${keyword}の実践的な方法`,
            details: "実際に始める具体的な手順を説明します"
          }
        },
        {
          id: 3,
          name: "継続のコツ",
          content: {
            main: `${keyword}を続けるための秘訣`,
            details: "長く続けるためのコツを説明します"
          }
        }
      ]
    };
  }

  // 実用的なモックデータ（分野別）- 削除予定
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
          description: `【${keyword}】今日から実践できる子育てのコツを3つにまとめて解説します！\n\n📝 この動画で学べること\n・コミュニケーションを深める具体的な方法\n・安心できるルーティンの作り方\n・自己肯定感を育む褒め方のコツ\n\n💡 子育てでお悩みの方は必見！\n\n#子育て #子育てコツ #子育て悩み #子育てママ #子育てパパ #子育て本 #子育てグッズ #子育て食事 #子育てしつけ #子育て教育 #子育て体験談 #育児 #育児コツ #育児悩み #育児グッズ #育児本 #育児方法 #親子関係 #子供との接し方 #子育て動画`,
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
        description: `【${keyword}】初心者でも分かりやすく解説！実用的で役立つ情報を3つにまとめました。\n\n📝 この動画で学べること\n・基本的な知識と全体像\n・具体的な実践方法\n・継続するためのコツ\n\n💡 ${keyword}に興味のある方は必見！\n\n#${keyword} #${category} #情報 #コツ #方法 #実践 #初心者 #解説 #役立つ #おすすめ`,
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

  // Historical figure offline fallback (concise, readable)
  getHistoricalFallback(name, format, duration) {
    const spec = format === 'medium' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
    return {
      title: `${name}｜なぜ今も学ぶ価値があるのか`,
      videoType: '解説',
      duration: duration || 240,
      canvas: { width: spec.width, height: spec.height, backgroundColor: '#ffffff' },
      content: {
        description: `${name}の生涯と仕事の核心を、業績・考え方・現代へのヒントに分けてやさしく解説します。`,
        structure: '生涯要約→代表業績→代表業績→思考法→誤解→現代の学び→限界→まとめ'
      },
      category: 'historical_figure',
      items: [
        { type: 'item', text: `${name}の生涯は転機の連続でした。出自と基礎修業、転機、活動の広がりを簡潔に振り返ります。誇張は避け、主要な舞台のみを述べます。` },
        { type: 'item', text: `代表業績①では、何が新しかったのかを短く示します。当時の背景を一言添え、過度な美化は避けます。` },
        { type: 'item', text: `代表業績②は、どんな課題をどう解決したかを軸に説明します。応用や波及についても簡潔に触れます。` },
        { type: 'item', text: `思考法/仕事術は、観察→仮説→試作→検証の流れで紹介。小さく試して学ぶ再現可能な手順を示します。` },
        { type: 'item', text: `よくある誤解を挙げ、なぜ生まれたか、実際はどうかを丁寧に整理します。` },
        { type: 'item', text: `現代に活きる学びとして、今日から試せる姿勢や手順を一つ提示します。` },
        { type: 'item', text: `限界/反証として、前提条件や批判点、バイアスに触れ、扱いの注意点を明確にします。` },
        { type: 'summary', text: `${name}を“天才”ではなく実践の積み重ねとして捉え直し、視聴者の次の一歩を促します。` }
      ]
    };
  }

  // APIでタイトル生成
  async generateTitle(keyword, category) {
    if (!this.apiKey) {
      return keyword; // APIキーがない場合はキーワードをそのまま返す
    }

    try {
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
              content: `あなたは${category}分野の専門家です。ショート動画用の魅力的で自然なタイトルを生成してください。`
            },
            {
              role: 'user',
              content: `「${keyword}」についてのショート動画のタイトルを1つ生成してください。自然で魅力的な日本語タイトルにしてください。タイトルのみを回答してください。`
            }
          ],
          max_tokens: 50,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const title = data.choices[0].message.content.trim();
      return title || keyword; // 空の場合はキーワードを返す
    } catch (error) {
      console.error('❌ タイトル生成エラー:', error);
      return keyword; // エラーの場合はキーワードを返す
    }
  }

  // クリックされやすい日本語タイトル生成（オフライン用簡易版）
  generateClickableTitle(keyword, category) {
    // シンプルにキーワードをそのまま返す（AIが自由に生成する）
    return keyword;
  }

  // YouTube説明欄を動的に生成
  generateYouTubeDescription(keyword, category, result) {
    const items = result.items || [];
    const itemNames = items.map(item => item.name || item.title || '内容').slice(0, 3);
    
    // カテゴリ別ハッシュタグ
    const categoryHashtags = {
      health: ['#健康 #フィットネス #運動 #ダイエット #筋トレ #有酸素運動 #健康管理 #ウェルネス'],
      money: ['#投資 #節約 #家計 #貯金 #資産運用 #金融 #マネー #お金 #経済 #投資信託'],
      lifestyle: ['#ライフスタイル #生活 #暮らし #日常 #ライフハック #便利グッズ #生活改善 #暮らし方'],
      skill: ['#スキル #学習 #教育 #資格 #習い事 #スキルアップ #成長 #自己啓発 #勉強法'],
      technology: ['#テクノロジー #IT #ガジェット #アプリ #デジタル #プログラミング #AI #最新技術'],
      food: ['#料理 #レシピ #グルメ #食べ物 #クッキング #食事 #栄養 #フード #美味しい #食生活']
    };

    const hashtags = categoryHashtags[category] || [`#${keyword} #${category} #情報 #コツ #方法 #実践 #初心者 #解説 #役立つ #おすすめ`];
    
    return `【${keyword}】今日から実践できる${category}のコツを${items.length}つにまとめて解説します！

📝 この動画で学べること
${itemNames.map(name => `・${name}`).join('\n')}

💡 ${keyword}に興味のある方は必見！

${hashtags.join(' ')}`;
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