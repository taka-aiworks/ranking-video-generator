// src/services/video/videoComposer.js - 無限ループ修正版

import { API_CONFIG } from '../../config/api.js';
import loopController from './loopController.js';

class VideoComposer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.recorder = null;
    this.config = API_CONFIG.video;
    this.isGenerating = false; // 生成状態フラグ
  }

  // Canvas初期化（AI設計図ベース）
  initCanvas(canvasRef, videoDesign) {
    console.log('🎬 Canvas初期化開始:', videoDesign?.canvas);
    
    this.canvas = canvasRef.current;
    if (!this.canvas) {
      throw new Error('Canvas reference not found');
    }
    
    this.ctx = this.canvas.getContext('2d');
    
    // AI設計図からCanvasサイズを設定
    if (videoDesign?.canvas) {
      this.canvas.width = videoDesign.canvas.width;
      this.canvas.height = videoDesign.canvas.height;
      console.log(`✅ Canvas サイズ設定: ${this.canvas.width}x${this.canvas.height}`);
    } else {
      // フォールバック
      this.canvas.width = 1920;
      this.canvas.height = 1080;
      console.warn('⚠️ AI設計図からサイズを取得できないため、デフォルト使用');
    }
    
    return this.canvas;
  }

  // 動画録画開始（強化版）
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
        
        // LoopControllerセッション終了
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

      // LoopController開始
      loopController.startSession(duration, this.recorder, (reason) => {
        console.error('🚨 強制停止:', reason);
        this.isGenerating = false;
        reject(new Error(`録画が強制停止されました: ${reason}`));
      });

      this.recorder.start();
    });
  }

  // 録画停止（安全版）
  stopRecording() {
    if (this.recorder) {
      console.log('⏸️ 録画停止要求 - 状態:', this.recorder.state);
      
      if (this.recorder.state === 'recording') {
        this.recorder.stop();
      } else {
        console.warn('⚠️ 録画停止: 既に停止済みまたは無効状態');
        loopController.endSession();
      }
    } else {
      console.warn('⚠️ 録画停止: recorder が存在しません');
    }
  }

  // AI設計図に基づく背景描画
  drawBackground(videoDesign) {
    const bgColor = videoDesign.canvas?.backgroundColor || '#1e3a8a,#7c3aed,#db2777';
    const colors = bgColor.split(',');
    
    if (colors.length > 1) {
      // グラデーション背景
      const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color.trim());
      });
      this.ctx.fillStyle = gradient;
    } else {
      // 単色背景
      this.ctx.fillStyle = colors[0].trim();
    }
    
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // 汎用テキスト描画（AI設計図ベース）
  drawText(text, x, y, fontSize, color, fontFamily = 'Arial', align = 'center', maxWidth = null) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    
    // テキストの影を追加（可読性向上）
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    
    if (maxWidth) {
      this.ctx.fillText(text, x, y, maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
    
    this.ctx.restore();
  }

  // 現在時刻に該当するシーンを取得
  getCurrentScene(scenes, currentTime) {
    return scenes.find(scene => 
      currentTime >= scene.startTime && currentTime < scene.endTime
    );
  }

  // シーンレンダリング（AI設計図ベース・強化版）
  renderScene(scene, progress, videoDesign, currentTime) {
    if (!scene) return;
    
    const { type, content } = scene;
    
    switch (type) {
      case 'title':
        this.renderTitleScene(content, videoDesign);
        break;
      case 'item':
        this.renderItemScene(content, videoDesign, currentTime);
        break;
      default:
        this.renderFallbackScene(content, videoDesign);
    }
  }

  // タイトルシーン描画（改良版）
  renderTitleScene(content, videoDesign) {
    // メインタイトル
    this.drawText(
      content.mainText,
      content.position?.x || this.canvas.width / 2,
      content.position?.y || (this.canvas.height * 0.3),
      content.fontSize || 70,
      content.fontColor || '#ffffff'
    );
    
    // サブテキストがあれば描画
    if (content.subText) {
      this.drawText(
        content.subText,
        content.position?.x || this.canvas.width / 2,
        (content.position?.y || (this.canvas.height * 0.3)) + 100,
        (content.fontSize || 70) * 0.6,
        content.fontColor || '#ffeb3b'
      );
    }

    // アクセント装飾
    this.drawAccentDecorations(videoDesign);
  }

  // アイテムシーン描画（AI設計図対応強化版）
  renderItemScene(content, videoDesign, currentTime) {
    const { rank, name, price, rating, features, colors, positions, fontSizes } = content;
    const isShort = videoDesign.canvas.width < videoDesign.canvas.height;
    
    // デフォルト値設定
    const defaultPositions = {
      rank: { x: this.canvas.width / 2, y: isShort ? 400 : 250 },
      name: { x: this.canvas.width / 2, y: isShort ? 500 : 350 },
      price: { x: this.canvas.width / 2, y: isShort ? 600 : 450 },
      features: { x: this.canvas.width / 2, y: isShort ? 700 : 550 }
    };
    
    const defaultFontSizes = {
      rank: isShort ? 120 : 150,
      name: isShort ? 45 : 60,
      price: isShort ? 35 : 45,
      features: isShort ? 25 : 32
    };
    
    const defaultColors = {
      rank: '#ffd700',
      name: '#ffffff',
      price: '#00ff88',
      features: '#87ceeb'
    };
    
    const pos = positions || defaultPositions;
    const sizes = fontSizes || defaultFontSizes;
    const cols = colors || defaultColors;
    
    // ランキング番号
    if (rank) {
      // ランク背景円
      this.ctx.save();
      this.ctx.fillStyle = cols.rank;
      this.ctx.beginPath();
      this.ctx.arc(pos.rank.x, pos.rank.y, sizes.rank * 0.8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      
      // ランク番号
      this.drawText(
        `${rank}位`,
        pos.rank.x,
        pos.rank.y,
        sizes.rank,
        '#000000'
      );
    }
    
    // 商品名
    if (name) {
      this.drawText(name, pos.name.x, pos.name.y, sizes.name, cols.name);
    }
    
    // 価格
    if (price) {
      this.drawText(price, pos.price.x, pos.price.y, sizes.price, cols.price);
    }
    
    // 評価
    if (rating) {
      const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
      this.drawText(
        `${stars} ${rating.toFixed(1)}`,
        pos.price.x,
        pos.price.y + 60,
        sizes.features,
        '#ffeb3b'
      );
    }
    
    // 特徴
    if (features && features.length > 0) {
      features.forEach((feature, index) => {
        this.drawText(
          `✓ ${feature}`,
          pos.features.x,
          pos.features.y + (index * 45),
          sizes.features,
          cols.features
        );
      });
    }

    // 動的エフェクト
    this.addDynamicEffects(currentTime, videoDesign);
  }

  // 動的エフェクト追加
  addDynamicEffects(currentTime, videoDesign) {
    // キラキラエフェクト
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const alpha = Math.sin(currentTime * 2 + i) * 0.5 + 0.5;
      
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.3})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  // アクセント装飾
  drawAccentDecorations(videoDesign) {
    // 上部装飾ライン
    this.ctx.save();
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width * 0.2, this.canvas.height * 0.15);
    this.ctx.lineTo(this.canvas.width * 0.8, this.canvas.height * 0.15);
    this.ctx.stroke();
    this.ctx.restore();
    
    // 下部装飾ライン
    this.ctx.save();
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width * 0.2, this.canvas.height * 0.85);
    this.ctx.lineTo(this.canvas.width * 0.8, this.canvas.height * 0.85);
    this.ctx.stroke();
    this.ctx.restore();
  }

  // フォールバックシーン描画
  renderFallbackScene(content, videoDesign) {
    this.drawText(
      content.name || content.mainText || 'AI設計動画',
      this.canvas.width / 2,
      this.canvas.height / 2,
      60,
      '#ffffff'
    );
  }

  // プログレスバー描画
  drawProgressBar(progress, videoDesign, currentTime, duration) {
    const barWidth = videoDesign.canvas.width * 0.6;
    const barHeight = 20;
    const x = (videoDesign.canvas.width - barWidth) / 2;
    const y = videoDesign.canvas.height - 80;

    // 背景
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    // プログレス
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.fillRect(x, y, barWidth * progress, barHeight);

    // 時間表示
    this.drawText(
      `${Math.floor(currentTime)}s / ${duration}s`,
      videoDesign.canvas.width / 2,
      videoDesign.canvas.height - 30,
      24,
      '#ffffff'
    );
  }

  // メイン生成関数（無限ループ修正版）
  async generateVideoFromDesign(videoDesign, onProgress) {
    console.log('🚀 AI設計図による動画生成開始:', videoDesign);
    
    // 重複生成防止
    if (this.isGenerating) {
      throw new Error('既に動画生成が実行中です');
    }
    
    this.isGenerating = true;
    
    try {
      // 時間設定の検証・修正
      const safeDuration = Math.max(Math.min(videoDesign.duration, 180), 15); // 15-180秒
      if (safeDuration !== videoDesign.duration) {
        console.warn(`⚠️ 動画時間を ${videoDesign.duration}s → ${safeDuration}s に調整`);
        videoDesign.duration = safeDuration;
      }
      
      // 録画開始
      const recordingPromise = this.startRecording(safeDuration);
      
      const startTime = Date.now();
      const targetDuration = safeDuration * 1000; // ミリ秒
      const scenes = videoDesign.scenes || [];
      
      console.log(`📋 動画設定: ${safeDuration}秒, シーン数: ${scenes.length}`);

      const animate = () => {
        // セッション状態確認
        if (!loopController.isSessionActive()) {
          console.warn('⚠️ セッションが非アクティブのため終了');
          return;
        }
        
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / targetDuration, 1);
        const currentTime = elapsed / 1000;

        // 背景描画
        this.drawBackground(videoDesign);

        // シーン描画
        const currentScene = this.getCurrentScene(scenes, currentTime);
        
        if (currentScene) {
          this.renderScene(currentScene, progress, videoDesign, currentTime);
        } else {
          // フォールバック
          this.drawText(
            videoDesign.title || 'AI設計動画',
            this.canvas.width / 2,
            this.canvas.height / 2,
            60,
            '#ffffff'
          );
        }

        // プログレスバー
        this.drawProgressBar(progress, videoDesign, currentTime, safeDuration);

        // プログレス通知
        if (onProgress) {
          onProgress(Math.floor(progress * 100));
        }

        // 終了条件確認（修正版）
        if (progress >= 1 || currentTime >= safeDuration) {
          console.log('🏁 アニメーション完了');
          // 少し待ってから録画停止（最後のフレームを確実に記録）
          setTimeout(() => {
            this.stopRecording();
          }, 200);
          return;
        }

        // 次のフレーム
        const animationId = requestAnimationFrame(animate);
        loopController.registerAnimation(animationId);
      };

      animate();
      return recordingPromise;

    } catch (error) {
      console.error('🚨 AI主導動画生成エラー:', error);
      this.isGenerating = false;
      loopController.forceStop('GENERATION_ERROR');
      throw error;
    } finally {
      // 必ず実行される後処理
      setTimeout(() => {
        this.isGenerating = false;
      }, 1000);
    }
  }

  // 後方互換性のためのラッパー関数
  async generateVideo(contentData, template, duration, format, onProgress) {
    console.log('⚠️ 後方互換性関数が呼ばれました。AI設計図版を推奨します。');
    
    // 旧形式を新形式に変換
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

// シングルトンインスタンス
const videoComposer = new VideoComposer();
export default videoComposer;