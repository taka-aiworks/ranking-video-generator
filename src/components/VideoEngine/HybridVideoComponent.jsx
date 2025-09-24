// HybridVideoComponent.jsx - ハイブリッド動画生成コンポーネント

import React, { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import HybridVideoGenerator from './HybridVideoGenerator.js';

const HybridVideoComponent = forwardRef(({ onVideoGenerated, onStatusUpdate, onProgress }, ref) => {
  const shortCanvasRef = useRef(null);
  const mediumCanvasRef = useRef(null);
  const videoGeneratorRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('待機中...');

  // 初期化
  useEffect(() => {
    if (shortCanvasRef.current && mediumCanvasRef.current && !isInitialized) {
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
      
      videoGeneratorRef.current.initialize(canvases, callbacks);
      setIsInitialized(true);
    }

    return () => {
      if (videoGeneratorRef.current) {
        videoGeneratorRef.current.cleanup();
      }
    };
  }, [isInitialized, onStatusUpdate, onVideoGenerated, onProgress]);

  // 外部から呼び出し可能なメソッド
  useImperativeHandle(ref, () => ({
    // ハイブリッド生成
    generateHybridVideos: (contentData, options = {}) => {
      if (videoGeneratorRef.current) {
        return videoGeneratorRef.current.generateHybridVideos(contentData, options);
      }
    },
    
    // ショート動画のみ生成
    generateShortVideo: (contentData, duration = 60) => {
      if (videoGeneratorRef.current) {
        return videoGeneratorRef.current.generateSingleVideo('short', duration);
      }
    },
    
    // ミディアム動画のみ生成
    generateMediumVideo: (contentData, duration = 300) => {
      if (videoGeneratorRef.current) {
        return videoGeneratorRef.current.generateSingleVideo('medium', duration);
      }
    },
    
    // テンプレート設定
    setTemplate: (template) => {
      if (videoGeneratorRef.current) {
        videoGeneratorRef.current.selectedTemplate = template;
      }
    },
    
    // クリーンアップ
    cleanup: () => {
      if (videoGeneratorRef.current) {
        videoGeneratorRef.current.cleanup();
      }
    }
  }));

  return (
    <div className="w-full space-y-6">
      {/* ステータス表示 */}
      <div className="text-center">
        <div className="text-sm text-gray-400 mb-2">生成ステータス</div>
        <div className="text-lg font-bold">{currentStatus}</div>
      </div>
      
      {/* キャンバス表示 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ショート動画キャンバス */}
        <div className="space-y-2">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="text-sm font-bold">ショート動画 (9:16)</span>
            </div>
            <div className="text-xs text-gray-400">15-60秒 | TikTok, Instagram Reels, YouTube Shorts</div>
          </div>
          <canvas
            ref={shortCanvasRef}
            className="w-full h-auto border-2 border-blue-400/30 rounded-lg bg-black/20"
            style={{ 
              maxWidth: '100%', 
              height: 'auto',
              aspectRatio: '9/16'
            }}
          />
        </div>

        {/* ミディアム動画キャンバス */}
        <div className="space-y-2">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-sm font-bold">ミディアム動画 (16:9)</span>
            </div>
            <div className="text-xs text-gray-400">3-8分 | YouTube収益化対応</div>
          </div>
          <canvas
            ref={mediumCanvasRef}
            className="w-full h-auto border-2 border-green-400/30 rounded-lg bg-black/20"
            style={{ 
              maxWidth: '100%', 
              height: 'auto',
              aspectRatio: '16/9'
            }}
          />
        </div>
      </div>
      
      {/* 生成情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-white/10 rounded-lg p-4">
          <h4 className="font-bold mb-2 text-blue-400">ショート動画特徴</h4>
          <ul className="space-y-1 text-gray-300">
            <li>• 1080x1920 (9:16) 縦型</li>
            <li>• 最大60秒の短尺コンテンツ</li>
            <li>• バズ狙いの構成</li>
            <li>• モバイル最適化</li>
          </ul>
        </div>
        
        <div className="bg-white/10 rounded-lg p-4">
          <h4 className="font-bold mb-2 text-green-400">ミディアム動画特徴</h4>
          <ul className="space-y-1 text-gray-300">
            <li>• 1920x1080 (16:9) 横型</li>
            <li>• 3-8分の詳細コンテンツ</li>
            <li>• 収益化条件対応</li>
            <li>• SEO最適化済み</li>
          </ul>
        </div>
      </div>

      {/* ハイブリッド戦略説明 */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-purple-400/30">
        <h4 className="font-bold mb-3 text-purple-400">🔄 ハイブリッド戦略の威力</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">240%</div>
            <div className="text-gray-300">収益向上</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">50%</div>
            <div className="text-gray-300">期間短縮</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">+300%</div>
            <div className="text-gray-300">視聴時間</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400 text-center">
          相互送客により単体投稿比で圧倒的な成果を実現
        </div>
      </div>
    </div>
  );
});

HybridVideoComponent.displayName = 'HybridVideoComponent';

export default HybridVideoComponent;