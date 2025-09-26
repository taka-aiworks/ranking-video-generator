// src/services/integration/mediaIntegrator.js - スライド別画像多様化対応版

import imageService from '../media/imageService.js';
import imageOptimizer from '../media/imageOptimizer.js';
import videoComposer from '../video/videoComposer.js';
import keywordAnalyzer from '../ai/keywordAnalyzer.js';

class MediaIntegrator {
  constructor() {
    this.imageCache = new Map();
    this.isProcessing = false;
    this.currentImages = [];
    this.debugMode = true; // デバッグモード制御
  }

  // デバッグモード設定
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  // デバッグログ出力
  log(...args) {
    if (this.debugMode) {
      console.log(...args);
    }
  }

  // メイン機能: スライド毎に適切な画像を自動配置
  async integrateImagesIntoSlides(videoDesign, options = {}) {
    this.log('🎨 画像統合開始:', videoDesign.title);
    
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
        this.log('📋 画像統合スキップ（無効化されています）');
        return videoDesign;
      }

      // 🆕 1. AI キーワード生成（スライド別多様化）
      const aiKeywords = await keywordAnalyzer.generateImageKeywords(videoDesign);
      this.log('🧠 AI生成キーワード:', aiKeywords ? '成功' : 'フォールバック使用');

      // 2. 画像が必要なスライドを分析（AI強化版）
      const imageRequirements = this.analyzeImageRequirementsEnhanced(videoDesign, aiKeywords);
      this.log(`🔍 画像必要箇所: ${imageRequirements.length}件`);

      // 3. 必要な画像を一括取得（スライド別多様化）
      const fetchedImages = await this.fetchRequiredImagesEnhanced(imageRequirements, forceRefresh);
      
      // 4. 画像を最適化
      const optimizedImages = await imageOptimizer.optimizeMultipleImages(fetchedImages, imageLayout);

      // 5. videoDesign に画像情報を統合
      const enhancedDesign = this.enhanceVideoDesignWithImages(
        videoDesign, 
        optimizedImages, 
        imageLayout
      );

      console.log('✅ 画像統合完了 - スライド別多様化実現');
      return enhancedDesign;

    } catch (error) {
      console.error('🚨 画像統合エラー:', error);
      // エラー時は元のvideoDesignを返す
      return videoDesign;
    } finally {
      this.isProcessing = false;
    }
  }

  // 🆕 画像要件分析（AI強化版）
  analyzeImageRequirementsEnhanced(videoDesign, aiKeywords = null) {
    const requirements = [];

    // 1. タイトルスライド用画像
    const titleKeyword = aiKeywords?.title || videoDesign.title || 'main topic';
    requirements.push({
      type: 'title',
      keyword: titleKeyword,
      priority: 'high',
      slideIndex: 0,
      uniqueId: 'title_0'
    });

    // 2. 各項目用画像（スライド別多様化）
    if (videoDesign.items && videoDesign.items.length > 0) {
      videoDesign.items.forEach((item, itemIndex) => {
        const baseKeyword = item.name || item.title || `item ${itemIndex + 1}`;
        
        // AI生成キーワードがあれば活用
        const aiItemData = aiKeywords?.items?.[itemIndex];
        
        // 各項目につき3つのサブスライド用画像（それぞれ異なるキーワード）
        for (let subIndex = 0; subIndex < 3; subIndex++) {
          let slideKeyword = baseKeyword;
          
          // 🎯 スライド別キーワード多様化
          if (aiItemData?.variations && aiItemData.variations[subIndex]) {
            slideKeyword = aiItemData.variations[subIndex];
          } else if (aiItemData?.main) {
            slideKeyword = aiItemData.main + ` variation ${subIndex + 1}`;
          } else {
            // フォールバック: サブインデックス別バリエーション
            slideKeyword = this.generateSubslideKeyword(baseKeyword, subIndex);
          }

          requirements.push({
            type: 'item',
            keyword: slideKeyword,
            itemIndex: itemIndex,
            subSlideIndex: subIndex,
            priority: subIndex === 0 ? 'high' : 'medium',
            slideIndex: 1 + (itemIndex * 3) + subIndex,
            uniqueId: `item_${itemIndex}_${subIndex}`
          });
        }
      });
    }

    // 3. まとめスライド用画像
    const summaryKeyword = aiKeywords?.summary || 'thumbs up positive feedback';
    requirements.push({
      type: 'summary',
      keyword: summaryKeyword,
      priority: 'low',
      slideIndex: requirements.length,
      uniqueId: 'summary_final'
    });

    return requirements;
  }

  // 🆕 サブスライドキーワード生成
  generateSubslideKeyword(baseKeyword, subIndex) {
    const variations = {
      0: baseKeyword, // オリジナル
      1: baseKeyword + ' lifestyle modern', // スタイリッシュ版
      2: baseKeyword + ' bright natural light' // ナチュラル版
    };
    
    // 子育てなど特定キーワードの場合
    if (baseKeyword.includes('子育て')) {
      const childcareVariations = {
        0: 'happy family parenting children',
        1: 'parent child bonding activities',
        2: 'family lifestyle daily routine'
      };
      return childcareVariations[subIndex] || childcareVariations[0];
    }
    
    return variations[subIndex] || variations[0];
  }

  // 🆕 必要な画像を一括取得（スライド別多様化版）
  async fetchRequiredImagesEnhanced(requirements, forceRefresh = false) {
    this.log(`🔄 ${requirements.length}件の画像を取得中（スライド別多様化）...`);
    
    // 重複回避用トラッキング
    const usedUrls = new Set();
    const retryableImages = [];
    
    const fetchPromises = requirements.map(async (req, index) => {
      // 🎯 ユニークなキャッシュキー（スライド別）
      const cacheKey = `${req.uniqueId}_${req.keyword}`;
      
      // キャッシュチェック
      if (!forceRefresh && this.imageCache.has(cacheKey)) {
        this.log(`📦 キャッシュ: ${req.keyword.substring(0, 30)}...`);
        const cachedImage = this.imageCache.get(cacheKey);
        return { ...cachedImage, ...req };
      }

      try {
        // 🆕 keywordAnalyzer を使用してスライド別キーワード生成
        const slideKeywords = await keywordAnalyzer.generateSlideSpecificKeywords(
          req.keyword,
          {
            type: req.type,
            index: req.itemIndex || 0,
            subIndex: req.subSlideIndex || 0
          }
        );

        // メインキーワードまたは代替案を使用
        const searchKeyword = slideKeywords?.primary || req.keyword;
        keywordAnalyzer.markKeywordAsUsed(searchKeyword);

        // 画像取得
        const image = await imageService.fetchMainImage(searchKeyword, {
          orientation: req.type === 'title' ? 'landscape' : 'landscape',
          type: req.type
        });

        if (image && image.url) {
          // 🔄 重複チェック - 同じ画像URLの場合は代替案を使用
          if (usedUrls.has(image.url) && slideKeywords?.alternatives) {
            this.log(`🔄 重複検知 - 代替案使用: ${req.keyword}`);
            
            for (const altKeyword of slideKeywords.alternatives) {
              if (!keywordAnalyzer.usedKeywords.has(altKeyword)) {
                const altImage = await imageService.fetchMainImage(altKeyword, {
                  orientation: 'landscape',
                  type: req.type
                });
                
                if (altImage && altImage.url && !usedUrls.has(altImage.url)) {
                  keywordAnalyzer.markKeywordAsUsed(altKeyword);
                  usedUrls.add(altImage.url);
                  
                  const imageElement = await imageService.preloadImage(altImage.url);
                  const enhancedImage = {
                    ...altImage,
                    imageElement: imageElement,
                    ...req,
                    keyword: altKeyword // 実際に使用したキーワードを記録
                  };

                  this.imageCache.set(cacheKey, enhancedImage);
                  return enhancedImage;
                }
              }
            }
          }

          // 通常の処理
          usedUrls.add(image.url);
          const imageElement = await imageService.preloadImage(image.url);
          const enhancedImage = {
            ...image,
            imageElement: imageElement,
            ...req,
            keyword: searchKeyword
          };

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
        console.warn(`⚠️ 画像取得失敗 (${req.keyword}):`, error.message);
        return {
          ...req,
          isPlaceholder: true,
          imageElement: null
        };
      }
    });

    const results = await Promise.all(fetchPromises);
    console.log(`✅ スライド別画像取得完了: ${results.length}件`);
    
    // 統計情報
    const uniqueImages = new Set(results.filter(r => r.url).map(r => r.url)).size;
    const placeholders = results.filter(r => r.isPlaceholder).length;
    
    console.log(`📊 画像統計: ユニーク${uniqueImages}件, プレースホルダー${placeholders}件`);
    
    this.currentImages = results;
    return results;
  }

  // src/services/integration/mediaIntegrator.js - スライドインデックス修正版

    // 🎯 修正箇所1: enhanceVideoDesignWithImages メソッド（行200付近）
    enhanceVideoDesignWithImages(videoDesign, optimizedImages, layout) {
    const enhanced = JSON.parse(JSON.stringify(videoDesign)); // ディープコピー

    // 画像情報をメタデータに追加
    enhanced.media = {
        images: {
        layout: layout,
        total: optimizedImages.length,
        optimized: optimizedImages.filter(img => img.optimized?.optimized).length,
        placeholders: optimizedImages.filter(img => img.optimized?.isPlaceholder).length,
        unique: new Set(optimizedImages.filter(img => img.url).map(img => img.url)).size
        },
        settings: {
        imageLayout: layout,
        imageQuality: 'high',
        processingTime: Date.now(),
        diversification: true
        }
    };

    // 🔧 修正：slideImages配列に確実にslideIndexを設定
    enhanced.slideImages = [];
    
    optimizedImages.forEach((image, index) => {
        // slideIndexが設定されていない場合はindexを使用
        const slideIndex = image.slideIndex !== undefined ? image.slideIndex : index;
        
        enhanced.slideImages[slideIndex] = {
        slideIndex: slideIndex, // 🆕 slideIndexを明示的に設定
        type: image.type,
        keyword: image.keyword,
        optimized: image.optimized,
        itemIndex: image.itemIndex,
        subSlideIndex: image.subSlideIndex,
        ready: image.ready,
        uniqueId: image.uniqueId,
        isUnique: true,
        url: image.url, // 🆕 デバッグ用URL追加
        imageElement: image.imageElement // 🆕 imageElement追加
        };
        
        console.log(`📌 スライド${slideIndex}画像設定:`, image.keyword?.substring(0, 20));
    });

    console.log(`🎨 slideImages配列生成完了: ${enhanced.slideImages.length}スライド`);
    console.log('📋 各スライドの画像:', enhanced.slideImages.map((img, i) => 
        `[${i}] ${img?.keyword?.substring(0, 15) || 'なし'}`
    ));
    
    return enhanced;
    }

  // 画像付き動画生成（videoComposer 拡張）
  async generateVideoWithImages(videoDesign, onProgress) {
    console.log('🎬 スライド別画像付き動画生成開始');

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

  // 🆕 画像多様化統計
  getDiversificationStats() {
    if (!this.currentImages || this.currentImages.length === 0) {
      return { total: 0, unique: 0, diversity: 0 };
    }

    const total = this.currentImages.length;
    const uniqueUrls = new Set(
      this.currentImages
        .filter(img => img.url && !img.isPlaceholder)
        .map(img => img.url)
    ).size;
    
    const diversity = total > 0 ? (uniqueUrls / total * 100).toFixed(1) : 0;

    return {
      total: total,
      unique: uniqueUrls,
      diversity: parseFloat(diversity),
      placeholders: this.currentImages.filter(img => img.isPlaceholder).length
    };
  }

  // 画像プレビュー用データ取得（多様化情報付き）
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
      photographer: image.photographer,
      uniqueId: image.uniqueId, // 🆕 ユニークID
      isDiversified: true // 🆕 多様化フラグ
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
    keywordAnalyzer.clearCache(); // 🆕 keywordAnalyzer のキャッシュもクリア
    console.log('🗑️ 画像統合キャッシュをクリア');
  }

  // 統合状況の取得（多様化情報付き）
  getIntegrationStatus() {
    const diversityStats = this.getDiversificationStats();
    
    return {
      isProcessing: this.isProcessing,
      cachedImages: this.imageCache.size,
      currentImages: this.currentImages.length,
      lastProcessed: this.currentImages.length > 0 ? 'Ready' : 'None',
      diversification: diversityStats, // 🆕 多様化統計
      keywordStats: keywordAnalyzer.getStats() // 🆕 キーワード統計
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