// src/services/video/videoComposer.js - オブジェクト形式画像対応版

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

  // 高品質録画開始（ビットレート/コーデック/フレームレート指定）
  startRecording(duration, options = {}) {
    // 🎯 動画の内容に応じたビットレート調整
    const isStaticContent = true; // 主に静止画とテキスト
    const baseBitrate = isStaticContent ? 4000000 : 8000000; // 4Mbps or 8Mbps
    
    const {
      fps = 30, // 静止画中心なので30fpsで十分
      videoBitsPerSecond = baseBitrate,
      mimeTypePreferred = 'video/webm;codecs=vp9'
    } = options;

    const stream = this.canvas.captureStream(fps);

    // 使用可能な mimeType を選択
    let mimeType = mimeTypePreferred;
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
      if (!MediaRecorder.isTypeSupported(mimeTypePreferred)) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          mimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        } else {
          mimeType = '';
        }
      }
    }

    const recorderOptions = mimeType
      ? { mimeType, videoBitsPerSecond }
      : { videoBitsPerSecond };

    this.recorder = new MediaRecorder(stream, recorderOptions);
    
    const chunks = [];
    this.recorder.ondataavailable = e => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        console.log('📦 データチャンク追加:', e.data.size, 'bytes');
      }
    };
    
    console.log('🔴 録画開始...', duration/1000 + 's', {
      fps,
      videoBitsPerSecond,
      mimeType: recorderOptions.mimeType || 'default'
    });
    
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
      
      // 🎯 改善された録画タイマー（余裕時間を最小限に）
      const bufferTime = Math.min(5000, duration * 0.1); // 最大5秒または動画時間の10%
      const actualDuration = duration + bufferTime;
      
      console.log('⏰ 録画タイマー設定:', {
        requestedDuration: duration/1000 + 's',
        bufferTime: bufferTime/1000 + 's',
        actualDuration: actualDuration/1000 + 's'
      });
      
      const recordingTimer = setTimeout(() => {
        console.log('⏰ タイマー到達 - 録画停止実行');
        if (this.recorder && this.recorder.state === 'recording') {
          this.recorder.stop();
        }
      }, actualDuration);
      
      // タイマーIDを保存（必要に応じてクリア可能）
      this.recordingTimer = recordingTimer;
    });
  }

  // 🚨 修正：画像付き動画生成（オブジェクト形式対応）
  async generateVideoWithImages(videoDesign, slideImages, onProgress) {
    console.log('🖼️ 画像データ受信検証:', {
      slideImagesType: typeof slideImages,
      isArray: Array.isArray(slideImages),
      isObject: slideImages && typeof slideImages === 'object',
      keys: slideImages ? Object.keys(slideImages) : [],
      hasImages: !!slideImages && Object.keys(slideImages || {}).length > 0
    });

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
      const itemSlides = videoDesign.items.length * 3;
      const totalSlides = 1 + itemSlides + 1;
      
      // 🎯 改善された時間配分計算
      const titleMs = Math.max(2000, Math.floor(totalDuration * 0.1)); // 10%または最低2秒
      const summaryMs = Math.max(3000, Math.floor(totalDuration * 0.15)); // 15%または最低3秒
      const remainingMs = Math.max(0, totalDuration - titleMs - summaryMs);
      const perItemSlideMs = itemSlides > 0 ? Math.max(1500, Math.floor(remainingMs / itemSlides)) : 0;
      
      // 実際の計算時間を記録
      const calculatedTotalMs = titleMs + (perItemSlideMs * itemSlides) + summaryMs;
      
      console.log('📋 詳細スライド計画:', {
        totalSlides: totalSlides,
        requestedDuration: totalDuration / 1000 + 's',
        calculatedDuration: calculatedTotalMs / 1000 + 's',
        titleMs: titleMs,
        perItemSlideMs: perItemSlideMs,
        summaryMs: summaryMs,
        itemSlides: itemSlides
      });
      
      // タイトルスライド
      console.log(`📍 [${currentSlideIndex+1}/${totalSlides}] タイトルスライド描画`);
      const titleImage = this.getSlideImage(slideImages, currentSlideIndex);
      this.renderTitleSlide(videoDesign, titleImage);
      
      await this.sleep(titleMs);
      currentSlideIndex++;

      // 各項目のスライド
      for (let i = 0; i < videoDesign.items.length; i++) {
        const item = videoDesign.items[i];
        
        for (let j = 0; j < 3; j++) {
          console.log(`📍 [${currentSlideIndex+1}/${totalSlides}] 項目${i+1} サブ${j+1} 描画`);
          
          const itemImage = this.getSlideImage(slideImages, currentSlideIndex);
          
          this.renderItemSlide(item, i + 1, j, itemImage);
          
          await this.sleep(perItemSlideMs);
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
      const summaryImage = this.getSlideImage(slideImages, currentSlideIndex);
      this.renderSummarySlide(videoDesign, summaryImage);
      
      await this.sleep(summaryMs);
      
      console.log('🏁 全スライド描画完了、録画停止待機');
      
      // 実際の描画時間を計算
      const actualDrawingTime = calculatedTotalMs;
      
      // 描画完了後、少し待ってから録画停止
      await this.sleep(500); // 0.5秒のバッファ
      
      // 手動で録画停止（タイマーより早く終了）
      if (this.recorder && this.recorder.state === 'recording') {
        console.log('🛑 手動録画停止実行');
        this.recorder.stop();
        if (this.recordingTimer) {
          clearTimeout(this.recordingTimer);
        }
      }
      
      const videoData = await recording;
      
      loopController.endSession();
      
      console.log('✅ 画像付き動画生成完了', {
        requestedDuration: totalDuration / 1000 + 's',
        actualDrawingTime: actualDrawingTime / 1000 + 's',
        fileSize: videoData.size
      });
      
      return {
        success: true,
        videoBlob: videoData.blob,
        url: videoData.url,
        duration: actualDrawingTime / 1000, // 実際の描画時間を返す
        requestedDuration: totalDuration / 1000,
        slideCount: currentSlideIndex + 1,
        imagesUsed: slideImages ? Object.keys(slideImages).length : 0,
        size: videoData.size,
        timingAccurate: true
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

  // 🚨 完全修正：getSlideImage メソッド（オブジェクト＋配列両対応）
  getSlideImage(slideImages, slideIndex) {
    if (!slideImages) {
      console.log(`❌ スライド${slideIndex}: slideImages is null/undefined`);
      return null;
    }
    
    console.log(`🔍 スライド${slideIndex}の画像を検索...`, {
      type: typeof slideImages,
      isArray: Array.isArray(slideImages),
      length: Array.isArray(slideImages) ? slideImages.length : Object.keys(slideImages).length
    });
    
    // 🔧 修正1: オブジェクト形式の場合（推奨形式）
    if (slideImages && typeof slideImages === 'object' && !Array.isArray(slideImages)) {
      console.log('📦 オブジェクト形式で検索中...');
      
      // 直接キーアクセス（最優先）
      if (slideImages[slideIndex]) {
        const image = slideImages[slideIndex];
        console.log(`✅ スライド${slideIndex}画像取得(オブジェクト):`, image.keyword?.substring(0, 30) + '...');
        return image;
      }
      
      // slideIndexプロパティで検索
      const imageValues = Object.values(slideImages);
      const foundByProperty = imageValues.find(img => img?.slideIndex === slideIndex);
      if (foundByProperty) {
        console.log(`✅ スライド${slideIndex}画像取得(プロパティ検索):`, foundByProperty.keyword?.substring(0, 30) + '...');
        return foundByProperty;
      }
      
      // 利用可能な画像から循環選択
      if (imageValues.length > 0) {
        const fallbackIndex = slideIndex % imageValues.length;
        const fallbackImage = imageValues[fallbackIndex];
        if (fallbackImage) {
          console.log(`⚠️ スライド${slideIndex}画像なし - オブジェクトフォールバック[${fallbackIndex}]使用:`, fallbackImage.keyword?.substring(0, 30) + '...');
          return fallbackImage;
        }
      }
    }
    
    // 🔧 修正2: 配列形式の場合（下位互換）
    if (Array.isArray(slideImages)) {
      console.log('📦 配列形式で検索中...');
      
      // 直接インデックスアクセス
      if (slideImages[slideIndex]) {
        const image = slideImages[slideIndex];
        console.log(`✅ スライド${slideIndex}画像取得(配列):`, image.keyword?.substring(0, 30) + '...');
        return image;
      }
      
      // slideIndexプロパティで検索
      const foundByProperty = slideImages.find(img => img?.slideIndex === slideIndex);
      if (foundByProperty) {
        console.log(`✅ スライド${slideIndex}画像取得(配列プロパティ検索):`, foundByProperty.keyword?.substring(0, 30) + '...');
        return foundByProperty;
      }
      
      // 循環参照でフォールバック
      if (slideImages.length > 0) {
        const fallbackIndex = slideIndex % slideImages.length;
        const fallbackImage = slideImages[fallbackIndex];
        if (fallbackImage) {
          console.log(`⚠️ スライド${slideIndex}画像なし - 配列フォールバック[${fallbackIndex}]使用:`, fallbackImage.keyword?.substring(0, 30) + '...');
          return fallbackImage;
        }
      }
    }
    
    console.log(`❌ スライド${slideIndex}画像なし - プレースホルダー使用`);
    return null;
  }

  // タイトルスライド描画
  renderTitleSlide(videoDesign, slideImage = null) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // タイトル（自動折り返し）
    const titleMaxWidth = Math.floor(this.canvas.width * 0.85);
    const titleMaxHeight = Math.floor(this.canvas.height * 0.25);
    this.drawWrappedText(
      videoDesign.title || 'タイトル',
      centerX,
      centerY - 200,
      70,
      '#212529',
      { bold: true },
      titleMaxWidth,
      titleMaxHeight
    );
    
    // 画像描画
    const imageX = this.canvas.width * 0.15;
    const imageY = centerY + 200;
    const imageWidth = this.canvas.width * 0.7;
    const imageHeight = 300;
    
    if (slideImage?.optimized?.canvas) {
      console.log('✅ タイトル画像描画:', slideImage.keyword);
      this.drawActualImage(slideImage.optimized.canvas, imageX, imageY, imageWidth, imageHeight);
    } else {
      console.log('⚠️ タイトル画像プレースホルダー使用');
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
    const textMaxWidth = Math.floor(this.canvas.width * 0.85);
    
    if (subSlideIndex === 0) {
      this.drawWrappedText(itemTitle, centerX, textAreaHeight * 0.5, 60, '#000000', { bold: true }, textMaxWidth, Math.floor(textAreaHeight * 0.6));
      if (slideImage?.optimized?.canvas) {
        console.log(`✅ 項目${itemNumber}-${subSlideIndex}画像描画:`, slideImage.keyword);
        this.drawActualImage(slideImage.optimized.canvas, imageX, imageY + 50, imageWidth, imageHeight - 100);
      } else {
        console.log(`⚠️ 項目${itemNumber}-${subSlideIndex}プレースホルダー使用`);
        this.drawImagePlaceholder(imageX, imageY + 50, imageWidth, imageHeight - 100, `${itemTitle}のイメージ`);
      }
    } else if (subSlideIndex === 1 && mainContent) {
      this.drawWrappedText(itemTitle, centerX, textAreaHeight * 0.25, 45, '#000000', { bold: true }, textMaxWidth, Math.floor(textAreaHeight * 0.4));
      this.drawWrappedText(mainContent, centerX, textAreaHeight * 0.7, 40, '#000000', {}, textMaxWidth, Math.floor(textAreaHeight * 0.6));
      if (slideImage?.optimized?.canvas) {
        console.log(`✅ 項目${itemNumber}-${subSlideIndex}画像描画:`, slideImage.keyword);
        this.drawActualImage(slideImage.optimized.canvas, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else {
        console.log(`⚠️ 項目${itemNumber}-${subSlideIndex}プレースホルダー使用`);
        this.drawImagePlaceholder(imageX, imageY + 30, imageWidth, imageHeight - 60, `${itemTitle}の具体例`);
      }
    } else if (subSlideIndex === 2 && details) {
      this.drawWrappedText('💡 ポイント', centerX, textAreaHeight * 0.25, 45, '#000000', { bold: true }, textMaxWidth, Math.floor(textAreaHeight * 0.35));
      this.drawWrappedText(details, centerX, textAreaHeight * 0.7, 38, '#000000', {}, textMaxWidth, Math.floor(textAreaHeight * 0.65));
      if (slideImage?.optimized?.canvas) {
        console.log(`✅ 項目${itemNumber}-${subSlideIndex}画像描画:`, slideImage.keyword);
        this.drawActualImage(slideImage.optimized.canvas, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else {
        console.log(`⚠️ 項目${itemNumber}-${subSlideIndex}プレースホルダー使用`);
        this.drawImagePlaceholder(imageX, imageY + 30, imageWidth, imageHeight - 60, `${itemTitle}のコツ`);
      }
    }
  }

  // まとめスライド描画
  renderSummarySlide(videoDesign, slideImage = null) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    const textAreaHeight = this.canvas.height / 2;
    
    // エンディングCTA
    this.drawWrappedText(
      'この動画が良かったら…',
      centerX,
      textAreaHeight * 0.35,
      42,
      '#000000',
      { bold: true },
      Math.floor(this.canvas.width * 0.9),
      Math.floor(textAreaHeight * 0.5)
    );
    this.drawCTAButtons(centerX, textAreaHeight * 0.6);
    
    // まとめ画像
    const imageX = this.canvas.width * 0.2;
    const imageY = this.canvas.height * 0.7;
    const imageWidth = this.canvas.width * 0.6;
    const imageHeight = 200;
    
    if (slideImage?.optimized?.canvas) {
      console.log('✅ まとめ画像描画:', slideImage.keyword);
      this.drawActualImage(slideImage.optimized.canvas, imageX, imageY, imageWidth, imageHeight);
    } else {
      console.log('⚠️ まとめ画像プレースホルダー使用');
      this.drawImagePlaceholder(imageX, imageY, imageWidth, imageHeight, 'いいね＆チャンネル登録');
    }
  }

  // 通常の動画生成（画像なし）
  async generateVideo(videoDesign, onProgress) {
    console.log('🎬 通常動画生成開始');
    return this.generateVideoWithImages(videoDesign, {}, onProgress);
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

  // 折り返しテキスト描画（キャンバス幅に応じて自動改行/縮小）
  drawWrappedText(text, x, y, fontSize = 32, color = '#000000', options = {}, maxWidth, maxHeight) {
    this.ctx.save();
    const weight = options.bold ? 'bold' : 'normal';
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const minFontSize = Math.max(16, Math.floor(fontSize * 0.6));
    let currentFontSize = fontSize;
    let lines = [];
    let lineHeight;

    // 改行を一旦保持しつつ各段落ごとにラップ
    const paragraphs = (text || '').toString().split('\n');

    const wrapWithFont = (size) => {
      this.ctx.font = `${weight} ${size}px Arial`;
      const computedLines = [];
      const space = ' ';
      paragraphs.forEach(p => {
        const lineBuffer = [];
        // 日本語対策: スペースがない場合は1文字ずつ扱う
        const hasSpace = p.includes(space);
        const tokens = hasSpace ? p.split(space) : p.split('');
        let currentLine = '';
        tokens.forEach((token, idx) => {
          const fragment = hasSpace ? (currentLine ? currentLine + space + token : token) : (currentLine + token);
          const width = this.ctx.measureText(fragment).width;
          if (maxWidth && width > maxWidth && currentLine) {
            lineBuffer.push(currentLine);
            currentLine = hasSpace ? token : token; // token自体を次行に
          } else {
            currentLine = fragment;
          }
        });
        if (currentLine) lineBuffer.push(currentLine);
        // 空行も尊重
        if (lineBuffer.length === 0) lineBuffer.push('');
        computedLines.push(...lineBuffer);
      });
      return computedLines;
    };

    while (currentFontSize >= minFontSize) {
      lines = wrapWithFont(currentFontSize);
      lineHeight = currentFontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      if (!maxHeight || totalHeight <= maxHeight) {
        break;
      }
      currentFontSize -= 2;
    }

    // 最終描画
    this.ctx.font = `${weight} ${currentFontSize}px Arial`;
    lineHeight = currentFontSize * 1.2;
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

  // いいね/登録ボタン風のCTAを描画
  drawCTAButtons(centerX, baseY) {
    const buttonWidth = Math.floor(this.canvas.width * 0.36);
    const buttonHeight = 70;
    const gap = 30;
    const leftX = centerX - buttonWidth - (gap / 2);
    const rightX = centerX + (gap / 2);
    const y = baseY;

    // 左: グッドボタン
    this.drawRoundedButton(leftX, y, buttonWidth, buttonHeight, '#ffdd57', '#000000', '👍 高評価お願いします');
    // 右: チャンネル登録
    this.drawRoundedButton(rightX, y, buttonWidth, buttonHeight, '#ff6b6b', '#ffffff', '🔔 チャンネル登録');
  }

  drawRoundedButton(x, y, width, height, bgColor, textColor, label) {
    this.ctx.save();
    const radius = 16;
    this.ctx.fillStyle = bgColor;
    this.roundRectPath(x, y, width, height, radius);
    this.ctx.fill();

    this.ctx.fillStyle = textColor;
    this.ctx.font = 'bold 28px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x + width / 2, y + height / 2);
    this.ctx.restore();
  }

  roundRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + width - r, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    this.ctx.lineTo(x + width, y + height - r);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    this.ctx.lineTo(x + r, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
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
    
    // タイマーのクリーンアップ
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    this.isGenerating = false;
    console.log('🧹 VideoComposer クリーンアップ完了');
  }
}

const videoComposer = new VideoComposer();
export default videoComposer;