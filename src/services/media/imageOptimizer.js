// src/services/media/imageOptimizer.js - Canvas初期化修正版

import imageConfig from '../../config/imageConfig.js';

class ImageOptimizer {
  constructor() {
    this.tempCanvas = null;
    this.tempCtx = null;
  }

  // 🔧 Canvas初期化（使用時に実行）
  ensureCanvas() {
    if (!this.tempCanvas || !this.tempCtx) {
      this.tempCanvas = document.createElement('canvas');
      this.tempCtx = this.tempCanvas.getContext('2d');
      console.log('✅ ImageOptimizer Canvas初期化完了');
    }
    return this.tempCtx !== null;
  }

  // 動画サイズに最適化（修正版）
  async optimizeForVideo(imageElement, targetLayout = 'bottom-half') {
    // Canvas初期化確認
    if (!this.ensureCanvas()) {
      console.error('🚨 Canvas初期化失敗');
      return this.createSimplePlaceholder(targetLayout);
    }

    if (!imageElement) {
      console.warn('⚠️ 画像要素がnull - プレースホルダーを使用');
      return this.createSimplePlaceholder(targetLayout);
    }

    try {
      const { targetWidth, targetHeight } = imageConfig.video;
      
      // レイアウト別サイズ計算
      const dimensions = this.calculateDimensions(targetLayout, targetWidth, targetHeight);
      
      console.log(`🖼️ 画像最適化: ${imageElement.width}x${imageElement.height} → ${dimensions.width}x${dimensions.height} (${targetLayout})`);

      // Canvas設定
      this.tempCanvas.width = dimensions.width;
      this.tempCanvas.height = dimensions.height;

      // 高品質描画設定
      this.tempCtx.imageSmoothingEnabled = true;
      this.tempCtx.imageSmoothingQuality = 'high';

      // アスペクト比を保持してリサイズ（クロップモード使用）
      const drawDimensions = this.calculateDrawDimensions(
        imageElement.width,
        imageElement.height,
        dimensions.width,
        dimensions.height,
        'crop' // クロップモードで画像全体を埋める
      );

      console.log(`📏 描画計算: ${imageElement.width}x${imageElement.height} → ${drawDimensions.width}x${drawDimensions.height} (scale: ${drawDimensions.scale.toFixed(2)}, crop: ${drawDimensions.willCrop})`);

      // 背景塗りつぶし（白背景）
      this.tempCtx.fillStyle = '#ffffff';
      this.tempCtx.fillRect(0, 0, dimensions.width, dimensions.height);

      // 最高品質補間設定
      this.tempCtx.imageSmoothingEnabled = true;
      this.tempCtx.imageSmoothingQuality = 'high';
      this.tempCtx.patternQuality = 'high';
      this.tempCtx.textRenderingOptimization = 'optimizeQuality';

      // クロップ処理を考慮した画像描画
      if (drawDimensions.willCrop) {
        // クロップが必要な場合：クリッピング領域を設定
        this.tempCtx.save();
        this.tempCtx.beginPath();
        this.tempCtx.rect(0, 0, dimensions.width, dimensions.height);
        this.tempCtx.clip();
        
        this.tempCtx.drawImage(
          imageElement,
          drawDimensions.x,
          drawDimensions.y,
          drawDimensions.width,
          drawDimensions.height
        );
        
        this.tempCtx.restore();
      } else {
        // 通常の描画
        this.tempCtx.drawImage(
          imageElement,
          drawDimensions.x,
          drawDimensions.y,
          drawDimensions.width,
          drawDimensions.height
        );
      }

      // 最適化された画像データを返す
      // 注意: tempCanvas は共有されるため、ここでクローンを作成して返す
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = this.tempCanvas.width;
      resultCanvas.height = this.tempCanvas.height;
      const resultCtx = resultCanvas.getContext('2d');
      resultCtx.drawImage(this.tempCanvas, 0, 0);

      return {
        canvas: resultCanvas,
        dataUrl: resultCanvas.toDataURL('image/webp', 0.95),
        width: dimensions.width,
        height: dimensions.height,
        layout: targetLayout,
        optimized: true
      };

    } catch (error) {
      console.error('🚨 画像最適化エラー:', error);
      return this.createSimplePlaceholder(targetLayout);
    }
  }

  // レイアウト別サイズ計算
  calculateDimensions(layout, canvasWidth, canvasHeight) {
    switch (layout) {
      case 'top-half':
        return {
          width: canvasWidth,
          height: Math.floor(canvasHeight / 2),
          position: 'top'
        };
      
      case 'bottom-half':
        return {
          width: canvasWidth,
          height: Math.floor(canvasHeight / 2),
          position: 'bottom'
        };
      
      case 'full':
        return {
          width: canvasWidth,
          height: canvasHeight,
          position: 'full'
        };
      
      case 'split':
        return {
          width: Math.floor(canvasWidth / 2),
          height: canvasHeight,
          position: 'split'
        };
      
      default:
        return {
          width: canvasWidth,
          height: Math.floor(canvasHeight / 2),
          position: 'bottom'
        };
    }
  }

