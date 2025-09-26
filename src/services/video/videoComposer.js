// src/services/video/videoComposer.js - 現代スライド形式（白背景+画像付き）

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
    console.log('🎬 現代スライド動画Canvas初期化:', videoDesign?.title);
    
    this.canvas = canvasRef.current;
    if (!this.canvas) throw new Error('Canvas not found');
    
    this.ctx = this.canvas.getContext('2d');
    
    const { width = 1080, height = 1920 } = videoDesign?.canvas || {};
    this.canvas.width = width;
    this.canvas.height = height;
    
    console.log(`✅ スライド動画Canvas: ${width}x${height}`);
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

  // 白背景
  drawWhiteBackground() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // スマホで読みやすい大きな文字
  drawLargeText(text, x, y, size, color = '#333333', options = {}) {
    const { 
      maxWidth = this.canvas.width * 0.9, 
      bold = true, 
      align = 'center',
      lineHeight = 1.3
    } = options;
    
    this.ctx.save();
    this.ctx.font = `${bold ? 'bold' : 'normal'} ${size}px "Hiragino Kaku Gothic ProN", "Hiragino Sans", Arial, sans-serif`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = color;
    
    // 改行処理（日本語対応）
    const lines = this.wrapText(text, maxWidth);
    const totalHeight = lines.length * size * lineHeight;
    const startY = y - (totalHeight / 2) + (size * lineHeight / 2);
    
    lines.forEach((line, index) => {
      const lineY = startY + (index * size * lineHeight);
      this.ctx.fillText(line, x, lineY);
    });
    
    this.ctx.restore();
  }

  // テキスト改行処理
  wrapText(text, maxWidth) {
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
    
    return lines;
  }

  // 画像プレースホルダー（将来的にUnsplash画像に置換）
  drawImagePlaceholder(x, y, width, height, label = '関連画像') {
    this.ctx.save();
    
    // 背景（薄いグレー）
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.fillRect(x, y, width, height);
    
    // 枠線
    this.ctx.strokeStyle = '#e9ecef';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, width, height);
    
    // 画像アイコン（簡易）
    this.ctx.fillStyle = '#dee2e6';
    this.ctx.fillRect(x + width/4, y + height/3, width/2, height/3);
    
    // ラベル
    this.ctx.fillStyle = '#6c757d';
    this.ctx.font = 'bold 28px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x + width/2, y + height - 40);
    
    this.ctx.restore();
  }

  // 番号バッジ（①②③）- 黒背景に変更
  drawNumberBadge(number, x, y, size = 60) {
    this.ctx.save();
    
    // 円背景（黒色に変更）
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 白い番号
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${size}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(number, x, y);
    
    this.ctx.restore();
  }

  // タイトルスライド
  renderTitleSlide(videoDesign) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // メインタイトル（大きく）
    this.drawLargeText(
      videoDesign.title || 'タイトル',
      centerX,
      centerY - 200,
      70,
      '#212529',
      { bold: true }
    );
    
    // サブタイトル（知って得する○選など）
    const itemCount = videoDesign.items?.length || 3;
    this.drawLargeText(
      `知って得する${itemCount}選`,
      centerX,
      centerY + 100,
      45,
      '#6c757d'
    );
    
    // 装飾的な画像エリア
    this.drawImagePlaceholder(
      this.canvas.width * 0.15,
      centerY + 200,
      this.canvas.width * 0.7,
      300,
      'メイン画像'
    );
  }

  // 項目スライド（①②③）- 1つの情報のみ表示
  renderItemSlide(item, itemNumber, subSlideIndex = 0) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    
    // 番号バッジ（上部左）
    this.drawNumberBadge(
      itemNumber,
      100,
      120,
      50
    );
    
    // 項目のサブスライドを分割表示
    const itemTitle = item.name || item.title || `項目${itemNumber}`;
    const mainContent = item.content?.main || item.description || '';
    const details = item.content?.details || '';
    
    // 上半分：文字エリア（0 〜 height/2）
    const textAreaHeight = this.canvas.height / 2;
    
    // 下半分：画像エリア（height/2 〜 height）
    const imageY = this.canvas.height / 2;
    const imageHeight = this.canvas.height / 2;
    
    // サブスライドによって表示内容を変更
    if (subSlideIndex === 0) {
      // サブスライド1: タイトルのみ
      this.drawLargeText(
        itemTitle,
        centerX,
        textAreaHeight * 0.5,
        60,
        '#000000',  // 黒文字に統一
        { bold: true }
      );
      
      // 下半分に関連画像
      this.drawImagePlaceholder(
        this.canvas.width * 0.1,
        imageY + 50,
        this.canvas.width * 0.8,
        imageHeight - 100,
        `${itemTitle}のイメージ`
      );
      
    } else if (subSlideIndex === 1 && mainContent) {
      // サブスライド2: メイン説明
      this.drawLargeText(
        itemTitle,
        centerX,
        textAreaHeight * 0.25,
        45,
        '#000000',  // 黒文字に統一
        { bold: true }
      );
      
      this.drawLargeText(
        mainContent,
        centerX,
        textAreaHeight * 0.7,
        40,
        '#000000'   // 黒文字に統一
      );
      
      // 下半分に関連画像
      this.drawImagePlaceholder(
        this.canvas.width * 0.1,
        imageY + 30,
        this.canvas.width * 0.8,
        imageHeight - 60,
        `${itemTitle}の具体例`
      );
      
    } else if (subSlideIndex === 2 && details) {
      // サブスライド3: 詳細・効果
      this.drawLargeText(
        '💡 ポイント',
        centerX,
        textAreaHeight * 0.25,
        45,
        '#000000',  // 黒文字に統一
        { bold: true }
      );
      
      this.drawLargeText(
        details,
        centerX,
        textAreaHeight * 0.7,
        38,
        '#000000'   // 黒文字に統一
      );
      
      // 下半分に関連画像
      this.drawImagePlaceholder(
        this.canvas.width * 0.1,
        imageY + 30,
        this.canvas.width * 0.8,
        imageHeight - 60,
        `${itemTitle}のコツ`
      );
    }
  }

  // まとめスライド
  renderSummarySlide(videoDesign) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    
    // 上半分：グッドボタン・チャンネル登録（統一フォーマット）
    const textAreaHeight = this.canvas.height / 2;
    
    this.drawLargeText(
      'この動画が役に立ったら\nグッドボタン👍\nチャンネル登録🔔\nお願いします！',
      centerX,
      textAreaHeight * 0.6,
      35,
      '#000000',  // 黒文字に統一
      { bold: true }
    );
    
    // 下半分：YouTube画像（統一フォーマット）
    const imageY = this.canvas.height / 2;
    const imageHeight = this.canvas.height / 2;
    
    this.drawImagePlaceholder(
      this.canvas.width * 0.1,
      imageY + 50,
      this.canvas.width * 0.8,
      imageHeight - 100,
      'YouTube画面イメージ'
    );
  }

  // メインの動画生成（スライド形式）
  async generateVideoFromDesign(videoDesign, onProgress) {
    console.log('🚀 現代スライド動画生成開始:', {
      title: videoDesign.title,
      duration: videoDesign.duration,
      items: videoDesign.items?.length || 0
    });
    
    if (this.isGenerating) throw new Error('既に生成中');
    this.isGenerating = true;
    
    try {
      const duration = Math.max(Math.min(videoDesign.duration || 30, 180), 15);
      console.log(`📱 スライド動画時間: ${duration}秒`);
      
      const recordingPromise = this.startRecording(duration);
      const startTime = Date.now();
      const targetMs = duration * 1000;
      
      // スライド構成計算（情報分割版）
      const itemCount = videoDesign.items?.length || 3;
      const subSlidesPerItem = 3; // 各項目を3つのサブスライドに分割
      const totalSlides = 1 + (itemCount * subSlidesPerItem) + 1; // タイトル + 分割項目 + まとめ
      const slideTime = duration / totalSlides; // 各スライドの時間（短く）
      
      console.log(`📊 分割スライド構成: ${totalSlides}スライド, 各${slideTime.toFixed(1)}秒`);
      
      const animate = () => {
        if (!loopController.isSessionActive()) return;
        
        const elapsed = Date.now() - startTime;
        const currentTime = elapsed / 1000;
        const progress = Math.min(elapsed / targetMs, 1);
        
        // 現在のスライドを判定（分割版）
        const currentSlideIndex = Math.floor(currentTime / slideTime);
        
        if (currentSlideIndex === 0) {
          // タイトルスライド
          this.renderTitleSlide(videoDesign);
        } else if (currentSlideIndex <= itemCount * subSlidesPerItem) {
          // 項目スライド（分割版）
          const adjustedIndex = currentSlideIndex - 1;
          const itemIndex = Math.floor(adjustedIndex / subSlidesPerItem);
          const subSlideIndex = adjustedIndex % subSlidesPerItem;
          
          const currentItem = videoDesign.items?.[itemIndex];
          if (currentItem) {
            this.renderItemSlide(currentItem, itemIndex + 1, subSlideIndex);
          }
        } else {
          // まとめスライド
          this.renderSummarySlide(videoDesign);
        }
        
        // プログレス通知
        if (onProgress) onProgress(Math.floor(progress * 100));
        
        // 終了判定
        if (progress >= 1 || currentTime >= duration) {
          console.log('🏁 スライド動画完成！');
          setTimeout(() => this.stopRecording(), 200);
          return;
        }
        
        const animationId = requestAnimationFrame(animate);
        loopController.registerAnimation(animationId);
      };
      
      animate();
      return recordingPromise;
      
    } catch (error) {
      console.error('🚨 スライド動画生成エラー:', error);
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