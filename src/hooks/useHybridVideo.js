// useHybridVideo.js - ハイブリッド動画生成用カスタムフック

import { useState, useRef, useCallback } from 'react';

const useHybridVideo = () => {
  const videoComponentRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('待機中...');
  const [progress, setProgress] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState(null);
  const [error, setError] = useState(null);

  // ステータス更新ハンドラー
  const handleStatusUpdate = useCallback((status) => {
    setCurrentStatus(status);
    console.log('Status:', status);
  }, []);

  // 進行状況更新ハンドラー
  const handleProgress = useCallback((progressValue) => {
    setProgress(progressValue);
  }, []);

  // 生成完了ハンドラー
  const handleVideoGenerated = useCallback((result) => {
    setGeneratedVideos(result);
    setIsGenerating(false);
    setCurrentStatus('生成完了！');
    setProgress(100);
    console.log('Generated videos:', result);
  }, []);

  // エラーハンドラー
  const handleError = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsGenerating(false);
    setCurrentStatus('エラーが発生しました');
    console.error('Video generation error:', errorMessage);
  }, []);

  // ハイブリッド動画生成
  const generateHybridVideos = useCallback(async (contentData, options = {}) => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(0);
      setGeneratedVideos(null);
      setCurrentStatus('ハイブリッド生成開始...');

      if (!videoComponentRef.current) {
        throw new Error('動画生成コンポーネントが初期化されていません');
      }

      // デフォルトオプション
      const defaultOptions = {
        template: 'ranking',
        includeShort: true,
        includeMedium: true,
        shortDuration: 45,
        mediumDuration: 300,
        quality: 'high'
      };

      const finalOptions = { ...defaultOptions, ...options };

      // コンテンツデータの検証
      if (!contentData || !contentData.title) {
        throw new Error('コンテンツデータが不正です');
      }

      // 生成実行
      await videoComponentRef.current.generateHybridVideos(contentData, finalOptions);

    } catch (error) {
      handleError(error.message || 'ハイブリッド動画生成でエラーが発生しました');
    }
  }, [handleError]);

  // ショート動画のみ生成
  const generateShortVideo = useCallback(async (contentData, duration = 45) => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(0);
      setGeneratedVideos(null);
      setCurrentStatus('ショート動画生成開始...');

      if (!videoComponentRef.current) {
        throw new Error('動画生成コンポーネントが初期化されていません');
      }

      const result = await videoComponentRef.current.generateShortVideo(contentData, duration);
      setGeneratedVideos({ short: result });
      setIsGenerating(false);
      setCurrentStatus('ショート動画生成完了！');
      setProgress(100);

    } catch (error) {
      handleError(error.message || 'ショート動画生成でエラーが発生しました');
    }
  }, [handleError]);

  // ミディアム動画のみ生成
  const generateMediumVideo = useCallback(async (contentData, duration = 300) => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(0);
      setGeneratedVideos(null);
      setCurrentStatus('ミディアム動画生成開始...');

      if (!videoComponentRef.current) {
        throw new Error('動画生成コンポーネントが初期化されていません');
      }

      const result = await videoComponentRef.current.generateMediumVideo(contentData, duration);
      setGeneratedVideos({ medium: result });
      setIsGenerating(false);
      setCurrentStatus('ミディアム動画生成完了！');
      setProgress(100);

    } catch (error) {
      handleError(error.message || 'ミディアム動画生成でエラーが発生しました');
    }
  }, [handleError]);

  // テンプレート設定
  const setTemplate = useCallback((template) => {
    if (videoComponentRef.current) {
      videoComponentRef.current.setTemplate(template);
    }
  }, []);

  // リセット
  const reset = useCallback(() => {
    setIsGenerating(false);
    setCurrentStatus('待機中...');
    setProgress(0);
    setGeneratedVideos(null);
    setError(null);
  }, []);

  // クリーンアップ
  const cleanup = useCallback(() => {
    if (videoComponentRef.current) {
      videoComponentRef.current.cleanup();
    }
    reset();
  }, [reset]);

  // 動画ダウンロード
  const downloadVideo = useCallback((videoData, filename) => {
    if (!videoData || !videoData.url) {
      console.error('ダウンロードできる動画データがありません');
      return;
    }

    const link = document.createElement('a');
    link.href = videoData.url;
    link.download = filename || `video_${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // ダウンロードヘルパー
  const downloadAllVideos = useCallback((filenamePrefix = 'hybrid_video') => {
    if (!generatedVideos) {
      console.error('ダウンロードできる動画がありません');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

    if (generatedVideos.short) {
      downloadVideo(generatedVideos.short, `${filenamePrefix}_short_${timestamp}.webm`);
    }

    if (generatedVideos.medium) {
      downloadVideo(generatedVideos.medium, `${filenamePrefix}_medium_${timestamp}.webm`);
    }
  }, [generatedVideos, downloadVideo]);

  // プレビュー用URL生成
  const getPreviewUrls = useCallback(() => {
    if (!generatedVideos) return null;

    return {
      short: generatedVideos.short?.url || null,
      medium: generatedVideos.medium?.url || null
    };
  }, [generatedVideos]);

  // 統計情報取得
  const getStats = useCallback(() => {
    if (!generatedVideos) return null;

    const stats = {
      totalVideos: 0,
      totalSize: 0,
      shortStats: null,
      mediumStats: null
    };

    if (generatedVideos.short) {
      stats.totalVideos++;
      stats.totalSize += parseFloat(generatedVideos.short.sizeMB || 0);
      stats.shortStats = {
        duration: generatedVideos.short.duration,
        size: generatedVideos.short.sizeMB,
        aspectRatio: generatedVideos.short.aspectRatio
      };
    }

    if (generatedVideos.medium) {
      stats.totalVideos++;
      stats.totalSize += parseFloat(generatedVideos.medium.sizeMB || 0);
      stats.mediumStats = {
        duration: generatedVideos.medium.duration,
        size: generatedVideos.medium.sizeMB,
        aspectRatio: generatedVideos.medium.aspectRatio
      };
    }

    stats.totalSize = stats.totalSize.toFixed(2);
    return stats;
  }, [generatedVideos]);

  // 相互プロモーションリンク生成
  const getCrossPromotionData = useCallback(() => {
    if (!generatedVideos || !generatedVideos.crossPromotionLinks) {
      return null;
    }

    return {
      shortToMedium: {
        text: generatedVideos.crossPromotionLinks.shortToMedium.text,
        placement: generatedVideos.crossPromotionLinks.shortToMedium.placement,
        duration: generatedVideos.crossPromotionLinks.shortToMedium.duration
      },
      mediumToShort: {
        text: generatedVideos.crossPromotionLinks.mediumToShort.text,
        placement: generatedVideos.crossPromotionLinks.mediumToShort.placement,
        format: generatedVideos.crossPromotionLinks.mediumToShort.format
      }
    };
  }, [generatedVideos]);

  // YouTube投稿用データ生成
  const getYouTubeData = useCallback((format) => {
    if (!generatedVideos || !generatedVideos[format]) {
      return null;
    }

    const video = generatedVideos[format];
    const crossPromo = getCrossPromotionData();

    let description = `${video.title}\n\n`;
    
    if (format === 'short' && crossPromo) {
      description += `${crossPromo.shortToMedium.text}\n\n`;
      description += `📺 詳細版: [リンクを挿入]\n\n`;
    } else if (format === 'medium' && crossPromo) {
      description += `${crossPromo.mediumToShort.format}\n\n`;
    }

    description += `#おすすめ #ランキング #レビュー #2025年最新`;

    const tags = format === 'short' 
      ? ['shorts', 'おすすめ', 'ランキング', 'レビュー', 'サクッと解説']
      : ['おすすめ', 'ランキング', 'レビュー', '完全ガイド', '2025年最新', '徹底比較'];

    return {
      title: video.title,
      description,
      tags,
      duration: video.duration,
      aspectRatio: video.aspectRatio,
      category: format === 'short' ? 'Shorts' : 'Education',
      privacy: 'public',
      thumbnail: video.thumbnail
    };
  }, [generatedVideos, getCrossPromotionData]);

  // 収益予測データ
  const getRevenueProjection = useCallback(() => {
    if (!generatedVideos) return null;

    const baseRevenue = {
      short: 5000,    // ショート動画基準月収
      medium: 12000   // ミディアム動画基準月収
    };

    const hybridMultiplier = 2.4; // ハイブリッド戦略による収益向上率

    let monthlyProjection = 0;
    let strategy = 'single';

    if (generatedVideos.short && generatedVideos.medium) {
      // ハイブリッド戦略
      monthlyProjection = (baseRevenue.short + baseRevenue.medium) * hybridMultiplier;
      strategy = 'hybrid';
    } else if (generatedVideos.short) {
      monthlyProjection = baseRevenue.short;
      strategy = 'short';
    } else if (generatedVideos.medium) {
      monthlyProjection = baseRevenue.medium;
      strategy = 'medium';
    }

    return {
      monthlyProjection: Math.floor(monthlyProjection),
      strategy,
      hybridBonus: strategy === 'hybrid' ? Math.floor(monthlyProjection * 0.4) : 0,
      monetizationPeriod: strategy === 'hybrid' ? '3-6ヶ月' : strategy === 'medium' ? '3-5ヶ月' : '9-18ヶ月'
    };
  }, [generatedVideos]);

  // エクスポート用データ生成
  const getExportData = useCallback(() => {
    if (!generatedVideos) return null;

    return {
      videos: generatedVideos,
      stats: getStats(),
      youtubeData: {
        short: generatedVideos.short ? getYouTubeData('short') : null,
        medium: generatedVideos.medium ? getYouTubeData('medium') : null
      },
      crossPromotion: getCrossPromotionData(),
      revenueProjection: getRevenueProjection(),
      generatedAt: new Date().toISOString()
    };
  }, [generatedVideos, getStats, getYouTubeData, getCrossPromotionData, getRevenueProjection]);

  return {
    // State
    videoComponentRef,
    isGenerating,
    currentStatus,
    progress,
    generatedVideos,
    error,

    // Actions
    generateHybridVideos,
    generateShortVideo,
    generateMediumVideo,
    setTemplate,
    reset,
    cleanup,

    // Download & Export
    downloadVideo,
    downloadAllVideos,
    getExportData,

    // Data & Stats
    getPreviewUrls,
    getStats,
    getCrossPromotionData,
    getYouTubeData,
    getRevenueProjection,

    // Event Handlers
    handleStatusUpdate,
    handleProgress,
    handleVideoGenerated,
    handleError
  };
};

export default useHybridVideo;