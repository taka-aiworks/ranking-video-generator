// src/services/integration/mediaIntegrator.js - 画像・動画統合管理

import imageService from '../media/imageService.js';
import imageOptimizer from '../media/imageOptimizer.js';
import videoComposer from '../video/videoComposer.js';

class MediaIntegrator {
  constructor() {
    this.imageCache = new Map();
    this.isProcessing = false;
    this.currentImages = [];
  }

  // メイン機能: スライド毎に適切な画像を自動配置
  async integrateImagesIntoSlides(videoDesign, options = {}) {
    console.log('🎨 画像統合開始:', videoDesign.title);
    
    if (this.isProcessing) {
      throw new Error('既に画像統合処理中です');
    }

    this.isProcessing = true;

    try {
      const {
        imageLayout = 'bottom-half',
        enableImages = true,
        forceRefresh = false
      } = options;

      if (!enableImages) {
        console.log('📋 画像統合スキップ（無効化されています）');
        return videoDesign;
      }

      // 1. 画像が必要なスライドを分析
      const imageRequirements = this.analyzeImageRequirements(videoDesign);
      console.log(`🔍 画像必要箇所: ${imageRequirements.length}件`);

      // 2. 必要な画像を一括取得
      const fetchedImages = await this.fetchRequiredImages(imageRequirements, forceRefresh);
      
      // 3. 画像を最適化
      const optimizedImages = await imageOptimizer.optimizeMultipleImages(fetchedImages, imageLayout);

      // 4. videoDesign に画像情報を統合
      const enhancedDesign = this.enhanceVideoDesignWithImages(
        videoDesign, 
        optimizedImages, 
        imageLayout
      );

      console.log('✅ 画像統合完了');
      return enhancedDesign;

    } catch (error) {
      console.error('🚨 画像統合エラー:', error);
      // エラー時は元のvideoDesignを返す
      return videoDesign;
    } finally {
      this.isProcessing = false;
    }
  }

  // 画像が必要なスライドを分析
  analyzeImageRequirements(videoDesign) {
    const requirements = [];

    // 1. タイトルスライド用画像
    requirements.push({
      type: 'title',
      keyword: videoDesign.title || 'main topic',
      priority: 'high',
      slideIndex: 0
    });

    // 2. 各項目用画像
    if (videoDesign.items && videoDesign.items.length > 0) {
      videoDesign.items.forEach((item, index) => {
        const itemKeyword = item.name || item.title || `item ${index + 1}`;
        
        // 各項目につき3つのサブスライド用画像
        for (let subIndex = 0; subIndex < 3; subIndex++) {
          requirements.push({
            type: 'item',
            keyword: itemKeyword,
            itemIndex: index,
            subSlideIndex: subIndex,
            priority: subIndex === 0 ? 'high' : 'medium',
            slideIndex: 1 + (index * 3) + subIndex
          });
        }
      });
    }

    // 3. まとめスライド用画像
    requirements.push({
      type: 'summary',
      keyword: 'youtube subscribe like button',
      priority: 'low',
      slideIndex: requirements.length
    });

    return requirements;
  }

  // 必要な画像を一括取得
  async fetchRequiredImages(requirements, forceRefresh = false) {
    console.log(`🔄 ${requirements.length}件の画像を取得中...`);
    
    const fetchPromises = requirements.map(async (req) => {
      const cacheKey = `${req.keyword}_${req.type}`;
      
      // キャッシュチェック
      if (!forceRefresh && this.imageCache.has(cacheKey)) {
        console.log(`📦 キャッシュから取得: ${req.keyword}`);
        const cachedImage = this.imageCache.get(cacheKey);
        return { ...cachedImage, ...req };
      }

      try {
        // 画像取得
        const image = await imageService.fetchMainImage(req.keyword, {
          orientation: req.type === 'title' ? 'landscape' : 'landscape'
        });

        if (image && image.url) {
          // 画像プリロード
          const imageElement = await imageService.preloadImage(image.url);
          const enhancedImage = {
            ...image,
            imageElement: imageElement,
            ...req
          };

          // キャッシュ保存
          this.imageCache.set(cacheKey, enhancedImage);
          return enhancedImage;
        } else {
          // プレースホルダー画像
          return {
            ...req,
            isPlaceholder: true,
            imageElement: null
          };
        }
      } catch (error) {
        console.warn(`⚠️ 画像取得失敗 (${req.keyword}):`, error);
        return {
          ...req,
          isPlaceholder: true,
          imageElement: null
        };
      }
    });

    const results = await Promise.all(fetchPromises);
    console.log(`✅ 画像取得完了: ${results.length}件`);
    
    this.currentImages = results;
    return results;
  }

  // videoDesign に画像情報を統合
  enhanceVideoDesignWithImages(videoDesign, optimizedImages, layout) {
    const enhanced = JSON.parse(JSON.stringify(videoDesign)); // ディープコピー

    // 画像情報をメタデータに追加
    enhanced.media = {
      images: {
        layout: layout,
        total: optimizedImages.length,
        optimized: optimizedImages.filter(img => img.optimized?.optimized).length,
        placeholders: optimizedImages.filter(img => img.optimized?.isPlaceholder).length
      },
      settings: {
        imageLayout: layout,
        imageQuality: 'high',
        processingTime: Date.now()
      }
    };

    // スライド別画像マッピング
    enhanced.slideImages = {};
    
    optimizedImages.forEach(image => {
      const key = `slide_${image.slideIndex}`;
      enhanced.slideImages[key] = {
        type: image.type,
        keyword: image.keyword,
        optimized: image.optimized,
        itemIndex: image.itemIndex,
        subSlideIndex: image.subSlideIndex,
        ready: image.ready
      };
    });

    console.log(`🎨 画像統合情報をvideoDesignに追加: ${Object.keys(enhanced.slideImages).length}スライド`);
    
    return enhanced;
  }

  // 画像付き動画生成（videoComposer 拡張）
  async generateVideoWithImages(videoDesign, onProgress) {
    console.log('🎬 画像付き動画生成開始');

    try {
      // 1. 画像統合済みかチェック
      if (!videoDesign.media?.images) {
        console.log('📋 画像未統合 - 自動統合実行');
        videoDesign = await this.integrateImagesIntoSlides(videoDesign);
      }

      // 2. videoComposer に画像データを渡して動画生成
      const result = await videoComposer.generateVideoWithImages(
        videoDesign,
        this.currentImages,
        onProgress
      );

      return result;

    } catch (error) {
      console.error('🚨 画像付き動画生成エラー:', error);
      throw error;
    }
  }

  // 画像プレビュー用データ取得
  getImagePreviewData() {
    if (!this.currentImages || this.currentImages.length === 0) {
      return [];
    }

    return this.currentImages.map(image => ({
      id: image.id || `${image.type}_${image.slideIndex}`,
      type: image.type,
      keyword: image.keyword,
      slideIndex: image.slideIndex,
      thumbnail: image.optimized?.dataUrl || image.thumbnailUrl,
      isPlaceholder: image.isPlaceholder || image.optimized?.isPlaceholder,
      ready: image.ready,
      photographer: image.photographer
    }));
  }

  // 特定スライドの画像を手動で差し替え
  async replaceSlideImage(slideIndex, newKeyword, options = {}) {
    console.log(`🔄 スライド ${slideIndex} の画像を差し替え: "${newKeyword}"`);

    try {
      // 新しい画像を取得
      const newImage = await imageService.fetchMainImage(newKeyword, options);
      
      if (newImage && newImage.url) {
        const imageElement = await imageService.preloadImage(newImage.url);
        const optimized = await imageOptimizer.optimizeForVideo(
          imageElement, 
          options.layout || 'bottom-half'
        );

        // currentImages を更新
        const targetIndex = this.currentImages.findIndex(img => img.slideIndex === slideIndex);
        if (targetIndex >= 0) {
          this.currentImages[targetIndex] = {
            ...this.currentImages[targetIndex],
            ...newImage,
            imageElement: imageElement,
            optimized: optimized,
            keyword: newKeyword,
            ready: true
          };
        }

        console.log(`✅ スライド ${slideIndex} 画像差し替え完了`);
        return optimized;
      } else {
        throw new Error('新しい画像の取得に失敗');
      }
    } catch (error) {
      console.error('🚨 画像差し替えエラー:', error);
      throw error;
    }
  }

  // キャッシュクリア
  clearImageCache() {
    this.imageCache.clear();
    this.currentImages = [];
    imageService.clearCache();
    console.log('🗑️ 画像統合キャッシュをクリア');
  }

  // 統合状況の取得
  getIntegrationStatus() {
    return {
      isProcessing: this.isProcessing,
      cachedImages: this.imageCache.size,
      currentImages: this.currentImages.length,
      lastProcessed: this.currentImages.length > 0 ? 'Ready' : 'None'
    };
  }

  // メモリクリーンアップ
  cleanup() {
    this.clearImageCache();
    imageOptimizer.cleanup();
    this.isProcessing = false;
    console.log('🧹 MediaIntegrator クリーンアップ完了');
  }
}

const mediaIntegrator = new MediaIntegrator();
export default mediaIntegrator;