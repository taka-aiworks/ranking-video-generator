// src/services/integration/mediaIntegrator.js - 動的コンテンツ対応版

import imageService from '../media/imageService.js';
import imageOptimizer from '../media/imageOptimizer.js';
import videoComposer from '../video/videoComposer.js';
import keywordAnalyzer from '../ai/keywordAnalyzer.js';

class MediaIntegrator {
  constructor() {
    this.imageCache = new Map();
    this.isProcessing = false;
    this.currentImages = [];
    this.debugMode = true;
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

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

      // 🆕 動的コンテンツ分析でキーワード生成
      const dynamicKeywords = await this.extractImageKeywordsFromContent(videoDesign);
      this.log(`🔍 動的抽出キーワード: ${dynamicKeywords.length}件`);

      // 必要な画像を一括取得（各スライド用）
      const fetchedImages = await this.fetchDynamicImages(dynamicKeywords, forceRefresh);
      
      // 画像を最適化
      const optimizedImages = await imageOptimizer.optimizeMultipleImages(fetchedImages, imageLayout);

      // videoDesign に画像情報を統合
      const enhancedDesign = this.enhanceVideoDesignWithImages(
        videoDesign, 
        optimizedImages, 
        imageLayout
      );

      console.log('✅ 画像統合完了 - 動的キーワード対応');
      return enhancedDesign;

    } catch (error) {
      console.error('🚨 画像統合エラー:', error);
      return videoDesign;
    } finally {
      this.isProcessing = false;
    }
  }

  // 🆕 動的コンテンツからキーワード抽出
  async extractImageKeywordsFromContent(videoDesign) {
    const keywords = [];
    
    // 1. タイトルスライド用
    const titleKeyword = await this.generateKeywordFromText(videoDesign.title);
    keywords.push({
      type: 'title',
      keyword: titleKeyword,
      slideIndex: 0,
      content: videoDesign.title
    });

    // 2. 各項目のサブスライド用（実際のコンテンツから生成）
    if (videoDesign.items && videoDesign.items.length > 0) {
      for (let itemIndex = 0; itemIndex < videoDesign.items.length; itemIndex++) {
        const item = videoDesign.items[itemIndex];
        
        // 各項目につき3つのサブスライド
        for (let subIndex = 0; subIndex < 3; subIndex++) {
          let content = '';
          
          // コンテンツの優先順位で取得
          if (subIndex === 0) {
            content = item.name || item.title || '';
          } else if (subIndex === 1) {
            content = item.content?.main || item.description || '';
          } else if (subIndex === 2) {
            content = item.content?.details || item.content?.main || '';
          }
          
          // コンテンツがない場合はアイテム名を使用
          if (!content) {
            content = item.name || item.title || `項目${itemIndex + 1}`;
          }
          
          const slideKeyword = await this.generateKeywordFromText(content, item.name);
          
          keywords.push({
            type: 'item',
            keyword: slideKeyword,
            slideIndex: 1 + (itemIndex * 3) + subIndex,
            content: content,
            itemIndex: itemIndex,
            subIndex: subIndex
          });
        }
      }
    }

    // 3. まとめスライド用
    const summaryKeyword = await this.generateKeywordFromText('いいね チャンネル登録 お願いします');
    keywords.push({
      type: 'summary',
      keyword: summaryKeyword,
      slideIndex: keywords.length,
      content: 'まとめ'
    });

    return keywords;
  }

  // 🆕 簡易テキスト→キーワード変換（AIエラー回避）
  async generateKeywordFromText(text, fallback = 'lifestyle modern') {
    try {
      // まずAI生成を試す
      const slideKeywords = await keywordAnalyzer.generateSlideSpecificKeywords(
        text,
        { type: 'dynamic', index: 0, subIndex: 0 }
      );
      
      if (slideKeywords && slideKeywords.primary) {
        return slideKeywords.primary;
      }
    } catch (error) {
      console.warn('⚠️ AI キーワード生成失敗:', error.message);
    }
    
    // AIが失敗した場合、簡易変換を使用
    return this.simpleTextToKeyword(text, fallback);
  }

  // 🆕 簡易テキスト→キーワード変換
  simpleTextToKeyword(text, fallback = 'lifestyle modern') {
    if (!text) return fallback;
    
    const cleanText = text.toLowerCase();
    
    // 日本語コンテンツの場合
    if (/[ひらがなカタカナ漢字]/.test(text)) {
      if (cleanText.includes('コミュニケーション') || cleanText.includes('話') || cleanText.includes('会話')) {
        return 'family conversation talking together';
      }
      if (cleanText.includes('遊び') || cleanText.includes('ゲーム') || cleanText.includes('活動')) {
        return 'children playing games activities fun';
      }
      if (cleanText.includes('学習') || cleanText.includes('勉強') || cleanText.includes('教育')) {
        return 'learning education knowledge books';
      }
      if (cleanText.includes('ルーティン') || cleanText.includes('習慣')) {
        return 'daily routine schedule planning';
      }
      if (cleanText.includes('褒める') || cleanText.includes('ポジティブ')) {
        return 'praise encouragement positive parenting';
      }
      if (cleanText.includes('成長') || cleanText.includes('発達')) {
        return 'child development growth progress';
      }
      if (cleanText.includes('読書') || cleanText.includes('本') || cleanText.includes('読み聞かせ')) {
        return 'parent reading book child story';
      }
      if (cleanText.includes('料理') || cleanText.includes('食事')) {
        return 'cooking food kitchen family meal';
      }
      if (cleanText.includes('健康') || cleanText.includes('運動')) {
        return 'healthy lifestyle fitness wellness';
      }
      if (cleanText.includes('子育て') || cleanText.includes('育児')) {
        return 'parenting family children happy';
      }
      if (cleanText.includes('いいね') || cleanText.includes('チャンネル登録') || cleanText.includes('お願い')) {
        return 'thumbs up positive feedback like';
      }
      
      // 汎用的な日本語
      return 'family lifestyle children happy';
    }
    
    // 英語コンテンツの場合
    if (cleanText.includes('communication') || cleanText.includes('talk')) {
      return 'family conversation talking together';
    }
    if (cleanText.includes('play') || cleanText.includes('game')) {
      return 'children playing games activities';
    }
    if (cleanText.includes('learn') || cleanText.includes('education')) {
      return 'learning education knowledge';
    }
    if (cleanText.includes('routine') || cleanText.includes('habit')) {
      return 'daily routine schedule planning';
    }
    if (cleanText.includes('positive') || cleanText.includes('praise')) {
      return 'praise encouragement positive';
    }
    if (cleanText.includes('like') || cleanText.includes('subscribe') || cleanText.includes('thumbs')) {
      return 'thumbs up positive feedback like';
    }
    
    return fallback;
  }

  // 🆕 動的画像一括取得
  async fetchDynamicImages(keywords, forceRefresh = false) {
    console.log(`🔄 ${keywords.length}件の画像を取得中...`);
    
    const usedUrls = new Set();
    
    const fetchPromises = keywords.map(async (keywordData, index) => {
      const { keyword, slideIndex, type } = keywordData;
      const cacheKey = `slide_${slideIndex}_${keyword}`;
      
      // キャッシュチェック
      if (!forceRefresh && this.imageCache.has(cacheKey)) {
        return { ...this.imageCache.get(cacheKey), slideIndex };
      }

      try {
        // 画像取得
        const image = await imageService.fetchMainImage(keyword, {
          orientation: 'landscape',
          type: type
        });

        if (image && image.url) {
          // 重複チェック
          if (usedUrls.has(image.url)) {
            // 重複の場合、キーワードを少し変更して再取得
            const altKeyword = keyword + ' variation ' + (index % 3 + 1);
            const altImage = await imageService.fetchMainImage(altKeyword, {
              orientation: 'landscape',
              type: type
            });
            
            if (altImage && altImage.url && !usedUrls.has(altImage.url)) {
              usedUrls.add(altImage.url);
              const imageElement = await imageService.preloadImage(altImage.url);
              const result = {
                ...altImage,
                imageElement: imageElement,
                slideIndex: slideIndex,
                keyword: altKeyword,
                type: type,
                ready: true
              };
              this.imageCache.set(cacheKey, result);
              return result;
            }
          } else {
            usedUrls.add(image.url);
          }
          
          const imageElement = await imageService.preloadImage(image.url);
          const result = {
            ...image,
            imageElement: imageElement,
            slideIndex: slideIndex,
            keyword: keyword,
            type: type,
            ready: true
          };
          
          this.imageCache.set(cacheKey, result);
          return result;
        } else {
          return {
            slideIndex: slideIndex,
            keyword: keyword,
            type: type,
            isPlaceholder: true,
            imageElement: null,
            ready: false
          };
        }
      } catch (error) {
        console.warn(`⚠️ 画像取得失敗 (${keyword}):`, error.message);
        return {
          slideIndex: slideIndex,
          keyword: keyword,
          type: type,
          isPlaceholder: true,
          imageElement: null,
          ready: false
        };
      }
    });

    const results = await Promise.all(fetchPromises);
    console.log(`✅ 動的画像取得完了: 全${results.length}件, ユニーク${usedUrls.size}件`);
    
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
        uniqueId: `slide_${slideIndex}`,
        isUnique: true,
        url: image.url, // 🆕 デバッグ用URL追加
        imageElement: image.imageElement // 🆕 imageElement追加
      };
      
      console.log(`✅ スライド${slideIndex}画像設定: ${image.keyword?.substring(0, 30)} (from: "${image.keyword?.substring(0, 50)}...")`);
    });

    console.log(`🎨 slideImages配列生成完了: ${enhanced.slideImages.length}スライド`);
    
    return enhanced;
  }

  // 画像付き動画生成（videoComposer 拡張）
  async generateVideoWithImages(videoDesign, onProgress) {
    console.log('🎬 動画生成開始: 画像統合版');

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
      id: image.id || `slide_${image.slideIndex}`,
      type: image.type,
      keyword: image.keyword,
      slideIndex: image.slideIndex,
      thumbnail: image.optimized?.dataUrl || image.thumbnailUrl,
      isPlaceholder: image.isPlaceholder || image.optimized?.isPlaceholder,
      ready: image.ready,
      photographer: image.photographer,
      uniqueId: `slide_${image.slideIndex}`,
      isDiversified: true
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
    keywordAnalyzer.clearCache();
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
    this.isProcessing = false;
    console.log('🧹 MediaIntegrator クリーンアップ完了');
  }
}

const mediaIntegrator = new MediaIntegrator();
export default mediaIntegrator;