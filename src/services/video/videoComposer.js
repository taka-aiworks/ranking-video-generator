// src/services/video/videoComposer.js - 汎用化版（AI自由形式完全対応）

import { API_CONFIG } from '../../config/api.js';
import loopController from './loopController.js';

class VideoComposer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.recorder = null;
    this.config = API_CONFIG.video;
    this.isGenerating = false;
  }

  // Canvas初期化（AI設計図ベース）
  initCanvas(canvasRef, videoDesign) {
    console.log('🎬 Canvas初期化開始:', videoDesign?.canvas);
    
    this.canvas = canvasRef.current;
    if (!this.canvas) {
      throw new Error('Canvas reference not found');
    }
    
    this.ctx = this.canvas.getContext('2d');
    
    if (videoDesign?.canvas) {
      this.canvas.width = videoDesign.canvas.width;
      this.canvas.height = videoDesign.canvas.height;
      console.log(`✅ Canvas サイズ設定: ${this.canvas.width}x${this.canvas.height}`);
    } else {
      this.canvas.width = 1920;
      this.canvas.height = 1080;
      console.warn('⚠️ AI設計図からサイズを取得できないため、デフォルト使用');
    }
    
    return this.canvas;
  }

  // 動画録画開始
  startRecording(duration) {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    console.log('🔴 録画開始...', duration + 's');
    const stream = this.canvas.captureStream(30);
    this.recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    return new Promise((resolve, reject) => {
      const chunks = [];
      
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log(`📦 データチャンク追加: ${event.data.size} bytes`);
        }
      };

      this.recorder.onstop = () => {
        console.log('⏹️ 録画停止、ファイル作成中...');
        loopController.endSession();
        
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const result = {
          blob,
          url,
          size: (blob.size / (1024 * 1024)).toFixed(2) + 'MB'
        };
        console.log('✅ 動画ファイル作成完了:', result.size);
        resolve(result);
      };

      this.recorder.onerror = (error) => {
        console.error('🚨 録画エラー:', error);
        loopController.forceStop('RECORDER_ERROR');
        reject(error);
      };

      loopController.startSession(duration, this.recorder, (reason) => {
        console.error('🚨 強制停止:', reason);
        this.isGenerating = false;
        reject(new Error(`録画が強制停止されました: ${reason}`));
      });

      this.recorder.start();
    });
  }

  // 録画停止
  stopRecording() {
    if (this.recorder) {
      console.log('⏸️ 録画停止要求 - 状態:', this.recorder.state);
      
      if (this.recorder.state === 'recording') {
        this.recorder.stop();
      } else {
        console.warn('⚠️ 録画停止: 既に停止済みまたは無効状態');
        loopController.endSession();
      }
    }
  }

  // AI設計図に基づく背景描画
  drawBackground(videoDesign) {
    const bgColor = videoDesign.canvas?.backgroundColor || '#1e3a8a,#7c3aed,#db2777';
    const colors = bgColor.split(',');
    
    if (colors.length > 1) {
      const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color.trim());
      });
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = colors[0].trim();
    }
    
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // 🆕 汎用テキスト描画（影・アウトライン対応）
  drawText(text, x, y, fontSize, color, options = {}) {
    const {
      fontFamily = 'Arial, sans-serif',
      align = 'center',
      baseline = 'middle',
      maxWidth = null,
      shadow = true,
      outline = false,
      outlineColor = '#000000',
      outlineWidth = 3
    } = options;

    this.ctx.save();
    this.ctx.font = `bold ${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    
    // アウトライン描画
    if (outline) {
      this.ctx.strokeStyle = outlineColor;
      this.ctx.lineWidth = outlineWidth;
      this.ctx.lineJoin = 'round';
      if (maxWidth) {
        this.ctx.strokeText(text, x, y, maxWidth);
      } else {
        this.ctx.strokeText(text, x, y);
      }
    }
    
    // 影描画
    if (shadow) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
    }
    
    // メインテキスト描画
    this.ctx.fillStyle = color;
    if (maxWidth) {
      this.ctx.fillText(text, x, y, maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
    
    this.ctx.restore();
  }

  // 🆕 円・図形描画
  drawCircle(x, y, radius, fillColor, strokeColor = null, strokeWidth = 0) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    if (fillColor) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
    }
    
    if (strokeColor && strokeWidth > 0) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  // 🆕 矩形描画
  drawRect(x, y, width, height, fillColor, strokeColor = null, strokeWidth = 0, cornerRadius = 0) {
    this.ctx.save();
    
    if (cornerRadius > 0) {
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, width, height, cornerRadius);
    } else {
      this.ctx.beginPath();
      this.ctx.rect(x, y, width, height);
    }
    
    if (fillColor) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
    }
    
    if (strokeColor && strokeWidth > 0) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  // 現在時刻に該当するシーンを取得
  getCurrentScene(scenes, currentTime) {
    return scenes.find(scene => 
      currentTime >= scene.startTime && currentTime < scene.endTime
    );
  }

  // 🚀 汎用シーンレンダリング（AI形式完全対応）
  renderScene(scene, progress, videoDesign, currentTime) {
    if (!scene) return;
    
    const { type, content } = scene;
    console.log(`🎬 シーン描画: ${type}`, content);
    
    // AIが生成した任意のシーン形式に対応
    switch (type) {
      case 'title':
        this.renderTitleScene(content, videoDesign);
        break;
      case 'item':
        this.renderItemScene(content, videoDesign, currentTime);
        break;
      case 'comparison':
        this.renderComparisonScene(content, videoDesign);
        break;
      case 'info':
      case 'infographic':
        this.renderInfoScene(content, videoDesign);
        break;
      case 'tutorial':
      case 'guide':
        this.renderTutorialScene(content, videoDesign);
        break;
      case 'list':
        this.renderListScene(content, videoDesign);
        break;
      case 'summary':
      case 'conclusion':
        this.renderSummaryScene(content, videoDesign);
        break;
      default:
        // 🆕 汎用フォールバック（AI生成の任意形式対応）
        this.renderUniversalScene(content, videoDesign, type);
    }
  }

  // タイトルシーン描画
  renderTitleScene(content, videoDesign) {
    const isVertical = this.canvas.height > this.canvas.width;
    
    // メインタイトル
    this.drawText(
      content.mainText || content.title || '動画タイトル',
      this.canvas.width / 2,
      isVertical ? this.canvas.height * 0.4 : this.canvas.height * 0.35,
      isVertical ? 60 : 80,
      '#ffffff',
      { outline: true, maxWidth: this.canvas.width * 0.9 }
    );
    
    // サブテキスト
    if (content.subText) {
      this.drawText(
        content.subText,
        this.canvas.width / 2,
        isVertical ? this.canvas.height * 0.5 : this.canvas.height * 0.5,
        isVertical ? 35 : 45,
        '#ffeb3b'
      );
    }

    // 装飾要素
    this.drawAccentDecorations(videoDesign);
  }

  // 従来のアイテムシーン（ランキング対応）
  renderItemScene(content, videoDesign, currentTime) {
    const isVertical = this.canvas.height > this.canvas.width;
    const centerX = this.canvas.width / 2;
    
    // ランキング番号（従来通り）
    if (content.rank) {
      const rankY = isVertical ? 350 : 250;
      const rankSize = isVertical ? 100 : 120;
      
      this.drawCircle(centerX, rankY, rankSize * 0.7, '#ffd700');
      this.drawText(
        `${content.rank}位`,
        centerX,
        rankY,
        rankSize,
        '#000000'
      );
    }
    
    // 商品名
    if (content.name) {
      this.drawText(
        content.name,
        centerX,
        isVertical ? 500 : 380,
        isVertical ? 40 : 55,
        '#ffffff',
        { maxWidth: this.canvas.width * 0.85 }
      );
    }
    
    // 価格・その他情報
    let yOffset = isVertical ? 580 : 460;
    if (content.price) {
      this.drawText(content.price, centerX, yOffset, isVertical ? 35 : 45, '#00ff88');
      yOffset += isVertical ? 60 : 70;
    }
    
    if (content.rating) {
      const stars = '★'.repeat(Math.floor(content.rating)) + '☆'.repeat(5 - Math.floor(content.rating));
      this.drawText(
        `${stars} ${content.rating.toFixed(1)}`,
        centerX,
        yOffset,
        isVertical ? 28 : 35,
        '#ffeb3b'
      );
      yOffset += isVertical ? 50 : 60;
    }
    
    // 特徴リスト
    if (content.features && content.features.length > 0) {
      content.features.forEach((feature, index) => {
        this.drawText(
          `✓ ${feature}`,
          centerX,
          yOffset + (index * (isVertical ? 40 : 45)),
          isVertical ? 25 : 30,
          '#87ceeb'
        );
      });
    }

    this.addDynamicEffects(currentTime, videoDesign);
  }

  // 🆕 比較シーン
  renderComparisonScene(content, videoDesign) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // タイトル
    this.drawText(
      content.title || '比較',
      centerX,
      this.canvas.height * 0.15,
      50,
      '#ffffff'
    );
    
    // 左右の比較項目
    if (content.items && content.items.length >= 2) {
      const leftX = this.canvas.width * 0.25;
      const rightX = this.canvas.width * 0.75;
      
      // 左側
      this.drawText(
        content.items[0].name || 'A',
        leftX,
        centerY - 50,
        45,
        '#ff6b6b'
      );
      
      // 右側
      this.drawText(
        content.items[1].name || 'B',
        rightX,
        centerY - 50,
        45,
        '#4ecdc4'
      );
      
      // VS表示
      this.drawText('VS', centerX, centerY, 60, '#ffd700', { outline: true });
    }
  }

  // 🆕 インフォグラフィックシーン
  renderInfoScene(content, videoDesign) {
    const centerX = this.canvas.width / 2;
    let yPos = this.canvas.height * 0.2;
    
    // タイトル
    this.drawText(
      content.mainText || content.title || 'インフォメーション',
      centerX,
      yPos,
      45,
      '#ffffff'
    );
    
    yPos += 80;
    
    // 情報項目
    if (content.points || content.items) {
      const items = content.points || content.items;
      items.forEach((item, index) => {
        // アイコン的な円
        this.drawCircle(centerX - 150, yPos, 15, '#4ecdc4');
        
        // テキスト
        this.drawText(
          item.text || item.name || item,
          centerX,
          yPos,
          35,
          '#ffffff',
          { align: 'left', maxWidth: this.canvas.width * 0.6 }
        );
        
        yPos += 60;
      });
    }
  }

  // 🆕 チュートリアル・ガイドシーン
  renderTutorialScene(content, videoDesign) {
    const centerX = this.canvas.width / 2;
    let yPos = this.canvas.height * 0.15;
    
    // ステップタイトル
    if (content.stepNumber) {
      this.drawText(
        `Step ${content.stepNumber}`,
        centerX,
        yPos,
        40,
        '#ffd700'
      );
      yPos += 60;
    }
    
    // メインテキスト
    this.drawText(
      content.mainText || content.title,
      centerX,
      yPos,
      50,
      '#ffffff',
      { maxWidth: this.canvas.width * 0.85 }
    );
    
    yPos += 100;
    
    // 説明テキスト
    if (content.description) {
      this.drawText(
        content.description,
        centerX,
        yPos,
        30,
        '#cccccc',
        { maxWidth: this.canvas.width * 0.8 }
      );
    }
  }

  // 🆕 リストシーン
  renderListScene(content, videoDesign) {
    const centerX = this.canvas.width / 2;
    let yPos = this.canvas.height * 0.2;
    
    // リストタイトル
    this.drawText(
      content.title || 'リスト',
      centerX,
      yPos,
      45,
      '#ffffff'
    );
    
    yPos += 80;
    
    // リスト項目
    if (content.items) {
      content.items.forEach((item, index) => {
        // 番号またはマーカー
        this.drawText(
          `${index + 1}.`,
          centerX - 200,
          yPos,
          35,
          '#ffd700'
        );
        
        // 項目テキスト
        this.drawText(
          item.name || item.text || item,
          centerX - 150,
          yPos,
          32,
          '#ffffff',
          { align: 'left', maxWidth: this.canvas.width * 0.6 }
        );
        
        yPos += 50;
      });
    }
  }

  // 🆕 まとめ・結論シーン
  renderSummaryScene(content, videoDesign) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // まとめタイトル
    this.drawText(
      content.title || 'まとめ',
      centerX,
      centerY - 100,
      55,
      '#ffd700',
      { outline: true }
    );
    
    // サマリーテキスト
    if (content.summary || content.mainText) {
      this.drawText(
        content.summary || content.mainText,
        centerX,
        centerY,
        35,
        '#ffffff',
        { maxWidth: this.canvas.width * 0.85 }
      );
    }
    
    // 行動促進
    if (content.cta) {
      this.drawText(
        content.cta,
        centerX,
        centerY + 80,
        30,
        '#00ff88'
      );
    }
  }

  // 🚀 汎用フォールバックシーン（AI生成形式対応・強化版）
  renderUniversalScene(content, videoDesign, sceneType) {
    console.log(`🤖 汎用描画強化: ${sceneType}`, content);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const isVertical = this.canvas.height > this.canvas.width;
    
    // メインテキスト検出・描画（大きく・目立つように）
    const mainText = content.mainText || content.title || content.name || 
                    content.main || content.text || `${sceneType} Scene`;
    
    this.drawText(
      mainText,
      centerX,
      isVertical ? this.canvas.height * 0.3 : centerY - 80,
      isVertical ? 55 : 65,
      '#ffffff',
      { 
        maxWidth: this.canvas.width * 0.85,
        outline: true,
        outlineColor: '#000000',
        outlineWidth: 4
      }
    );
    
    // サブテキスト（より目立つように）
    const subText = content.subText || content.description || content.details;
    if (subText) {
      this.drawText(
        subText,
        centerX,
        isVertical ? this.canvas.height * 0.45 : centerY,
        isVertical ? 35 : 40,
        '#ffeb3b',
        { 
          maxWidth: this.canvas.width * 0.8,
          shadow: true
        }
      );
    }
    
    // 追加情報・装飾
    if (content.extra) {
      this.drawText(
        content.extra,
        centerX,
        isVertical ? this.canvas.height * 0.6 : centerY + 80,
        isVertical ? 28 : 32,
        '#87ceeb'
      );
    }
    
    // シーン別の特別装飾
    if (sceneType === 'Opening' || sceneType === 'title') {
      // オープニング用の装飾
      this.drawAccentDecorations(videoDesign);
      
      // 追加の視覚効果
      const currentTime = Date.now() / 1000;
      for (let i = 0; i < 8; i++) {
        const angle = (currentTime + i) * 0.5;
        const radius = 100 + Math.sin(currentTime + i) * 20;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        this.drawCircle(x, y, 4, `rgba(255, 235, 59, 0.6)`);
      }
    }
    
    // 汎用的な動的エフェクト
    this.addDynamicEffects(Date.now() / 1000, videoDesign);
  }

  // 動的エフェクト
  addDynamicEffects(currentTime, videoDesign) {
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const alpha = Math.sin(currentTime * 2 + i) * 0.5 + 0.5;
      
      this.drawCircle(x, y, 3, `rgba(255, 255, 0, ${alpha * 0.3})`);
    }
  }

  // アクセント装飾
  drawAccentDecorations(videoDesign) {
    // 上下の装飾ライン
    this.ctx.save();
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 5;
    
    // 上部
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width * 0.2, this.canvas.height * 0.12);
    this.ctx.lineTo(this.canvas.width * 0.8, this.canvas.height * 0.12);
    this.ctx.stroke();
    
    // 下部
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width * 0.2, this.canvas.height * 0.88);
    this.ctx.lineTo(this.canvas.width * 0.8, this.canvas.height * 0.88);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  // プログレスバー描画
  drawProgressBar(progress, videoDesign, currentTime, duration) {
    const barWidth = this.canvas.width * 0.6;
    const barHeight = 20;
    const x = (this.canvas.width - barWidth) / 2;
    const y = this.canvas.height - 80;

    // 背景
    this.drawRect(x, y, barWidth, barHeight, 'rgba(0, 0, 0, 0.5)');
    
    // プログレス
    this.drawRect(x, y, barWidth * progress, barHeight, '#fbbf24');

    // 時間表示
    this.drawText(
      `${Math.floor(currentTime)}s / ${duration}s`,
      this.canvas.width / 2,
      this.canvas.height - 30,
      24,
      '#ffffff'
    );
  }

  // メイン生成関数（汎用化版）
  async generateVideoFromDesign(videoDesign, onProgress) {
    console.log('🚀 汎用AI動画生成開始:', videoDesign);
    
    if (this.isGenerating) {
      throw new Error('既に動画生成が実行中です');
    }
    
    this.isGenerating = true;
    
    try {
      const safeDuration = Math.max(Math.min(videoDesign.duration, 180), 15);
      if (safeDuration !== videoDesign.duration) {
        console.warn(`⚠️ 動画時間を ${videoDesign.duration}s → ${safeDuration}s に調整`);
        videoDesign.duration = safeDuration;
      }
      
      const recordingPromise = this.startRecording(safeDuration);
      const startTime = Date.now();
      const targetDuration = safeDuration * 1000;
      const scenes = videoDesign.scenes || [];
      
      console.log(`📋 動画設定: ${safeDuration}秒, シーン数: ${scenes.length}`);

      const animate = () => {
        if (!loopController.isSessionActive()) {
          console.warn('⚠️ セッションが非アクティブのため終了');
          return;
        }
        
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / targetDuration, 1);
        const currentTime = elapsed / 1000;

        // 背景描画
        this.drawBackground(videoDesign);

        // 🚀 汎用シーン描画
        const currentScene = this.getCurrentScene(scenes, currentTime);
        
        if (currentScene) {
          this.renderScene(currentScene, progress, videoDesign, currentTime);
        } else {
          // 汎用フォールバック
          this.drawText(
            videoDesign.title || 'AI設計動画',
            this.canvas.width / 2,
            this.canvas.height / 2,
            60,
            '#ffffff',
            { outline: true }
          );
        }

        // プログレスバー
        this.drawProgressBar(progress, videoDesign, currentTime, safeDuration);

        if (onProgress) {
          onProgress(Math.floor(progress * 100));
        }

        // 終了条件
        if (progress >= 1 || currentTime >= safeDuration) {
          console.log('🏁 汎用アニメーション完了');
          setTimeout(() => {
            this.stopRecording();
          }, 200);
          return;
        }

        const animationId = requestAnimationFrame(animate);
        loopController.registerAnimation(animationId);
      };

      animate();
      return recordingPromise;

    } catch (error) {
      console.error('🚨 汎用AI動画生成エラー:', error);
      this.isGenerating = false;
      loopController.forceStop('GENERATION_ERROR');
      throw error;
    } finally {
      setTimeout(() => {
        this.isGenerating = false;
      }, 1000);
    }
  }

  // 後方互換性のためのラッパー関数
  async generateVideo(contentData, template, duration, format, onProgress) {
    console.log('⚠️ 後方互換性関数が呼ばれました。汎用AI設計図版を推奨します。');
    
    const safeDuration = Math.max(Math.min(duration, 180), 15);
    
    const videoDesign = {
      title: contentData.title || `${template} 動画`,
      duration: safeDuration,
      canvas: {
        width: format === 'short' ? 1080 : 1920,
        height: format === 'short' ? 1920 : 1080,
        backgroundColor: '#1e3a8a,#7c3aed,#db2777'
      },
      scenes: [
        {
          startTime: 0,
          endTime: safeDuration,
          type: 'item',
          content: {
            name: contentData.title || `${template} 動画`,
            rank: 1,
            price: '¥19,800',
            features: ['AI生成', '高品質', 'おすすめ']
          }
        }
      ]
    };
    
    return this.generateVideoFromDesign(videoDesign, onProgress);
  }
}

const videoComposer = new VideoComposer();
export default videoComposer;