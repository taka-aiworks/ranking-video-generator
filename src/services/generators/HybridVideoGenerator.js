// HybridVideoGenerator.js - ハイブリッド動画生成エンジン

class HybridVideoGenerator {
  constructor() {
    this.canvases = {
      short: null,    // 9:16 縦型キャンバス
      medium: null    // 16:9 横型キャンバス
    };
    this.contexts = {
      short: null,
      medium: null
    };
    this.mediaRecorders = {
      short: null,
      medium: null
    };
    this.chunks = {
      short: [],
      medium: []
    };
    this.isRecording = {
      short: false,
      medium: false
    };
    this.startTimes = {
      short: 0,
      medium: 0
    };
    this.animationIds = {
      short: null,
      medium: null
    };
    
    // 動画設定
    this.videoConfig = {
      short: {
        width: 1080,
        height: 1920,  // 9:16 縦型
        duration: 60,   // 最大60秒
        fps: 30
      },
      medium: {
        width: 1920,
        height: 1080,   // 16:9 横型
        duration: 480,  // 最大8分
        fps: 30
      }
    };
    
    // コンテンツデータ
    this.contentData = null;
    this.selectedTemplate = 'ranking';
    this.selectedFormat = 'hybrid'; // hybrid, short, medium
    
    // テンプレート設定
    this.templates = {
      ranking: {
        name: 'ランキング',
        shortStructure: ['intro', 'top3', 'cta'],
        mediumStructure: ['intro', 'criteria', 'ranking', 'details', 'conclusion']
      },
      comparison: {
        name: '比較(VS)',
        shortStructure: ['intro', 'comparison', 'winner'],
        mediumStructure: ['intro', 'item1', 'item2', 'comparison', 'verdict']
      },
      tutorial: {
        name: 'チュートリアル',
        shortStructure: ['problem', 'solution', 'result'],
        mediumStructure: ['intro', 'overview', 'steps', 'tips', 'conclusion']
      },
      news: {
        name: 'トレンドニュース',
        shortStructure: ['breaking', 'key_points', 'impact'],
        mediumStructure: ['intro', 'background', 'details', 'analysis', 'future']
      }
    };
    
    // コールバック
    this.onStatusUpdate = () => {};
    this.onComplete = () => {};
    this.onProgress = () => {};
  }

  // 初期化
  initialize(canvases, callbacks = {}) {
    this.canvases = canvases;
    
    // コンテキスト設定
    Object.keys(this.canvases).forEach(format => {
      if (this.canvases[format]) {
        this.contexts[format] = this.canvases[format].getContext('2d');
        
        // キャンバスサイズ設定
        this.canvases[format].width = this.videoConfig[format].width;
        this.canvases[format].height = this.videoConfig[format].height;
      }
    });
    
    // コールバック設定
    this.onStatusUpdate = callbacks.onStatusUpdate || (() => {});
    this.onComplete = callbacks.onComplete || (() => {});
    this.onProgress = callbacks.onProgress || (() => {});
    
    // 描画開始
    this.startDrawing();
  }

  // 描画ループ開始
  startDrawing() {
    Object.keys(this.contexts).forEach(format => {
      if (this.contexts[format]) {
        this.drawFrame(format);
      }
    });
  }

  // フレーム描画
  drawFrame(format) {
    if (!this.contexts[format]) return;

    const now = this.isRecording[format] 
      ? (Date.now() - this.startTimes[format]) / 1000 
      : 0;

    // 背景描画
    this.drawBackground(format);

    if (this.isRecording[format]) {
      // 録画中の描画
      this.drawContent(format, now);
      this.drawProgressBar(format, now);
    } else {
      // 待機中の描画
      this.drawWaitingScreen(format);
    }

    // 次のフレーム予約
    this.animationIds[format] = requestAnimationFrame(() => this.drawFrame(format));
  }

