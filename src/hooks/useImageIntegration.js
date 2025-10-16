// src/hooks/useImageIntegration.js - 最小限修正版（既存の高機能コードを保持）

import { useState, useCallback, useRef, useEffect } from 'react';
import mediaIntegrator from '../services/integration/mediaIntegrator.js';
import imageService from '../services/media/imageService.js';

export const useImageIntegration = () => {
  // === 基本状態 ===（既存のまま）
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // === 画像設定 ===（既存のまま）
  const [settings, setSettings] = useState({
    enabled: false,
    layout: 'bottom-half', // 'top-half', 'full', 'split'
    quality: 'high',
    autoRefresh: false,
    forceRefresh: false
  });

  // === 統合状態 ===（既存のまま）
  const [integrationStatus, setIntegrationStatus] = useState({
    isProcessing: false,
    currentImages: 0,
    lastProcessed: 'None'
  });

  // === 参照 ===（既存のまま）
  const abortControllerRef = useRef(null);

  // === 設定更新 ===（既存のまま）
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    console.log('⚙️ 画像設定更新:', newSettings);
  }, []);

  // === メイン機能: コンテンツから画像を自動取得 ===（既存のまま）
  const fetchImagesForContent = useCallback(async (content, keyword) => {
    console.log('🔍 コンテンツ用画像取得開始:', keyword);

    // 既に処理中の場合は中止
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      setProgress(10);

      // API接続確認
      const apiStatus = await imageService.checkApiStatus();
      if (apiStatus.status === 'error') {
        console.warn('⚠️ Unsplash API未接続 - プレースホルダーモード');
      }

      setProgress(30);

      // 画像取得（個別）
      const fetchedImages = await imageService.fetchRelevantImages(keyword, {
        count: 5,
        orientation: 'landscape'
      });

      setProgress(60);

      // プレビュー用データ変換
      const previewImages = fetchedImages.map((img, index) => ({
        id: img.id || `preview_${index}`,
        url: img.url,
        thumbnailUrl: img.thumbnailUrl || img.url,
        alt: img.alt,
        keyword: keyword,
        isPlaceholder: img.isPlaceholder || false,
        photographer: img.photographer,
        selected: index === 0 // 最初の画像を選択状態に
      }));

      setImages(previewImages);
      setProgress(100);
      console.log(`✅ ${previewImages.length}件の画像取得完了`);

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('🚫 画像取得がキャンセルされました');
        return;
      }

      console.error('🚨 画像取得エラー:', err);
      setError('画像の取得に失敗しました: ' + err.message);
      
      // エラー時はプレースホルダー画像
      setImages([{
        id: 'error_placeholder',
        url: null,
        isPlaceholder: true,
        keyword: keyword,
        alt: `${keyword} プレースホルダー`,
        selected: true
      }]);

    } finally {
      setIsLoading(false);
      setProgress(0);
      abortControllerRef.current = null;
    }
  }, []);

  // === 🚨 ここだけ修正：正しい関数名を使用 ===
  const integrateImages = useCallback(async (videoDesign) => {
    if (!settings.enabled) {
      console.log('📋 画像統合スキップ（設定で無効）');
      return videoDesign;
    }

    console.log('🎨 画像統合実行:', videoDesign.title);
    setIsLoading(true);
    setError(null);

    try {
      // 統合オプション
      const integrationOptions = {
        imageLayout: settings.layout,
        enableImages: settings.enabled,
        forceRefresh: settings.forceRefresh
      };

      // 🚨 修正：正しい関数名を使用
      const enhancedDesign = await mediaIntegrator.integrateImagesIntoSlides(
        videoDesign,
        integrationOptions
      );

      // 統合状況更新
      const status = mediaIntegrator.getIntegrationStatus();
      setIntegrationStatus(status);

      // プレビュー画像更新
      const previewData = mediaIntegrator.getImagePreviewData();
      if (previewData.length > 0) {
        setImages(previewData);
      }

      console.log('✅ 画像統合完了');
      return enhancedDesign;

    } catch (err) {
      console.error('🚨 画像統合エラー:', err);
      setError('画像統合に失敗しました: ' + err.message);
      return videoDesign; // エラー時は元のデザインを返す

    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  // === 以下、既存のコードをそのまま保持 ===

  // === 画像付き動画生成 ===
  const generateVideoWithImages = useCallback(async (videoDesign, onProgress) => {
    console.log('🎬 画像付き動画生成開始');

    try {
      setIsLoading(true);
      setError(null);

      const result = await mediaIntegrator.generateVideoWithImages(
        videoDesign,
        (progressValue) => {
          setProgress(progressValue);
          if (onProgress) onProgress(progressValue);
        }
      );

      console.log('✅ 画像付き動画生成完了');
      return result;

    } catch (err) {
      console.error('🚨 画像付き動画生成エラー:', err);
      setError('画像付き動画の生成に失敗しました: ' + err.message);
      throw err;

    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }, []);

  // === 特定画像の差し替え ===
  const replaceImage = useCallback(async (imageId, newKeyword) => {
    console.log(`🔄 画像差し替え: ${imageId} → "${newKeyword}"`);

    try {
      setIsLoading(true);

      // 現在の画像を探す
      const targetImage = images.find(img => img.id === imageId);
      if (!targetImage) {
        throw new Error('対象画像が見つかりません');
      }

      // スライドインデックスがある場合は mediaIntegrator を使用
      if (typeof targetImage.slideIndex === 'number') {
        await mediaIntegrator.replaceSlideImage(
          targetImage.slideIndex,
          newKeyword,
          { layout: settings.layout }
        );

        // プレビュー更新
        const previewData = mediaIntegrator.getImagePreviewData();
        setImages(previewData);
      } else {
        // 単純な画像差し替え
        const newImage = await imageService.fetchMainImage(newKeyword);
        
        setImages(prev => prev.map(img => 
          img.id === imageId 
            ? { ...img, ...newImage, keyword: newKeyword }
            : img
        ));
      }

      console.log('✅ 画像差し替え完了');

    } catch (err) {
      console.error('🚨 画像差し替えエラー:', err);
      setError('画像の差し替えに失敗しました: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [images, settings.layout]);

  // === 画像選択変更 ===
  const selectImage = useCallback((imageId) => {
    setImages(prev => prev.map(img => ({
      ...img,
      selected: img.id === imageId
    })));
  }, []);

  // === 画像リフレッシュ ===
  const refreshImages = useCallback(async (keyword) => {
    console.log('🔄 画像リフレッシュ:', keyword);
    
    const currentKeyword = keyword || images[0]?.keyword;
    if (currentKeyword) {
      await fetchImagesForContent({}, currentKeyword);
    }
  }, [images, fetchImagesForContent]);

  // === キャッシュクリア ===
  const clearCache = useCallback(() => {
    mediaIntegrator.clearImageCache();
    setImages([]);
    setError(null);
    setIntegrationStatus({ isProcessing: false, currentImages: 0, lastProcessed: 'None' });
    console.log('🗑️ 画像キャッシュクリア');
  }, []);

  // === 処理中止 ===
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setProgress(0);
    console.log('🚫 画像処理をキャンセル');
  }, []);

  // === 統合状況の更新（定期実行）===
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        const status = mediaIntegrator.getIntegrationStatus();
        setIntegrationStatus(status);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  // === クリーンアップ ===
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      mediaIntegrator.cleanup();
    };
  }, []);

  // === 戻り値 ===
  return {
    // 状態
    images,
    isLoading,
    error,
    progress,
    settings,
    integrationStatus,

    // アクション
    fetchImagesForContent,
    integrateImages,
    generateVideoWithImages,
    replaceImage,
    selectImage,
    refreshImages,
    updateSettings,
    clearCache,
    cancelProcessing,

    // ユーティリティ
    hasImages: images.length > 0,
    selectedImage: images.find(img => img.selected),
    placeholderCount: images.filter(img => img.isPlaceholder).length,
    isIntegrationEnabled: settings.enabled
  };
};