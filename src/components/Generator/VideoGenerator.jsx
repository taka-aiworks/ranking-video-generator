// src/components/Generator/VideoGenerator.jsx - AI完全主導版

import React, { useState, useRef, useCallback } from 'react';
import { Play, Download, Zap, Smartphone, Monitor, Target, Video, Star, AlertCircle, CheckCircle } from 'lucide-react';

// AI完全主導サービス層インポート
import openaiService from '../../services/api/openai.js';
import videoComposer from '../../services/video/videoComposer.js';

const VideoGenerator = () => {
  // === 基本状態 ===
  const [keyword, setKeyword] = useState('');
  const [format, setFormat] = useState('hybrid');
  const [template, setTemplate] = useState('ranking');
  const [tab, setTab] = useState('input');
  
  // === 生成状態 ===
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState(null);

  // === Canvas参照 ===
  const canvasRef = useRef(null);

  // === 設定データ ===
  const formats = [
    { 
      id: 'hybrid', 
      name: 'ハイブリッド', 
      icon: Star, 
      desc: 'AI設計×ショート+ミディアム', 
      revenue: '月15-35万',
      recommended: true
    },
    { 
      id: 'short', 
      name: 'ショート', 
      icon: Smartphone, 
      desc: 'AI設計×縦型15-60秒', 
      revenue: '月5-15万' 
    },
    { 
      id: 'medium', 
      name: 'ミディアム', 
      icon: Monitor, 
      desc: 'AI設計×横型3-8分', 
      revenue: '月10-25万' 
    }
  ];

  const templates = [
    { 
      id: 'ranking', 
      name: 'ランキング', 
      icon: '🏆',
      desc: 'AI がランキング形式を自動設計',
      aiFeature: 'ランキング順・色配置・時間配分をAI最適化'
    },
    { 
      id: 'comparison', 
      name: '比較(VS)', 
      icon: '⚡',
      desc: 'AI が比較レイアウトを自動設計',
      aiFeature: '商品A vs B のビジュアル比較をAI構成'
    },
    { 
      id: 'tutorial', 
      name: 'チュートリアル', 
      icon: '📚',
      desc: 'AI がステップ形式を自動設計',
      aiFeature: '手順の流れ・説明配置をAI構成'
    },
    { 
      id: 'news', 
      name: 'トレンドニュース', 
      icon: '📰',
      desc: 'AI がニュース形式を自動設計',
      aiFeature: 'トレンド情報の視覚表現をAI構成'
    }
  ];

  // === AI完全主導生成関数 ===
  const handleGenerate = useCallback(async () => {
    if (!keyword.trim()) {
      setError('キーワードを入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setTab('generating');

    try {
      const results = {};

      // ステップ1: ミディアム動画生成（AI完全主導）
      if (format === 'hybrid' || format === 'medium') {
        setStatus('AI がミディアム動画を設計中...');
        setProgress(10);
        
        // AIに動画設計図を作成させる
        const mediumDesign = await openaiService.generateVideoDesign(keyword, template, 'medium', 8);
        
        setStatus('ミディアム動画を生成中...');
        setProgress(25);
        
        // Canvas初期化（AI設計図ベース）
        videoComposer.initCanvas(canvasRef, mediumDesign);
        
        // AI設計図に基づいて動画生成
        const mediumVideo = await videoComposer.generateVideoFromDesign(
          mediumDesign,
          (videoProgress) => {
            setProgress(25 + (videoProgress * 0.3)); // 25-55%
          }
        );

        results.medium = {
          title: mediumDesign.metadata.seoTitle,
          duration: `${mediumDesign.duration}秒`,
          format: `${mediumDesign.canvas.width}x${mediumDesign.canvas.height}`,
          thumbnail: '🎬',
          estimatedRevenue: 18500,
          description: mediumDesign.metadata.description,
          tags: mediumDesign.metadata.tags,
          videoData: mediumVideo,
          aiDesign: mediumDesign // AI設計図も保存
        };

        setProgress(55);
      }

      // ステップ2: ショート動画生成（AI完全主導）
      if (format === 'hybrid' || format === 'short') {
        setStatus('AI がショート動画を設計中...');
        setProgress(60);
        
        // AIに動画設計図を作成させる
        const shortDesign = await openaiService.generateVideoDesign(keyword, template, 'short', 5);
        
        setStatus('ショート動画を生成中...');
        setProgress(70);
        
        // Canvas初期化（AI設計図ベース）
        videoComposer.initCanvas(canvasRef, shortDesign);
        
        // AI設計図に基づいて動画生成
        const shortVideo = await videoComposer.generateVideoFromDesign(
          shortDesign,
          (videoProgress) => {
            setProgress(70 + (videoProgress * 0.25)); // 70-95%
          }
        );

        results.short = {
          title: `${keyword} 1位はコレ！ #shorts`,
          duration: `${shortDesign.duration}秒`,
          format: `${shortDesign.canvas.width}x${shortDesign.canvas.height}`,
          thumbnail: '📱',
          estimatedRevenue: 8200,
          description: shortDesign.metadata.description,
          tags: shortDesign.metadata.tags,
          videoData: shortVideo,
          aiDesign: shortDesign // AI設計図も保存
        };

        setProgress(95);
      }

      // ハイブリッド特有の相互送客データ
      if (format === 'hybrid') {
        results.crossPromotion = {
          shortToMedium: '詳しくは長編動画をチェック！',
          mediumToShort: 'ハイライトはショート版でも公開中！'
        };
      }

      setStatus('AI完全主導動画生成完了！');
      setProgress(100);
      setVideos(results);

      // 結果表示へ移行
      setTimeout(() => {
        setTab('result');
      }, 1500);

    } catch (err) {
      console.error('AI完全主導生成エラー:', err);
      setError('AI動画生成でエラーが発生しました: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [keyword, format, template]);

  // === ダウンロード関数 ===
  const downloadVideo = useCallback((videoData, filename) => {
    if (!videoData?.url) return;
    
    const a = document.createElement('a');
    a.href = videoData.url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // === AI設計図ダウンロード ===
  const downloadDesign = useCallback((aiDesign, filename) => {
    const designJSON = JSON.stringify(aiDesign, null, 2);
    const blob = new Blob([designJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // === リセット関数 ===
  const resetAll = useCallback(() => {
    setKeyword('');
    setFormat('hybrid');
    setTemplate('ranking');
    setTab('input');
    setIsGenerating(false);
    setProgress(0);
    setStatus('');
    setVideos(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold">🧠 AI完全主導 動画生成ツール</h1>
                <p className="text-sm text-gray-300">ChatGPT が動画の設計図を自動作成 | 人間のコーディング不要</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">AI設計システム</p>
              <p className="font-bold text-yellow-400">完全自動化</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
          {[
            { id: 'input', name: 'AI設定', icon: Target },
            { id: 'generating', name: 'AI生成中', icon: Zap },
            { id: 'result', name: 'AI結果', icon: Video }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => !isGenerating && setTab(t.id)}
              disabled={isGenerating && t.id !== 'generating'}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
                tab === t.id ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        )}

        {/* AI設定タブ */}
        {tab === 'input' && (
          <div className="space-y-6">
            {/* 動画形式選択 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">🧠 AI 動画形式選択</h2>
              <div className="grid grid-cols-3 gap-4">
                {formats.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`p-4 rounded-lg border-2 transition-all relative ${
                      format === f.id ? 'border-yellow-400 bg-white/20' : 'border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {f.recommended && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                        AI推奨
                      </div>
                    )}
                    <f.icon className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                    <div className="font-bold">{f.name}</div>
                    <div className="text-sm text-gray-400 mb-2">{f.desc}</div>
                    <div className="text-sm text-green-400">{f.revenue}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* キーワード入力 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">🎯 AI 解析用キーワード</h2>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="例: ワイヤレスイヤホン（AI が自動で商品・レイアウト・色彩を決定）"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:border-yellow-400 focus:outline-none text-white placeholder-gray-400"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {['ワイヤレスイヤホン', '美容クリーム', 'スマートウォッチ', 'ノートPC', '筋トレグッズ'].map(k => (
                  <button
                    key={k}
                    onClick={() => setKeyword(k)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors"
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-500/20 rounded-lg">
                <div className="text-sm text-blue-400 font-bold mb-1">🤖 AI が自動決定する要素</div>
                <div className="text-xs text-gray-300">
                  商品選定・価格調査・ランキング順位・色彩設計・フォントサイズ・レイアウト・時間配分・アニメーション
                </div>
              </div>
            </div>

            {/* AI テンプレート選択 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">🎨 AI テンプレート選択</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      template === t.id ? 'border-yellow-400 bg-white/20' : 'border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="text-2xl">{t.icon}</div>
                      <div className="font-bold">{t.name}</div>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">{t.desc}</div>
                    <div className="text-xs text-yellow-400 bg-yellow-400/10 rounded p-2">
                      🧠 {t.aiFeature}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI生成ボタン */}
            <button
              onClick={handleGenerate}
              disabled={!keyword || isGenerating}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 text-black font-bold py-6 rounded-xl text-xl flex items-center justify-center space-x-2 transition-all transform hover:scale-105 disabled:scale-100"
            >
              <Zap className="w-6 h-6" />
              <span>
                🧠 AI に動画設計を依頼 → 自動生成開始
              </span>
            </button>

            <div className="text-center text-sm text-gray-400">
              ⚡ AI が 5-10秒で動画の設計図を作成し、自動で動画を生成します
            </div>
          </div>
        )}

        {/* AI生成中タブ */}
        {tab === 'generating' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
            <div className="text-2xl font-bold mb-4">🧠 {status || 'AI が設計図を作成中...'}</div>
            <div className="w-full bg-white/20 rounded-full h-4 mb-6">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-lg font-bold text-yellow-400 mb-4">
              {Math.floor(progress)}% 完了
            </div>
            <div className="text-gray-400 mb-8">
              {progress < 20 
                ? '🎨 AI がレイアウト・色彩・構成を設計中...'
                : progress < 60
                ? '🎬 AI設計図に基づいて動画を生成中...'
                : '✨ 最終調整・品質チェック中...'}
            </div>
            
            {progress === 100 && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400">🧠 AI完全主導生成完了！</span>
              </div>
            )}
          </div>
        )}

        {/* AI結果タブ */}
        {tab === 'result' && videos && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-yellow-400 mb-2">🧠 AI設計完了！</h2>
              <p className="text-gray-400">
                ChatGPT が設計した動画をお楽しみください
              </p>
            </div>

            {/* 動画表示 */}
            {format === 'hybrid' && videos.medium && videos.short ? (
              /* ハイブリッド表示 */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ミディアム動画 */}
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3 flex items-center">
                    <Monitor className="w-5 h-5 mr-2 text-green-400" />
                    AI設計ミディアム動画
                  </h3>
                  <div className="bg-black/30 rounded p-4 mb-4 text-center">
                    <div className="text-4xl mb-2">{videos.medium.thumbnail}</div>
                    <div className="font-bold">{videos.medium.title}</div>
                    <div className="text-sm text-gray-400">{videos.medium.duration} | {videos.medium.videoData.size}</div>
                    <div className="text-xs text-green-400 mt-1">{videos.medium.format}</div>
                  </div>
                  <div className="flex space-x-2 mb-4">
                    <button 
                      onClick={() => window.open(videos.medium.videoData.url)}
                      className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center justify-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>再生</span>
                    </button>
                    <button 
                      onClick={() => downloadVideo(videos.medium.videoData, `ai_medium_${keyword}.webm`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>動画DL</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => downloadDesign(videos.medium.aiDesign, `ai_design_medium_${keyword}.json`)}
                    className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm flex items-center justify-center space-x-2"
                  >
                    <Download className="w-3 h-3" />
                    <span>🧠 AI設計図DL</span>
                  </button>
                </div>

                {/* ショート動画 */}
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3 flex items-center">
                    <Smartphone className="w-5 h-5 mr-2 text-blue-400" />
                    AI設計ショート動画
                  </h3>
                  <div className="bg-black/30 rounded p-4 mb-4 text-center">
                    <div className="text-4xl mb-2">{videos.short.thumbnail}</div>
                    <div className="font-bold">{videos.short.title}</div>
                    <div className="text-sm text-gray-400">{videos.short.duration} | {videos.short.videoData.size}</div>
                    <div className="text-xs text-blue-400 mt-1">{videos.short.format}</div>
                  </div>
                  <div className="flex space-x-2 mb-4">
                    <button 
                      onClick={() => window.open(videos.short.videoData.url)}
                      className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center justify-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>再生</span>
                    </button>
                    <button 
                      onClick={() => downloadVideo(videos.short.videoData, `ai_short_${keyword}.webm`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>動画DL</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => downloadDesign(videos.short.aiDesign, `ai_design_short_${keyword}.json`)}
                    className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm flex items-center justify-center space-x-2"
                  >
                    <Download className="w-3 h-3" />
                    <span>🧠 AI設計図DL</span>
                  </button>
                </div>
              </div>
            ) : (
              /* 単体動画表示 */
              <div className="bg-white/10 rounded-xl p-6 text-center">
                {(() => {
                  const video = format === 'short' ? videos.short : videos.medium;
                  return video ? (
                    <>
                      <div className="text-4xl mb-4">{video.thumbnail}</div>
                      <div className="font-bold text-xl mb-2">{video.title}</div>
                      <div className="text-gray-400 mb-2">{video.duration} | {video.videoData.size}</div>
                      <div className="text-sm text-yellow-400 mb-4">🧠 AI設計: {video.format}</div>
                      <div className="flex justify-center space-x-4 mb-4">
                        <button 
                          onClick={() => window.open(video.videoData.url)}
                          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg flex items-center space-x-2"
                        >
                          <Play className="w-5 h-5" />
                          <span>再生</span>
                        </button>
                        <button 
                          onClick={() => downloadVideo(video.videoData, `ai_${format}_${keyword}.webm`)}
                          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg flex items-center space-x-2"
                        >
                          <Download className="w-5 h-5" />
                          <span>動画DL</span>
                        </button>
                      </div>
                      <button 
                        onClick={() => downloadDesign(video.aiDesign, `ai_design_${format}_${keyword}.json`)}
                        className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg flex items-center space-x-2"
                      >
                        <Download className="w-5 h-5" />
                        <span>🧠 AI設計図ダウンロード</span>
                      </button>
                    </>
                  ) : null;
                })()}
              </div>
            )}

            {/* AI設計の威力表示 */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-400/30">
              <h3 className="text-xl font-bold mb-4">🧠 AI完全主導の威力</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-yellow-400">0行</div>
                  <div className="text-sm text-gray-400">手動テンプレートコード</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">100%</div>
                  <div className="text-sm text-gray-400">AI自動設計</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">5-10秒</div>
                  <div className="text-sm text-gray-400">設計完了時間</div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-white/10 rounded-lg">
                <div className="text-sm text-gray-300 space-y-1">
                  <div>🎨 <strong>レイアウト設計</strong>: ChatGPT が最適な配置を決定</div>
                  <div>🎨 <strong>色彩設計</strong>: キーワードに合った色合いを自動選択</div>
                  <div>⏰ <strong>時間配分</strong>: コンテンツ量に応じた最適なタイミング</div>
                  <div>📱 <strong>フォーマット最適化</strong>: ショート・ミディアムそれぞれに最適化</div>
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="text-center">
              <button
                onClick={resetAll}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-lg font-bold"
              >
                🧠 新しいAI設計で動画生成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGenerator;