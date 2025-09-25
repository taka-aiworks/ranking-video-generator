// src/services/video/videoComposer.js - シンプル&モダン版

import { API_CONFIG } from '../../config/api.js';
import loopController from './loopController.js';

class VideoComposer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.recorder = null;
    this.isGenerating = false;
  }

  initCanvas(canvasRef, videoDesign) {
    console.log('🎬 シンプルモダン動画Canvas初期化:', videoDesign?.title);
    
    this.canvas = canvasRef.current;
    if (!this.canvas) throw new Error('Canvas not found');
    
    this.ctx = this.canvas.getContext('2d');
    
    const { width = 1080, height = 1920 } = videoDesign?.canvas || {};
    this.canvas.width = width;
    this.canvas.height = height;
    
    console.log(`✅ シンプルCanvas: ${width}x${height}`);
    return this.canvas;
  }

  startRecording(duration) {
    const stream = this.canvas.captureStream(30);
    this.recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

    return new Promise((resolve, reject) => {
      const chunks = [];
      
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
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
      loopController.startSession(duration, this.recorder, reject);
      this.recorder.start();
    });
  }

  stopRecording() {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
    }
    loopController.endSession();
  }

  // シンプルな白背景
  drawBackground() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // クリーンなテキスト描画
  drawCleanText(text, x, y, size, color = '#000000', options = {}) {
    const { bold = true, maxWidth = this.canvas.width * 0.8 } = options;
    
    this.ctx.save();
    this.ctx.font = `${bold ? 'bold' : 'normal'} ${size}px "Hiragino Kaku Gothic ProN", "Hiragino Sans", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = color;
    
    // 改行処理
    const words = text.split('');
    const lines = [];
    let currentLine = '';
    
    for (const char of words) {
      const testLine = currentLine + char;
      const testWidth = this.ctx.measureText(testLine).width;
      
      if (testWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    const lineHeight = size * 1.2;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    
    lines.forEach((line, index) => {
      const lineY = startY + (index * lineHeight);
      this.ctx.fillText(line, x, lineY);
    });
    
    this.ctx.restore();
  }

  // プレースホルダー画像（グレーボックス）
  drawImagePlaceholder(x, y, width, height, label = '画像') {
    this.ctx.save();
    
    // 背景
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(x, y, width, height);
    
    // 枠線
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
    
    // ラベル
    this.ctx.fillStyle = '#999999';
    this.ctx.font = '24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x + width/2, y + height/2);
    
    this.ctx.restore();
  }

  // シンプルな構成：上部テキスト + 下部画像（プログレスバー削除）
  renderSimpleLayout(videoDesign, currentTime) {
    const centerX = this.canvas.width / 2;
    
    // 動画進行に応じてコンテンツ切り替え
    const totalDuration = videoDesign.duration;
    const itemCount = videoDesign.items?.length || 3;
    const itemDuration = totalDuration / (itemCount + 1); // +1はタイトル用
    
    if (currentTime < itemDuration) {
      // タイトル画面
      this.renderTitleScreen(videoDesign, centerX);
    } else {
      // 各項目画面
      const itemIndex = Math.floor((currentTime - itemDuration) / itemDuration);
      const currentItem = videoDesign.items?.[itemIndex];
      
      if (currentItem) {
        this.renderItemScreen(currentItem, itemIndex + 1, centerX);
      }
    }
    
    // プログレスバー削除（不要）
  }

  // タイトル画面
  renderTitleScreen(videoDesign, centerX) {
    // メインタイトル（上部、黒文字）
    this.drawCleanText(
      videoDesign.title || 'タイトル',
      centerX,
      this.canvas.height * 0.2,
      50,
      '#000000'
    );
    
    // 画像エリア（下部）
    this.drawImagePlaceholder(
      this.canvas.width * 0.1,
      this.canvas.height * 0.4,
      this.canvas.width * 0.8,
      this.canvas.height * 0.4,
      'メイン画像'
    );
  }

  // 項目画面
  renderItemScreen(item, itemNumber, centerX) {
    // 番号（小さく、上部左）
    this.drawCleanText(
      `${itemNumber}`,
      80,
      150,
      40,
      '#666666'
    );
    
    // 項目タイトル（上部中央、黒文字）
    const itemTitle = item.name || item.title || `項目${itemNumber}`;
    this.drawCleanText(
      itemTitle,
      centerX,
      this.canvas.height * 0.15,
      45,
      '#000000'
    );
    
    // 説明文（上部、黒文字）
    const description = item.content?.main || item.description;
    if (description) {
      this.drawCleanText(
        description,
        centerX,
        this.canvas.height * 0.25,
        32,
        '#333333'
      );
    }
    
    // 詳細（上部、グレー文字）
    const details = item.content?.details;
    if (details) {
      this.drawCleanText(
        details,
        centerX,
        this.canvas.height * 0.32,
        24,
        '#666666'
      );
    }
    
    // 関連画像（下部）
    this.drawImagePlaceholder(
      this.canvas.width * 0.1,
      this.canvas.height * 0.45,
      this.canvas.width * 0.8,
      this.canvas.height * 0.4,
      `${itemTitle}の画像`
    );
  }

  // シンプルなプログレスバー（削除済み - 不要）
  // drawSimpleProgress関数は削除

  // メイン生成関数（シンプル版）
  async generateVideoFromDesign(videoDesign, onProgress) {
    console.log('🚀 シンプルモダン動画生成開始:', {
      title: videoDesign.title,
      duration: videoDesign.duration,
      items: videoDesign.items?.length || 0
    });
    
    if (this.isGenerating) throw new Error('既に生成中');
    this.isGenerating = true;
    
    try {
      const duration = Math.max(Math.min(videoDesign.duration || 30, 180), 15);
      console.log(`📱 シンプル動画時間: ${duration}秒`);
      
      const recordingPromise = this.startRecording(duration);
      const startTime = Date.now();
      const targetMs = duration * 1000;
      
      const animate = () => {
        if (!loopController.isSessionActive()) return;
        
        const elapsed = Date.now() - startTime;
        const currentTime = elapsed / 1000;
        const progress = Math.min(elapsed / targetMs, 1);
        
        // 白背景
        this.drawBackground();
        
        // シンプルな構成
        this.renderSimpleLayout(videoDesign, currentTime);
        
        // プログレス通知
        if (onProgress) onProgress(Math.floor(progress * 100));
        
        // 終了判定
        if (progress >= 1 || currentTime >= duration) {
          console.log('🏁 シンプルモダン動画完成！');
          setTimeout(() => this.stopRecording(), 200);
          return;
        }
        
        const animationId = requestAnimationFrame(animate);
        loopController.registerAnimation(animationId);
      };
      
      animate();
      return recordingPromise;
      
    } catch (error) {
      console.error('🚨 シンプル動画生成エラー:', error);
      this.isGenerating = false;
      loopController.forceStop('ERROR');
      throw error;
    } finally {
      setTimeout(() => { this.isGenerating = false; }, 1000);
    }
  }
}

const videoComposer = new VideoComposer();
export default videoComposer;