  // 背景描画
  drawBackground(format) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    // グラデーション背景
    const gradient = ctx.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);
    
    // デコレーション（フォーマット別）
    this.drawDecorations(format);
  }

  // デコレーション描画
  drawDecorations(format) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = format === 'short' ? 1 : 2;
    
    // 形式別デコレーション
    if (format === 'short') {
      // 縦型用：縦のライン
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(config.width * (0.2 + i * 0.3), 0);
        ctx.lineTo(config.width * (0.2 + i * 0.3), config.height);
        ctx.stroke();
      }
    } else {
      // 横型用：円形デコレーション
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * config.width,
          Math.random() * config.height,
          30 + Math.random() * 60,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    }
  }

  // 待機画面描画
  drawWaitingScreen(format) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    ctx.fillStyle = '#ffffff';
    ctx.font = format === 'short' ? 'bold 60px Arial' : 'bold 80px Arial';
    ctx.textAlign = 'center';
    
    const text = format === 'short' ? 'ショート動画\n準備中...' : 'ミディアム動画\n準備中...';
    const lines = text.split('\n');
    const lineHeight = format === 'short' ? 80 : 100;
    
    lines.forEach((line, index) => {
      ctx.fillText(
        line, 
        config.width / 2, 
        config.height / 2 + (index - lines.length / 2 + 0.5) * lineHeight
      );
    });
  }

  // コンテンツ描画
  drawContent(format, currentTime) {
    const template = this.templates[this.selectedTemplate];
    const structure = format === 'short' ? template.shortStructure : template.mediumStructure;
    const totalDuration = this.videoConfig[format].duration;
    
    // 現在のセクション判定
    const sectionDuration = totalDuration / structure.length;
    const currentSectionIndex = Math.floor(currentTime / sectionDuration);
    const sectionProgress = (currentTime % sectionDuration) / sectionDuration;
    
    if (currentSectionIndex < structure.length) {
      const currentSection = structure[currentSectionIndex];
      this.drawSection(format, currentSection, sectionProgress, currentSectionIndex);
    }
  }

  // セクション描画
  drawSection(format, section, progress, index) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    // セクション別描画ロジック
    switch (section) {
      case 'intro':
        this.drawIntro(format, progress);
        break;
      case 'ranking':
      case 'top3':
        this.drawRanking(format, progress, format === 'short' ? 3 : 10);
        break;
      case 'comparison':
        this.drawComparison(format, progress);
        break;
      case 'conclusion':
      case 'cta':
        this.drawConclusion(format, progress);
        break;
      case 'steps':
        this.drawSteps(format, progress);
        break;
      default:
        this.drawGenericSection(format, section, progress);
    }
    
    // セクション情報表示
    this.drawSectionInfo(format, section, index);
  }

  // イントロ描画
  drawIntro(format, progress) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    const scale = 0.8 + Math.sin(progress * Math.PI * 2) * 0.2;
    
    ctx.save();
    ctx.translate(config.width / 2, config.height / 2);
    ctx.scale(scale, scale);
    
    // タイトル
    ctx.fillStyle = '#ffffff';
    ctx.font = format === 'short' ? 'bold 80px Arial' : 'bold 120px Arial';
    ctx.textAlign = 'center';
    
    const title = this.contentData?.title || 'おすすめランキング';
    ctx.fillText(title, 0, -50);
    
    // サブタイトル
    ctx.font = format === 'short' ? 'bold 60px Arial' : 'bold 80px Arial';
    ctx.fillStyle = '#ff6b6b';
    
    const subtitle = format === 'short' ? 'TOP3発表' : 'TOP10発表';
    ctx.fillText(subtitle, 0, 50);
    
    ctx.restore();
  }

  // ランキング描画
  drawRanking(format, progress, maxItems) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    // ランキングアイテム表示ロジック
    const itemIndex = Math.floor(progress * maxItems);
    if (itemIndex < maxItems && this.contentData?.items) {
      const item = this.contentData.items[itemIndex];
      this.drawRankingItem(format, item, itemIndex + 1, progress);
    }
  }

  // ランキングアイテム描画
  drawRankingItem(format, item, rank, progress) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    // 背景パネル
    const panelHeight = format === 'short' ? config.height * 0.4 : config.height * 0.6;
    const panelY = (config.height - panelHeight) / 2;
    
    ctx.fillStyle = 'rgba(45, 55, 72, 0.9)';
    ctx.fillRect(50, panelY, config.width - 100, panelHeight);
    
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = format === 'short' ? 4 : 8;
    ctx.strokeRect(50, panelY, config.width - 100, panelHeight);
    
    // ランク表示
    const rankScale = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
    ctx.save();
    ctx.translate(config.width / 2, config.height / 2 - 50);
    ctx.scale(rankScale, rankScale);
    
    ctx.fillStyle = '#ff6b6b';
    ctx.font = format === 'short' ? 'bold 120px Arial' : 'bold 200px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${rank}位`, 0, 0);
    
    ctx.restore();
    
    // アイテム名
    ctx.fillStyle = '#ffffff';
    ctx.font = format === 'short' ? 'bold 40px Arial' : 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item?.name || `商品${rank}`, config.width / 2, config.height / 2 + 80);
  }

  // 比較描画
  drawComparison(format, progress) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    // VS表示ロジック
    ctx.fillStyle = '#ffffff';
    ctx.font = format === 'short' ? 'bold 60px Arial' : 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VS', config.width / 2, config.height / 2);
  }

  // 結論描画
  drawConclusion(format, progress) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    ctx.fillStyle = '#ffffff';
    ctx.font = format === 'short' ? 'bold 50px Arial' : 'bold 80px Arial';
    ctx.textAlign = 'center';
    
    const message = format === 'short' 
      ? 'フォロー・いいね\nお願いします！' 
      : 'チャンネル登録・高評価\nお願いします！';
    
    const lines = message.split('\n');
    lines.forEach((line, index) => {
      ctx.fillText(line, config.width / 2, config.height / 2 + index * 60);
    });
  }

  // 汎用セクション描画
  drawGenericSection(format, section, progress) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    ctx.fillStyle = '#ffffff';
    ctx.font = format === 'short' ? 'bold 40px Arial' : 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(section.toUpperCase(), config.width / 2, config.height / 2);
  }

  // セクション情報表示
  drawSectionInfo(format, section, index) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    
    // 右上にセクション情報
    ctx.fillStyle = '#4ecdc4';
    ctx.font = format === 'short' ? '20px Arial' : '30px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${index + 1}. ${section}`, config.width - 30, 50);
  }

  // プログレスバー描画
  drawProgressBar(format, currentTime) {
    const ctx = this.contexts[format];
    const config = this.videoConfig[format];
    const totalTime = this.videoConfig[format].duration;
    
    const progress = Math.min(currentTime / totalTime, 1);
    const barWidth = config.width * 0.8;
    const barHeight = format === 'short' ? 15 : 20;
    const x = (config.width - barWidth) / 2;
    const y = config.height - (format === 'short' ? 60 : 80);
    
    // 背景
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // プログレス
    ctx.fillStyle = format === 'short' ? '#ff6b6b' : '#4ecdc4';
    ctx.fillRect(x, y, barWidth * progress, barHeight);
  }

  // ハイブリッド生成
  async generateHybridVideos(contentData, options = {}) {
    this.contentData = contentData;
    this.selectedTemplate = options.template || 'ranking';
    
    try {
      // 同時生成開始
      const promises = [];
      
      if (options.includeShort !== false) {
        promises.push(this.generateSingleVideo('short', options.shortDuration || 60));
      }
      
      if (options.includeMedium !== false) {
        promises.push(this.generateSingleVideo('medium', options.mediumDuration || 300));
      }
      
      const results = await Promise.all(promises);
      
      // 結果統合
      const hybridResult = {
        short: results.find(r => r.format === 'short'),
        medium: results.find(r => r.format === 'medium'),
        crossPromotionLinks: this.generateCrossPromotionLinks()
      };
      
      this.onComplete(hybridResult);
      
    } catch (error) {
      console.error('ハイブリッド生成エラー:', error);
      this.onStatusUpdate('生成エラーが発生しました');
    }
  }

  // 単体動画生成
  async generateSingleVideo(format, duration) {
    return new Promise((resolve, reject) => {
      this.chunks[format] = [];
      this.onStatusUpdate(`${format}動画生成開始...`);
      
      const canvas = this.canvases[format];
      if (!canvas) {
        reject(new Error(`${format}用キャンバスが見つかりません`));
        return;
      }
      
      const stream = canvas.captureStream(this.videoConfig[format].fps);
      const options = {
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: format === 'short' ? 1500000 : 2500000
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        delete options.mimeType;
      }
      
      this.mediaRecorders[format] = new MediaRecorder(stream, options);
      
      this.mediaRecorders[format].ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks[format].push(event.data);
        }
      };
      
      this.mediaRecorders[format].onstop = () => {
        const blob = new Blob(this.chunks[format], { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
        
        resolve({
          format,
          url,
          sizeMB,
          blob,
          duration,
          aspectRatio: format === 'short' ? '9:16' : '16:9'
        });
      };
      
      // 録画開始
      this.mediaRecorders[format].start(100);
      this.startTimes[format] = Date.now();
      this.isRecording[format] = true;
      
      this.onStatusUpdate(`${format}動画録画中... (${duration}秒)`);
      
      // 録画停止タイマー
      setTimeout(() => {
        this.stopRecording(format);
      }, duration * 1000);
    });
  }

  // 録画停止
  stopRecording(format) {
    if (!this.isRecording[format] || !this.mediaRecorders[format]) return;
    
    this.isRecording[format] = false;
    this.onStatusUpdate(`${format}動画録画停止中...`);
    
    if (this.mediaRecorders[format].state === 'recording') {
      this.mediaRecorders[format].stop();
    }
  }

  // 相互プロモーションリンク生成
  generateCrossPromotionLinks() {
    return {
      shortToMedium: {
        text: "詳しい比較が見たい方は概要欄のリンクから！",
        placement: "end",
        duration: 3
      },
      mediumToShort: {
        text: "サクッと知りたい方はショート版もどうぞ！",
        placement: "description",
        format: "📱 ショート版: [自動リンク]"
      }
    };
  }

  // クリーンアップ
  cleanup() {
    Object.keys(this.animationIds).forEach(format => {
      if (this.animationIds[format]) {
        cancelAnimationFrame(this.animationIds[format]);
      }
    });
    
    Object.keys(this.mediaRecorders).forEach(format => {
      this.stopRecording(format);
    });
  }
}

export default HybridVideoGenerator;