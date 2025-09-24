import React, { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import HybridVideoGenerator from '../../services/generators/HybridVideoGenerator.js';

const HybridVideoComponent = forwardRef(({ onVideoGenerated, onStatusUpdate, onProgress }, ref) => {
  const shortCanvasRef = useRef(null);
  const mediumCanvasRef = useRef(null);
  const videoGeneratorRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('待機中...');

  // 初期化
  useEffect(() => {
    console.log('HybridVideoComponent がレンダリングされました');
    if (shortCanvasRef.current && mediumCanvasRef.current && !isInitialized) {
      console.log('HybridVideoComponent 初期化開始');
      
      videoGeneratorRef.current = new HybridVideoGenerator();
      
      const canvases = {
        short: shortCanvasRef.current,
        medium: mediumCanvasRef.current
      };
      
      const callbacks = {
        onStatusUpdate: (status) => {
          setCurrentStatus(status);
          if (onStatusUpdate) onStatusUpdate(status);
        },
        onComplete: (result) => {
          if (onVideoGenerated) onVideoGenerated(result);
        },
        onProgress: (progress) => {
          if (onProgress) onProgress(progress);
        }
      };
      
      try {
        videoGeneratorRef.current.initialize(canvases, callbacks);
        setIsInitialized(true);
        console.log('HybridVideoComponent 初期化完了');
      } catch (error) {
        console.error('初期化エラー:', error);
        setCurrentStatus('初期化エラーが発生しました');
      }
    }

    return () => {
      if (videoGeneratorRef.current) {
        videoGeneratorRef.current.cleanup();
      }
    };
  }, [isInitialized, onStatusUpdate, onVideoGenerated, onProgress]);

  // 外部から呼び出し可能なメソッド
  useImperativeHandle(ref, () => ({
    generateHybridVideos: async (contentData, options = {}) => {
      if (videoGeneratorRef.current) {
        return videoGeneratorRef.current.generateHybridVideos(contentData, options);
      } else {
        throw new Error('動画生成エンジンが初期化されていません');
      }
    },
    
    generateShortVideo: async (contentData, duration = 60) => {
      if (videoGeneratorRef.current) {
        return videoGeneratorRef.current.generateSingleVideo('short', duration);
      }
    },
    
    generateMediumVideo: async (contentData, duration = 300) => {
      if (videoGeneratorRef.current) {
        return videoGeneratorRef.current.generateSingleVideo('medium', duration);
      }
    }
  }), []);

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <div className="text-sm text-gray-400 mb-2">生成ステータス</div>
        <div className="text-lg font-bold">{currentStatus}</div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="text-center">
            <span className="text-sm font-bold">ショート動画 (9:16)</span>
          </div>
          <canvas
            ref={shortCanvasRef}
            className="w-full h-auto border-2 border-blue-400/30 rounded-lg bg-black/20"
            style={{ aspectRatio: '9/16' }}
          />
        </div>

        <div className="space-y-2">
          <div className="text-center">
            <span className="text-sm font-bold">ミディアム動画 (16:9)</span>
          </div>
          <canvas
            ref={mediumCanvasRef}
            className="w-full h-auto border-2 border-green-400/30 rounded-lg bg-black/20"
            style={{ aspectRatio: '16/9' }}
          />
        </div>
      </div>
    </div>
  );
});

HybridVideoComponent.displayName = 'HybridVideoComponent';

export default HybridVideoComponent;
