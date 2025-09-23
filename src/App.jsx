import React, { useState, useRef, useEffect } from 'react';
import { Play, Download, Upload, Settings, Zap, Star, TrendingUp, Video, Image, Music, Target, Clock, DollarSign } from 'lucide-react';

const RankingVideoGenerator = () => {
  const [keyword, setKeyword] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [currentStep, setCurrentStep] = useState('');
  const canvasRef = useRef(null);

  const templates = [
    { id: 'standard', name: 'スタンダード', desc: '横スクロール型', color: 'bg-blue-500' },
    { id: 'modern', name: 'モダン', desc: '縦型カード式', color: 'bg-purple-500' },
    { id: 'pop', name: 'ポップ', desc: 'アニメーション多用', color: 'bg-pink-500' },
    { id: 'simple', name: 'シンプル', desc: 'ミニマルデザイン', color: 'bg-green-500' },
    { id: 'premium', name: 'プレミアム', desc: '高級感重視', color: 'bg-yellow-600' }
  ];

  const generateSteps = [
    'キーワード分析中...',
    'トレンドデータ収集中...',
    '商品情報取得中...',
    'ランキング内容生成中...',
    'サムネイル作成中...',
    '動画素材準備中...',
    'エフェクト適用中...',
    '最終レンダリング中...'
  ];

  const generateVideo = async () => {
    setIsGenerating(true);
    setProgress(0);
    setGeneratedVideo(null);

    // 生成プロセスのシミュレーション
    for (let i = 0; i < generateSteps.length; i++) {
      setCurrentStep(generateSteps[i]);
      setProgress((i + 1) / generateSteps.length * 100);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // モックの生成結果
    setGeneratedVideo({
      title: `${keyword} おすすめランキングTOP5`,
      duration: '3:24',
      thumbnail: '🎬',
      description: `${keyword}のおすすめ商品を厳選してランキング形式でご紹介！\n\n▼紹介商品（アフィリエイトリンク）\n1位: [商品名] - https://amzn.to/xxx\n2位: [商品名] - https://amzn.to/xxx\n...`,
      tags: ['おすすめ', keyword, 'ランキング', 'レビュー', '2025年最新'],
      estimatedRevenue: Math.floor(Math.random() * 20000) + 5000
    });

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI ランキング動画生成ツール</h1>
                <p className="text-sm text-gray-300">フレーズ入力→完成動画の自動生成</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-300">生成可能回数</p>
                <p className="font-bold">∞</p>
              </div>
              <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 入力エリア */}
          <div className="lg:col-span-2 space-y-6">
            {/* キーワード入力 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-yellow-400" />
                キーワード入力
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ランキング対象</label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="例: ワイヤレスイヤホン、美容クリーム、筋トレグッズ"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:border-yellow-400 focus:outline-none transition-colors text-white placeholder-gray-400"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {['ワイヤレスイヤホン', '美容クリーム', '筋トレグッズ', 'スマートウォッチ', 'プロテイン'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setKeyword(suggestion)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* テンプレート選択 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Video className="w-5 h-5 mr-2 text-blue-400" />
                テンプレート選択
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate === template.id 
                        ? 'border-yellow-400 bg-white/20' 
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-12 h-8 ${template.color} rounded mb-2 mx-auto`}></div>
                    <div className="text-sm font-medium">{template.name}</div>
                    <div className="text-xs text-gray-400">{template.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 生成ボタン */}
            <button
              onClick={generateVideo}
              disabled={!keyword || isGenerating}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:text-gray-400 flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                  <span>生成中... {Math.floor(progress)}%</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>ランキング動画を自動生成</span>
                </>
              )}
            </button>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* リアルタイム統計 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="font-bold mb-4 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                リアルタイム統計
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">今日の生成数</span>
                  <span className="font-bold">847本</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">人気キーワード</span>
                  <span className="font-bold">美容グッズ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">平均収益</span>
                  <span className="font-bold text-green-400">¥12,340</span>
                </div>
              </div>
            </div>

            {/* 機能一覧 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="font-bold mb-4">含まれる機能</h3>
              <div className="space-y-3">
                {[
                  { icon: Image, text: 'AI サムネイル生成', color: 'text-blue-400' },
                  { icon: Music, text: 'BGM 自動選択', color: 'text-purple-400' },
                  { icon: Star, text: 'アフィリリンク挿入', color: 'text-yellow-400' },
                  { icon: Clock, text: '3分で完成', color: 'text-green-400' }
                ].map((feature, i) => (
                  <div key={i} className="flex items-center space-x-3 text-sm">
                    <feature.icon className={`w-4 h-4 ${feature.color}`} />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 生成プロセス */}
        {isGenerating && (
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-center">
              <div className="text-lg font-bold mb-2">{currentStep}</div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-400">
                AI が全自動でランキング動画を生成しています...
              </div>
            </div>
          </div>
        )}

        {/* 生成結果 */}
        {generatedVideo && (
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Video className="w-5 h-5 mr-2 text-green-400" />
              生成完了！
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="bg-black/30 rounded-lg p-4 mb-4">
                  <div className="text-6xl text-center mb-4">{generatedVideo.thumbnail}</div>
                  <div className="text-center">
                    <div className="font-bold">{generatedVideo.title}</div>
                    <div className="text-sm text-gray-400">時間: {generatedVideo.duration}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2">
                    <Play className="w-4 h-4" />
                    <span>プレビュー</span>
                  </button>
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>ダウンロード</span>
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold mb-2">YouTube 説明文</h4>
                  <textarea 
                    value={generatedVideo.description}
                    readOnly
                    className="w-full h-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-sm resize-none"
                  />
                </div>
                <div>
                  <h4 className="font-bold mb-2">推奨タグ</h4>
                  <div className="flex flex-wrap gap-1">
                    {generatedVideo.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="font-bold">予想収益</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    ¥{generatedVideo.estimatedRevenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    アフィリエイト収益 (月間想定)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingVideoGenerator;