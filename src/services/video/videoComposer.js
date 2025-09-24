// src/services/video/videoComposer.js - 動画合成エンジン

import { API_CONFIG } from '../../config/api.js';

class VideoComposer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.recorder = null;
    this.config = API_CONFIG.video;
  }

  // Canvas初期化
  initCanvas(canvasRef) {
    this.canvas = canvasRef.current;
    if (!this.canvas) {
      throw new Error('Canvas reference not found');
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.config.canvas.width;
    this.canvas.height = this.config.canvas.height;
    
    return this.canvas;
  }

  // 動画録画開始
  startRecording() {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    const stream = this.canvas.captureStream(this.config.canvas.frameRate);
    this.recorder = new MediaRecorder(stream, {
      mimeType: this.config.recorder.mimeType,
      videoBitsPerSecond: this.config.recorder.videoBitsPerSecond
    });

    return new Promise((resolve, reject) => {
      const chunks = [];
      
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      this.recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        resolve({
          blob,
          url,
          size: (blob.size / (1024 * 1024)).toFixed(2) + 'MB'
        });
      };

      this.recorder.onerror = reject;
      this.recorder.start();
    });
  }

  // 録画停止
  stopRecording() {
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.stop();
    }
  }

  // 背景描画
  drawBackground(template) {
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    
    const gradients = {
      ranking: ['#1e3a8a', '#7c3aed', '#db2777'],
      comparison: ['#1e40af', '#059669', '#dc2626'], 
      tutorial: ['#065f46', '#059669', '#10b981'],
      news: ['#7c2d12', '#dc2626', '#f59e0b']
    };

    const colors = gradients[template] || gradients.ranking;
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // テキスト描画
  drawText(text, x, y, options = {}) {
    const defaults = {
      font: 'Arial',
      size: 40,
      weight: 'normal',
      color: '#ffffff',
      align: 'center',
      maxWidth: this.canvas.width - 200
    };

    const opts = { ...defaults, ...options };
    
    this.ctx.fillStyle = opts.color;
    this.ctx.font = `${opts.weight} ${opts.size}px ${opts.font}`;
    this.ctx.textAlign = opts.align;
    
    // 文字幅制限対応
    if (opts.maxWidth) {
      this.ctx.fillText(text, x, y, opts.maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
  }

  // プログレスバー描画
  drawProgressBar(progress, y = 700) {
    const barWidth = this.canvas.width - 400;
    const barHeight = 20;
    const x = 200;

    // 背景
    this.ctx.fillStyle = '#374151';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    // プログレス
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.fillRect(x, y, barWidth * progress, barHeight);
  }

  // ランキング動画生成
  async generateRankingVideo(contentData, duration, onProgress) {
    const recordingPromise = this.startRecording();
    const startTime = Date.now();
    const targetDuration = duration * 1000;
    const items = contentData.items || [];

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / targetDuration, 1);

      // 背景
      this.drawBackground('ranking');

      // タイトル
      this.drawText(
        contentData.title,
        this.canvas.width / 2,
        150,
        { size: 70, weight: 'bold' }
      );

      // ランキングアイテム
      if (items.length > 0) {
        const currentIndex = Math.floor(progress * items.length);
        const currentItem = items[Math.min(currentIndex, items.length - 1)];

        // ランキング番号
        this.drawText(
          `#${currentIndex + 1}`,
          this.canvas.width / 2,
          300,
          { size: 120, weight: 'bold', color: '#fbbf24' }
        );

        // 商品名
        this.drawText(
          currentItem.name,
          this.canvas.width / 2,
          400,
          { size: 50, weight: 'bold' }
        );

        // 価格
        this.drawText(
          currentItem.price,
          this.canvas.width / 2,
          460,
          { size: 40, color: '#10b981' }
        );

        // 評価
        if (currentItem.rating) {
          const stars = '★'.repeat(Math.floor(currentItem.rating)) + 
                       '☆'.repeat(5 - Math.floor(currentItem.rating));
          this.drawText(
            `${stars} ${currentItem.rating.toFixed(1)}`,
            this.canvas.width / 2,
            520,
            { size: 35, color: '#fbbf24' }
          );
        }

        // 特徴（features）
        if (currentItem.features) {
          currentItem.features.slice(0, 3).forEach((feature, i) => {
            this.drawText(
              `✓ ${feature}`,
              this.canvas.width / 2,
              580 + (i * 40),
              { size: 28, color: '#10b981' }
            );
          });
        }
      }

      // プログレスバー
      this.drawProgressBar(progress);

      // 時間表示
      this.drawText(
        `${Math.floor(elapsed / 1000)}s / ${Math.floor(duration)}s`,
        this.canvas.width / 2,
        760,
        { size: 30, color: '#9ca3af' }
      );

      // プログレス更新
      if (onProgress) {
        onProgress(Math.floor(progress * 100));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => this.stopRecording(), 500);
      }
    };

    animate();
    return recordingPromise;
  }

  // 比較動画生成
  async generateComparisonVideo(contentData, duration, onProgress) {
    const recordingPromise = this.startRecording();
    const startTime = Date.now();
    const targetDuration = duration * 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / targetDuration, 1);

      this.drawBackground('comparison');

      // タイトル
      this.drawText(
        contentData.title,
        this.canvas.width / 2,
        150,
        { size: 60, weight: 'bold' }
      );

      // A vs B 表示切替
      const showA = progress < 0.5;
      const product = showA ? contentData.productA : contentData.productB;
      const color = showA ? '#3b82f6' : '#ef4444';

      if (product) {
        this.drawText(
          product.name,
          this.canvas.width / 2,
          300,
          { size: 60, weight: 'bold', color }
        );

        this.drawText(
          product.price,
          this.canvas.width / 2,
          370,
          { size: 45, color: '#10b981' }
        );

        // メリット/デメリット
        if (product.pros) {
          this.drawText(
            '✓ ' + product.pros.join(' ✓ '),
            this.canvas.width / 2,
            450,
            { size: 32, color: '#10b981' }
          );
        }

        if (product.cons) {
          this.drawText(
            '⚠ ' + product.cons.join(' ⚠ '),
            this.canvas.width / 2,
            500,
            { size: 28, color: '#f59e0b' }
          );
        }
      }

      this.drawProgressBar(progress);

      if (onProgress) {
        onProgress(Math.floor(progress * 100));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => this.stopRecording(), 500);
      }
    };

    animate();
    return recordingPromise;
  }

  // チュートリアル動画生成
  async generateTutorialVideo(contentData, duration, onProgress) {
    const recordingPromise = this.startRecording();
    const startTime = Date.now();
    const targetDuration = duration * 1000;
    const steps = contentData.steps || [];

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / targetDuration, 1);

      this.drawBackground('tutorial');

      // タイトル  
      this.drawText(
        contentData.title,
        this.canvas.width / 2,
        150,
        { size: 60, weight: 'bold' }
      );

      // ステップ表示
      if (steps.length > 0) {
        const currentIndex = Math.floor(progress * steps.length);
        const currentStep = steps[Math.min(currentIndex, steps.length - 1)];

        this.drawText(
          `STEP ${currentStep.step}`,
          this.canvas.width / 2,
          300,
          { size: 80, weight: 'bold', color: '#10b981' }
        );

        this.drawText(
          currentStep.title,
          this.canvas.width / 2,
          380,
          { size: 45, weight: 'bold' }
        );

        // 長いコンテンツは改行対応
        const words = currentStep.content.split('');
        if (words.length > 30) {
          const line1 = words.slice(0, 30).join('');
          const line2 = words.slice(30).join('');
          this.drawText(line1, this.canvas.width / 2, 450, { size: 32 });
          this.drawText(line2, this.canvas.width / 2, 490, { size: 32 });
        } else {
          this.drawText(
            currentStep.content,
            this.canvas.width / 2,
            450,
            { size: 32 }
          );
        }
      }

      this.drawProgressBar(progress);

      if (onProgress) {
        onProgress(Math.floor(progress * 100));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => this.stopRecording(), 500);
      }
    };

    animate();
    return recordingPromise;
  }

  // メイン生成関数
  async generateVideo(contentData, template, duration, onProgress) {
    try {
      switch (template) {
        case 'ranking':
          return await this.generateRankingVideo(contentData, duration, onProgress);
        case 'comparison':
          return await this.generateComparisonVideo(contentData, duration, onProgress);
        case 'tutorial':
          return await this.generateTutorialVideo(contentData, duration, onProgress);
        default:
          return await this.generateRankingVideo(contentData, duration, onProgress);
      }
    } catch (error) {
      console.error('動画生成エラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
const videoComposer = new VideoComposer();
export default videoComposer;