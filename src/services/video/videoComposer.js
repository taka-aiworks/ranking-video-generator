// src/services/video/videoComposer.js - スライド別画像取得修正版

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

  // シンプルな録画開始
  startRecording(duration) {
    const stream = this.canvas.captureStream(30);
    this.recorder = new MediaRecorder(stream);
    
    const chunks = [];
    this.recorder.ondataavailable = e => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        console.log('📦 データチャンク追加:', e.data.size, 'bytes');
      }
    };
    
    console.log('🔴 録画開始...', duration/1000 + 's');
    
    return new Promise((resolve, reject) => {
      this.recorder.onstop = () => {
        console.log('⏹️ 録画停止、ファイル作成中...');
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(videoBlob);
        
        console.log('✅ 動画ファイル作成完了:', (videoBlob.size / (1024*1024)).toFixed(2) + 'MB');
        
        resolve({
          blob: videoBlob,
          url: url,
          size: (videoBlob.size / (1024*1024)).toFixed(2) + 'MB'
        });
      };
      
      this.recorder.onerror = reject;
      this.recorder.start();
      
      const actualDuration = duration + 15000;
      console.log('⏰ 録画タイマー設定:', actualDuration/1000 + '秒');
      
      setTimeout(() => {
        console.log('⏰ タイマー到達 - 録画停止実行');
        if (this.recorder && this.recorder.state === 'recording') {
          this.recorder.stop();
        }
      }, actualDuration);
    });
  }

  // 画像付き動画生成
  async generateVideoWithImages(videoDesign, slideImages, onProgress) {
    const safeSlideImages = slideImages || [];
    console.log('🖼️ slideImages受信:', safeSlideImages.length, '件');

    if (this.isGenerating) {
      throw new Error('Already generating video');
    }

    this.isGenerating = true;
    const totalDuration = (videoDesign.duration || 30) * 1000;

    try {
      loopController.startSession(
        (totalDuration / 1000) + 25,
        this.recorder, 
        (reason) => {
          console.error('🚨 強制停止:', reason);
          throw new Error(`録画が強制停止されました: ${reason}`);
        }
      );
      
      console.log('🔴 録画処理開始');
      const recording = this.startRecording(totalDuration);
      console.log('✅ MediaRecorder開始完了');
      
      let currentSlideIndex = 0;
      const totalSlides = 1 + (videoDesign.items.length * 3) + 1;
      
      console.log('📋 スライド計画:', totalSlides + 'スライド予定');
      
      // タイトルスライド
      console.log(`📍 [${currentSlideIndex+1}/${totalSlides}] タイトルスライド描画`);
      const titleImage = this.getSlideImage(safeSlideImages, currentSlideIndex);
      this.renderTitleSlide(videoDesign, titleImage);
      
      await this.sleep(3000);
      currentSlideIndex++;

      // 各項目のスライド
      for (let i = 0; i < videoDesign.items.length; i++) {
        const item = videoDesign.items[i];
        
        for (let j = 0; j < 3; j++) {
          console.log(`📍 [${currentSlideIndex+1}/${totalSlides}] 項目${i+1} サブ${j+1} 描画`);
          
          const itemImage = this.getSlideImage(safeSlideImages, currentSlideIndex);
          
          this.renderItemSlide(item, i + 1, j, itemImage);
          
          await this.sleep(4000);
          currentSlideIndex++;
          
          if (onProgress) {
            const progress = (currentSlideIndex / totalSlides) * 100;
            onProgress(Math.round(progress));
            console.log('📊 進捗:', Math.round(progress) + '%');
          }
        }
      }

      // まとめスライド
      console.log(`📍 [${currentSlideIndex+1}/${totalSlides}] まとめスライド描画`);
      const summaryImage = this.getSlideImage(safeSlideImages, currentSlideIndex);
      this.renderSummarySlide(videoDesign, summaryImage);
      
      await this.sleep(5000);
      
      console.log('🏁 全スライド描画完了、録画停止待機');
      const videoData = await recording;
      
      loopController.endSession();
      
      console.log('✅ 画像付き動画生成完了');
      
      return {
        success: true,
        videoBlob: videoData.blob,
        url: videoData.url,
        duration: totalDuration / 1000,
        slideCount: currentSlideIndex + 1,
        imagesUsed: safeSlideImages.length,
        size: videoData.size
      };
      
    } catch (error) {
      console.error('🚨 画像付き動画生成エラー:', error);
      
      if (loopController.isSessionActive && loopController.isSessionActive()) {
        loopController.endSession();
      }
      
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  // 🎯 修正箇所: getSlideImage メソッド（スライド別画像取得）
  getSlideImage(slideImages, slideIndex) {
    if (!slideImages || slideImages.length === 0) {
      console.log(`❌ スライド${slideIndex}: 画像配列が空`);
      return null;
    }
    
    console.log(`🔍 スライド${slideIndex}の画像を検索...`);
    console.log('📦 利用可能な画像配列:', slideImages.length, '件');
    
    // 🔧 修正1: 直接インデックスアクセス（最優先）
    if (slideImages[slideIndex]) {
      const image = slideImages[slideIndex];
      console.log(`✅ スライド${slideIndex}画像取得:`, image.keyword?.substring(0, 20) + '...');
      return image;
    }
    
    // 🔧 修正2: slideIndexプロパティで検索
    const foundByProperty = slideImages.find(img => img.slideIndex === slideIndex);
    if (foundByProperty) {
      console.log(`✅ スライド${slideIndex}画像取得(プロパティ検索):`, foundByProperty.keyword?.substring(0, 20) + '...');
      return foundByProperty;
    }
    
    // 🔧 修正3: 循環参照でフォールバック（重複回避）
    const fallbackIndex = slideIndex % slideImages.length;
    const fallbackImage = slideImages[fallbackIndex];
    if (fallbackImage) {
      console.log(`⚠️ スライド${slideIndex}画像なし - フォールバック[${fallbackIndex}]使用:`, fallbackImage.keyword?.substring(0, 20) + '...');
      return fallbackImage;
    }
    
    console.log(`❌ スライド${slideIndex}画像なし - プレースホルダー使用`);
    return null;
  }

  // タイトルスライド描画
  renderTitleSlide(videoDesign, slideImage = null) {
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
    
    // 画像描画
    const imageX = this.canvas.width * 0.15;
    const imageY = centerY + 200;
    const imageWidth = this.canvas.width * 0.7;
    const imageHeight = 300;
    
    if (slideImage?.optimized?.canvas) {
      console.log('✅ タイトル画像描画');
      this.drawActualImage(slideImage.optimized.canvas, imageX, imageY, imageWidth, imageHeight);
    } else {
      this.drawImagePlaceholder(imageX, imageY, imageWidth, imageHeight, 'メイン画像');
    }
  }

  // 項目スライド描画
  renderItemSlide(item, itemNumber, subSlideIndex = 0, slideImage = null) {
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
    
    if (subSlideIndex === 0) {
      this.drawLargeText(itemTitle, centerX, textAreaHeight * 0.5, 60, '#000000', { bold: true });
      if (slideImage?.optimized?.canvas) {
        this.drawActualImage(slideImage.optimized.canvas, imageX, imageY + 50, imageWidth, imageHeight - 100);
      } else {
        this.drawImagePlaceholder(imageX, imageY + 50, imageWidth, imageHeight - 100, `${itemTitle}のイメージ`);
      }
    } else if (subSlideIndex === 1 && mainContent) {
      this.drawLargeText(itemTitle, centerX, textAreaHeight * 0.25, 45, '#000000', { bold: true });
      this.drawLargeText(mainContent, centerX, textAreaHeight * 0.7, 40, '#000000');
      if (slideImage?.optimized?.canvas) {
        this.drawActualImage(slideImage.optimized.canvas, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else {
        this.drawImagePlaceholder(imageX, imageY + 30, imageWidth, imageHeight - 60, `${itemTitle}の具体例`);
      }
    } else if (subSlideIndex === 2 && details) {
      this.drawLargeText('💡 ポイント', centerX, textAreaHeight * 0.25, 45, '#000000', { bold: true });
      this.drawLargeText(details, centerX, textAreaHeight * 0.7, 38, '#000000');
      if (slideImage?.optimized?.canvas) {
        this.drawActualImage(slideImage.optimized.canvas, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else {
        this.drawImagePlaceholder(imageX, imageY + 30, imageWidth, imageHeight - 60, `${itemTitle}のコツ`);
      }
    }
  }

  // まとめスライド描画
  renderSummarySlide(videoDesign, slideImage = null) {
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
    
    // まとめ画像
    const imageX = this.canvas.width * 0.2;
    const imageY = this.canvas.height * 0.7;
    const imageWidth = this.canvas.width * 0.6;
    const imageHeight = 200;
    
    if (slideImage?.optimized?.canvas) {
      this.drawActualImage(slideImage.optimized.canvas, imageX, imageY, imageWidth, imageHeight);
    } else {
      this.drawImagePlaceholder(imageX, imageY, imageWidth, imageHeight, 'いいね＆チャンネル登録');
    }
  }

  // 通常の動画生成（画像なし）
  async generateVideo(videoDesign, onProgress) {
    console.log('🎬 通常動画生成開始');
    return this.generateVideoWithImages(videoDesign, [], onProgress);
  }

  // 実際の画像描画
  drawActualImage(canvas, x, y, width, height) {
    try {
      this.ctx.drawImage(canvas, x, y, width, height);
    } catch (error) {
      console.error('🚨 画像描画エラー:', error);
      this.drawImagePlaceholder(x, y, width, height, 'エラー');
    }
  }

  // プレースホルダー画像描画
  drawImagePlaceholder(x, y, width, height, text = '画像') {
    this.ctx.save();
    
    // 背景
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.fillRect(x, y, width, height);
    
    // 枠線
    this.ctx.strokeStyle = '#dee2e6';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
    
    // テキスト
    this.ctx.fillStyle = '#6c757d';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x + width/2, y + height/2);
    
    this.ctx.restore();
  }

  // 白背景描画
  drawWhiteBackground() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // 大きなテキスト描画
  drawLargeText(text, x, y, fontSize = 32, color = '#000000', options = {}) {
    this.ctx.save();
    
    const weight = options.bold ? 'bold' : 'normal';
    this.ctx.font = `${weight} ${fontSize}px Arial`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = y - (totalHeight / 2) + (lineHeight / 2);
    
    lines.forEach((line, index) => {
      this.ctx.fillText(line, x, startY + (index * lineHeight));
    });
    
    this.ctx.restore();
  }

  // 番号バッジ描画
  drawNumberBadge(number, x, y, radius) {
    this.ctx.save();
    
    // 円描画
    this.ctx.fillStyle = '#007bff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // 番号描画
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(number.toString(), x, y);
    
    this.ctx.restore();
  }

  // Sleep関数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // クリーンアップ
  cleanup() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.isGenerating = false;
    console.log('🧹 VideoComposer クリーンアップ完了');
  }
}

const videoComposer = new VideoComposer();
export default videoComposer;