  // アスペクト比保持描画計算（改良版）
  calculateDrawDimensions(srcWidth, srcHeight, targetWidth, targetHeight, cropMode = 'fit') {
    const srcRatio = srcWidth / srcHeight;
    const targetRatio = targetWidth / targetHeight;

    let drawWidth, drawHeight, x, y;

    if (cropMode === 'crop') {
      // クロップモード：画像を切り取って全体を埋める
      if (srcRatio > targetRatio) {
        // 横長画像 - 幅基準でクロップ
        drawWidth = targetWidth;
        drawHeight = drawWidth / srcRatio;
        x = 0;
        y = (targetHeight - drawHeight) / 2;
      } else {
        // 縦長画像 - 高さ基準でクロップ
        drawHeight = targetHeight;
        drawWidth = drawHeight * srcRatio;
        x = (targetWidth - drawWidth) / 2;
        y = 0;
      }
    } else {
      // フィットモード：画像全体を表示（従来の動作）
      if (srcRatio > targetRatio) {
        // 横長画像 - 高さ基準
        drawHeight = targetHeight;
        drawWidth = drawHeight * srcRatio;
        x = (targetWidth - drawWidth) / 2;
        y = 0;
      } else {
        // 縦長画像 - 幅基準
        drawWidth = targetWidth;
        drawHeight = drawWidth / srcRatio;
        x = 0;
        y = (targetHeight - drawHeight) / 2;
      }
    }

    // 描画領域の調整情報も返す
    const scaleX = drawWidth / srcWidth;
    const scaleY = drawHeight / srcHeight;
    const actualScale = Math.min(scaleX, scaleY);

    return { 
      x, 
      y, 
      width: drawWidth, 
      height: drawHeight,
      scale: actualScale,
      cropMode: cropMode,
      willCrop: cropMode === 'crop' && (drawWidth > targetWidth || drawHeight > targetHeight)
    };
  }

  // 🔧 修正版プレースホルダー作成（Canvas不要）
  createSimplePlaceholder(layout, keyword = '関連画像') {
    const dimensions = this.calculateDimensions(
      layout,
      imageConfig.video.targetWidth,
      imageConfig.video.targetHeight
    );

    // Canvas不要のシンプルなプレースホルダー
    return {
      canvas: null,
      dataUrl: null,
      width: dimensions.width,
      height: dimensions.height,
      layout: layout,
      optimized: false,
      isPlaceholder: true,
      keyword: keyword,
      backgroundColor: '#f8f9fa'
    };
  }

  // 複数画像の一括最適化（修正版）
  async optimizeMultipleImages(images, layout = 'bottom-half') {
    console.log(`🔄 ${images.length}件の画像を一括最適化中...`);
    
    const optimizationPromises = images.map(async (image, index) => {
      try {
        const optimized = await this.optimizeForVideo(image.imageElement, layout);
        return {
          ...image,
          optimized: optimized,
          ready: true
        };
      } catch (error) {
        console.warn(`⚠️ 画像 ${index} の最適化に失敗:`, error);
        return {
          ...image,
          optimized: this.createSimplePlaceholder(layout, image.keyword),
          ready: true
        };
      }
    });

    const results = await Promise.all(optimizationPromises);
    console.log(`✅ 画像最適化完了: ${results.length}件`);
    
    return results;
  }

  // Canvas に画像を描画（修正版）
  drawOptimizedImage(targetCtx, optimizedImage, x, y) {
    if (!optimizedImage || !targetCtx) {
      console.warn('⚠️ 描画パラメータが不正');
      return false;
    }

    try {
      // Canvas画像がある場合
      if (optimizedImage.canvas) {
        targetCtx.drawImage(optimizedImage.canvas, x, y);
        return true;
      }

      // プレースホルダーの場合は簡易描画
      if (optimizedImage.isPlaceholder) {
        targetCtx.save();
        targetCtx.fillStyle = optimizedImage.backgroundColor || '#f8f9fa';
        targetCtx.fillRect(x, y, optimizedImage.width, optimizedImage.height);
        
        // 枠線
        targetCtx.strokeStyle = '#dee2e6';
        targetCtx.lineWidth = 2;
        targetCtx.strokeRect(x, y, optimizedImage.width, optimizedImage.height);
        
        // テキスト
        targetCtx.fillStyle = '#6c757d';
        targetCtx.font = 'bold 24px sans-serif';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(
          optimizedImage.keyword || '関連画像', 
          x + optimizedImage.width/2, 
          y + optimizedImage.height/2
        );
        
        targetCtx.restore();
        return true;
      }

      return false;
    } catch (error) {
      console.error('🚨 画像描画エラー:', error);
      return false;
    }
  }

  // メモリクリーンアップ
  cleanup() {
    if (this.tempCanvas) {
      this.tempCanvas.width = 0;
      this.tempCanvas.height = 0;
      this.tempCanvas = null;
    }
    this.tempCtx = null;
    console.log('🧹 ImageOptimizer クリーンアップ完了');
  }

  // 画像品質診断
  analyzeImageQuality(imageElement) {
    if (!imageElement) return { quality: 'none', score: 0 };

    const { width, height } = imageElement;
    const pixels = width * height;
    
    let quality, score;
    
    if (pixels >= 2073600) { // 1920x1080以上
      quality = 'excellent';
      score = 100;
    } else if (pixels >= 921600) { // 1280x720以上  
      quality = 'good';
      score = 80;
    } else if (pixels >= 307200) { // 640x480以上
      quality = 'fair';
      score = 60;
    } else {
      quality = 'poor';
      score = 30;
    }

    return { quality, score, width, height, pixels };
  }
}

const imageOptimizer = new ImageOptimizer();
export default imageOptimizer;