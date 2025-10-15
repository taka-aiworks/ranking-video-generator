// src/services/integration/mediaIntegrator.js - キーワード前処理版

import imageService from '../media/imageService.js';
import imageOptimizer from '../media/imageOptimizer.js';
import videoComposer from '../video/videoComposer.js';
import keywordAnalyzer from '../ai/keywordAnalyzer.js';
import translationService from '../translation/translationService.js';

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

      // 改良されたキーワード抽出
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

      console.log('✅ 画像統合完了 - 改良版キーワード処理');
      return enhancedDesign;

    } catch (error) {
      console.error('🚨 画像統合エラー:', error);
      return videoDesign;
    } finally {
      this.isProcessing = false;
    }
  }

  // 改良されたキーワード抽出
  async extractImageKeywordsFromContent(videoDesign) {
    const keywords = [];
    
    // 1. タイトルスライド用（短縮処理）
    const titleKeyword = await this.generateKeywordFromText(
      this.preprocessText(videoDesign.title), 
      'title', 
      0
    );
    keywords.push({
      type: 'title',
      keyword: titleKeyword,
      slideIndex: 0,
      content: videoDesign.title
    });

    // 2. 各項目のサブスライド用
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
          
          // 前処理してからキーワード生成
          const slideKeyword = await this.generateKeywordFromText(
            this.preprocessText(content), 
            'item', 
            subIndex
          );
          
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
    const summaryKeyword = await this.generateKeywordFromText('いいね チャンネル登録', 'summary', 0);
    keywords.push({
      type: 'summary',
      keyword: summaryKeyword,
      slideIndex: keywords.length,
      content: 'まとめ'
    });

    return keywords;
  }

  // テキスト前処理（長い文章を短縮）
  preprocessText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // 長すぎる文章は最初の部分のみ使用
    if (text.length > 100) {
      text = text.substring(0, 100);
      console.log('📝 長すぎる文章を短縮:', text);
    }

    // 句読点で文を分割し、最初の文のみ使用
    const sentences = text.split(/[。！？.\!?]/);
    if (sentences.length > 1 && sentences[0].length > 10) {
      text = sentences[0];
      console.log('📝 最初の文のみ使用:', text);
    }

    return text.trim();
  }

  // 改良されたキーワード生成
  async generateKeywordFromText(text, type = 'general', variation = 0) {
    try {
      // 改良版キーワード生成（ログ非表示）
      
      // 空文字チェック
      if (!text || text.trim().length === 0) {
        console.warn('⚠️ 空のテキスト、フォールバック使用');
        return this.getFallbackKeyword(type, variation);
      }
      
      // translationService を使用（前処理済みテキスト）
      const translated = await translationService.translateForImageSearch(text, {
        type: type,
        variation: variation
      });
      
      // 翻訳完了（ログ非表示）
      return translated;

    } catch (error) {
      console.warn('⚠️ 改良版翻訳失敗、フォールバック使用:', error.message);
      return this.getFallbackKeyword(type, variation);
    }
  }

  // 改良されたフォールバック
  getFallbackKeyword(type, variation = 0) {
    const fallbacks = {
      title: ['parenting children', 'family lifestyle', 'modern life'],
      item: [
        'family conversation',
        'daily routine',
        'children activities',
        'positive parenting',
        'home lifestyle'
      ],
      summary: ['thumbs up positive', 'like approval', 'good feedback']
    };

    const typeSet = fallbacks[type] || fallbacks.item;
    return typeSet[variation % typeSet.length];
  }

  // プレースホルダーURL生成
  createPlaceholderUrl(keyword) {
    const encodedKeyword = encodeURIComponent(keyword);
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="48" fill="#666">
          ${encodedKeyword}
        </text>
      </svg>
    `)}`;
  }

  // 単一画像取得（レート制限対応）
  async fetchSingleImage(keywordData, index, usedUrls, usedKeywords) {
    const { keyword, slideIndex, type } = keywordData;
    const cacheKey = `slide_${slideIndex}_${keyword}`;
    
    // キャッシュチェック
    if (this.imageCache.has(cacheKey)) {
      return { ...this.imageCache.get(cacheKey), slideIndex };
    }

    try {
      let finalKeyword = keyword;
      
      // キーワード重複チェック
      if (usedKeywords.has(keyword)) {
        const modifiers = ['beautiful', 'modern', 'bright', 'natural', 'clean'];
        finalKeyword = `${keyword} ${modifiers[index % modifiers.length]}`;
        console.log(`🔄 キーワード重複回避: ${keyword} → ${finalKeyword}`);
      }
      usedKeywords.add(finalKeyword);

      const imageData = await imageService.fetchMainImage(finalKeyword, { type });
      
      // URL重複チェック
      if (usedUrls.has(imageData.url)) {
        console.log(`🔄 URL重複回避: ${imageData.url} → プレースホルダー使用`);
        return {
          slideIndex,
          keyword: finalKeyword,
          url: this.createPlaceholderUrl(finalKeyword),
          description: `Placeholder for ${finalKeyword}`,
          author: 'System',
          source: 'placeholder',
          ready: true
        };
      }
      
      usedUrls.add(imageData.url);
      
      // 画像要素を事前読み込み
      const imageElement = await imageService.preloadImage(imageData.url);
      const result = {
        ...imageData,
        imageElement: imageElement,
        slideIndex,
        ready: true
      };
      
      // キャッシュに保存
      this.imageCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error(`❌ 画像取得エラー (${keyword}):`, error);
      return {
        slideIndex,
        keyword,
        url: this.createPlaceholderUrl(keyword),
        description: `Error placeholder for ${keyword}`,
        author: 'System',
        source: 'error',
        ready: true
      };
    }
  }

  // 動的画像一括取得（改良版）
  async fetchDynamicImages(keywords, forceRefresh = false) {
    console.log(`🔄 ${keywords.length}件の画像を取得中...`);
    
    const usedUrls = new Set();
    const usedKeywords = new Set();
    
    // 並列処理を制限（レート制限回避）
    const results = [];
    for (let index = 0; index < keywords.length; index++) {
      const keywordData = keywords[index];
      const result = await this.fetchSingleImage(keywordData, index, usedUrls, usedKeywords);
      results.push(result);
      
      // レート制限回避のため待機（5秒間隔に合わせる）
      if (index < keywords.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    const fetchPromises = results;
    console.log(`✅ 改良版画像取得完了: 全${results.length}件, ユニーク${usedUrls.size}件`);
    
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
        diversification: true,
        translationMethod: 'improved' // 改良版を明記
      }
    };

    // slideImages配列に確実にslideIndexを設定
    enhanced.slideImages = [];
    
    optimizedImages.forEach((image, index) => {
      const slideIndex = image.slideIndex !== undefined ? image.slideIndex : index;
      
      enhanced.slideImages[slideIndex] = {
        slideIndex: slideIndex,
        type: image.type,
        keyword: image.keyword,
        optimized: image.optimized,
        itemIndex: image.itemIndex,
        subSlideIndex: image.subSlideIndex,
        ready: image.ready,
        uniqueId: `slide_${slideIndex}`,
        isUnique: true,
        url: image.url,
        imageElement: image.imageElement,
        translationMethod: 'improved'
      };
      
      console.log(`✅ スライド${slideIndex}画像設定: ${image.keyword?.substring(0, 30)} (改良版)`);
    });

    console.log(`🎨 slideImages配列生成完了: ${enhanced.slideImages.length}スライド - 改良版システム`);
    
    return enhanced;
  }

  // 画像付き動画生成
  async generateVideoWithImages(videoDesign, onProgress) {
    console.log('🎬 動画生成開始: 改良版画像統合');

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
      isDiversified: true,
      translationMethod: 'improved'
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

        console.log(`✅ スライド ${slideIndex} 画像差し替え完了 - 改良版`);
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
    translationService.clearCache();
    console.log('🗑️ 画像統合キャッシュをクリア - 改良版');
  }

  // 統合状況の取得
  getIntegrationStatus() {
    return {
      isProcessing: this.isProcessing,
      cachedImages: this.imageCache.size,
      currentImages: this.currentImages.length,
      lastProcessed: this.currentImages.length > 0 ? 'Ready - Improved System' : 'None',
      translationMethod: 'improved'
    };
  }

  // メモリクリーンアップ
  cleanup() {
    this.clearImageCache();
    this.isProcessing = false;
    console.log('🧹 MediaIntegrator クリーンアップ完了 - 改良版システム');
  }
}

const mediaIntegrator = new MediaIntegrator();
export default mediaIntegrator;