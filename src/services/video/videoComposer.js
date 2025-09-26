// src/services/video/videoComposer.js - デバッグログ強化版

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
    console.log('🎬 Canvas初期化:', videoDesign?.title);
    
    this.canvas = canvasRef.current;
    if (!this.canvas) throw new Error('Canvas not found');
    
    this.ctx = this.canvas.getContext('2d');
    
    const { width = 1080, height = 1920 } = videoDesign?.canvas || {};
    this.canvas.width = width;
    this.canvas.height = height;
    
    console.log(`✅ Canvas: ${width}x${height}`);
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

  // 大きな文字
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

  // 🆕 画像描画デバッグ強化
  drawActualImage(optimizedImage, x, y, width, height) {
      ('🖼️ drawActualImage呼び出し:', {
      hasOptimizedImage: !!optimizedImage,
      hasCanvas: !!(optimizedImage?.canvas),
      isPlaceholder: optimizedImage?.isPlaceholder,
      x, y, width, height
    });

    if (!optimizedImage) {
      console.log('⚠️ optimizedImage が null/undefined');
      this.drawImagePlaceholder(x, y, width, height, '画像なし');
      return false;
    }

    try {
      if (optimizedImage.canvas) {
        //console.log('✅ Canvas描画実行:', optimizedImage.canvas.width + 'x' + optimizedImage.canvas.height);
        this.ctx.drawImage(optimizedImage.canvas, x, y, width, height);
        return true;
      } else if (optimizedImage.isPlaceholder) {
        console.log('📝 プレースホルダー描画:', optimizedImage.keyword);
        this.ctx.save();
        this.ctx.fillStyle = optimizedImage.backgroundColor || '#f8f9fa';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#dee2e6';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.fillStyle = '#6c757d';
        this.ctx.font = 'bold 32px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(optimizedImage.keyword || '関連画像', x + width/2, y + height/2);
        this.ctx.restore();
        return true;
      } else {
        console.log('⚠️ optimizedImage形式不正:', Object.keys(optimizedImage));
      }
    } catch (error) {
      console.error('🚨 画像描画エラー:', error);
    }
    
    this.drawImagePlaceholder(x, y, width, height, '画像エラー');
    return false;
  }

  // 画像プレースホルダー
  drawImagePlaceholder(x, y, width, height, label = '関連画像') {
    this.ctx.save();
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeStyle = '#e9ecef';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.fillStyle = '#dee2e6';
    this.ctx.fillRect(x + width/4, y + height/3, width/2, height/3);
    this.ctx.fillStyle = '#6c757d';
    this.ctx.font = 'bold 28px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x + width/2, y + height - 40);
    this.ctx.restore();
  }

  // 番号バッジ
  drawNumberBadge(number, x, y, size = 60) {
    this.ctx.save();
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${size}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(number, x, y);
    this.ctx.restore();
  }

  // タイトルスライド描画（ログ最適化版）
  renderTitleSlide(videoDesign, slideImages = []) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // タイトル
    this.drawLargeText(
      videoDesign.title || 'タイトル',
      centerX,
      centerY - 200,
      70,
      '#212529',
      { bold: true }
    );
    
    // サブタイトル
    const itemCount = videoDesign.items?.length || 3;
    this.drawLargeText(
      `知って得する${itemCount}選`,
      centerX,
      centerY + 100,
      45,
      '#6c757d'
    );
    
    // 画像描画
    const titleImage = slideImages.find(img => img.type === 'title');
    const imageX = this.canvas.width * 0.15;
    const imageY = centerY + 200;
    const imageWidth = this.canvas.width * 0.7;
    const imageHeight = 300;
    
    if (titleImage?.optimized) {
      this.drawActualImage(titleImage.optimized, imageX, imageY, imageWidth, imageHeight);
    } else {
      this.drawImagePlaceholder(imageX, imageY, imageWidth, imageHeight, 'メイン画像');
    }
  }

  // 項目スライド描画（ログ最適化版）
  renderItemSlide(item, itemNumber, subSlideIndex = 0, slideImages = []) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    this.drawNumberBadge(itemNumber, 100, 120, 50);
    
    const itemTitle = item.name || item.title || `項目${itemNumber}`;
    const mainContent = item.content?.main || item.description || '';
    const details = item.content?.details || '';
    
    const textAreaHeight = this.canvas.height / 2;
    const imageX = this.canvas.width * 0.1;
    const imageY = this.canvas.height / 2;
    const imageWidth = this.canvas.width * 0.8;
    const imageHeight = this.canvas.height / 2;
    
    // 画像検索・描画
    const itemImage = slideImages.find(img => 
      img.type === 'item' && 
      img.itemIndex === (itemNumber - 1) && 
      img.subSlideIndex === subSlideIndex
    );
    
    if (subSlideIndex === 0) {
      this.drawLargeText(itemTitle, centerX, textAreaHeight * 0.5, 60, '#000000', { bold: true });
      if (itemImage?.optimized) {
        this.drawActualImage(itemImage.optimized, imageX, imageY + 50, imageWidth, imageHeight - 100);
      } else {
        this.drawImagePlaceholder(imageX, imageY + 50, imageWidth, imageHeight - 100, `${itemTitle}のイメージ`);
      }
    } else if (subSlideIndex === 1 && mainContent) {
      this.drawLargeText(itemTitle, centerX, textAreaHeight * 0.25, 45, '#000000', { bold: true });
      this.drawLargeText(mainContent, centerX, textAreaHeight * 0.7, 40, '#000000');
      if (itemImage?.optimized) {
        this.drawActualImage(itemImage.optimized, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else {
        this.drawImagePlaceholder(imageX, imageY + 30, imageWidth, imageHeight - 60, `${itemTitle}の具体例`);
      }
    } else if (subSlideIndex === 2 && details) {
      this.drawLargeText('💡 ポイント', centerX, textAreaHeight * 0.25, 45, '#000000', { bold: true });
      this.drawLargeText(details, centerX, textAreaHeight * 0.7, 38, '#000000');
      if (itemImage?.optimized) {
        this.drawActualImage(itemImage.optimized, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else {
        this.drawImagePlaceholder(imageX, imageY + 30, imageWidth, imageHeight - 60, `${itemTitle}のコツ`);
      }
    }
  }

  // まとめスライド描画（ログ最適化版）
  renderSummarySlide(videoDesign, slideImages = []) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    const textAreaHeight = this.canvas.height / 2;
    
    this.drawLargeText(
      'この動画が役に立ったら\nグッドボタン👍\nチャンネル登録🔔\nお願いします！',
      centerX,
      textAreaHeight * 0.6,
      35,
      '#000000',
      { bold: true }
    );
    
    const summaryImage = slideImages.find(img => img.type === 'summary');
    const imageX = this.canvas.width * 0.1;
    const imageY = this.canvas.height / 2;
    const imageWidth = this.canvas.width * 0.8;
    const imageHeight = this.canvas.height / 2;
    
    if (summaryImage?.optimized) {
      this.drawActualImage(summaryImage.optimized, imageX, imageY + 50, imageWidth, imageHeight - 100);
    } else {
      this.drawImagePlaceholder(imageX, imageY + 50, imageWidth, imageHeight - 100, 'いいね・チャンネル登録');
    }
  }

  // 🆕 画像付き動画生成 - 詳細デバッグ追加
  async generateVideoWithImages(videoDesign, slideImages, onProgress) {
    // 🚨 この部分が重要！パラメータ受け取り確認
    console.log('🎬 generateVideoWithImages 呼び出し確認:', {
      videoDesignTitle: videoDesign?.title,
      slideImagesType: typeof slideImages,
      slideImagesIsArray: Array.isArray(slideImages),
      slideImagesLength: slideImages ? slideImages.length : 'undefined',
      slideImagesContent: slideImages
    });

    // 安全なデフォルト値
    const safeSlideImages = slideImages || [];
    
    console.log('🖼️ safeSlideImages 処理後:', {
      length: safeSlideImages.length,
      types: safeSlideImages.map(img => img.type),
      sample: safeSlideImages[0]
    });
    
    if (this.isGenerating) throw new Error('既に生成中');
    this.isGenerating = true;
    
    try {
      const duration = Math.max(Math.min(videoDesign.duration || 30, 180), 15);
      const recordingPromise = this.startRecording(duration);
      const startTime = Date.now();
      const targetMs = duration * 1000;
      
      const itemCount = videoDesign.items?.length || 3;
      const subSlidesPerItem = 3;
      const totalSlides = 1 + (itemCount * subSlidesPerItem) + 1;
      const slideTime = duration / totalSlides;
      
      console.log('🎬 動画生成設定:', {
        duration,
        itemCount,
        totalSlides,
        slideTime,
        safeSlideImagesCount: safeSlideImages.length
      });
      
      const animate = () => {
        if (!loopController.isSessionActive()) return;
        
        const elapsed = Date.now() - startTime;
        const currentTime = elapsed / 1000;
        const progress = Math.min(elapsed / targetMs, 1);
        const currentSlideIndex = Math.floor(currentTime / slideTime);
        
        if (currentSlideIndex === 0) {
          this.renderTitleSlide(videoDesign, safeSlideImages);
        } else if (currentSlideIndex <= itemCount * subSlidesPerItem) {
          const adjustedIndex = currentSlideIndex - 1;
          const itemIndex = Math.floor(adjustedIndex / subSlidesPerItem);
          const subSlideIndex = adjustedIndex % subSlidesPerItem;
          const currentItem = videoDesign.items?.[itemIndex];
          if (currentItem) {
            this.renderItemSlide(currentItem, itemIndex + 1, subSlideIndex, safeSlideImages);
          }
        } else {
          this.renderSummarySlide(videoDesign, safeSlideImages);
        }
        
        if (onProgress) onProgress(Math.floor(progress * 100));
        
        if (progress >= 1 || currentTime >= duration) {
          console.log('🏁 画像付き動画完成！');
          setTimeout(() => this.stopRecording(), 200);
          return;
        }
        
        const animationId = requestAnimationFrame(animate);
        loopController.registerAnimation(animationId);
      };
      
      animate();
      return recordingPromise;
      
    } catch (error) {
      console.error('🚨 画像付き動画エラー:', error);
      this.isGenerating = false;
      loopController.forceStop('ERROR');
      throw error;
    } finally {
      setTimeout(() => { this.isGenerating = false; }, 1000);
    }
  }

  // 従来版動画生成
  async generateVideoFromDesign(videoDesign, onProgress) {
    console.log('🎬 generateVideoFromDesign (従来版) 呼び出し');
    return this.generateVideoWithImages(videoDesign, [], onProgress);
  }
}

const videoComposer = new VideoComposer();
export default videoComposer;