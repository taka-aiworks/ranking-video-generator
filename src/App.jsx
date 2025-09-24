import React, { useState, useRef, useEffect } from 'react';
import { Play, Download, Upload, Settings, Zap, Star, TrendingUp, Video, Image, Music, Target, Clock, DollarSign, RotateCcw, ArrowRight, Smartphone, Monitor } from 'lucide-react';

const HybridVideoGenerator = () => {
  const [keyword, setKeyword] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('hybrid'); // hybrid, short, medium
  const [selectedTemplate, setSelectedTemplate] = useState('ranking');
  const [selectedDuration, setSelectedDuration] = useState('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState(null);
  const [currentStep, setCurrentStep] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const canvasRef = useRef(null);

  const formats = [
    { 
      id: 'hybrid', 
      name: 'ハイブリッド', 
      desc: 'ショート+ミディアム両方生成',
      icon: RotateCcw,
      color: 'from-purple-500 to-pink-500',
      revenue: '月15-35万円',
      recommended: true
    },
    { 
      id: 'short', 
      name: 'ショート特化', 
      desc: '15-60秒の短尺動画',
      icon: Smartphone,
      color: 'from-blue-500 to-cyan-500',
      revenue: '月5-15万円',
      recommended: false
    },
    { 
      id: 'medium', 
      name: 'ミディアム特化', 
      desc: '3-8分の中尺動画',
      icon: Monitor,
      color: 'from-green-500 to-emerald-500',
      revenue: '月10-25万円',
      recommended: false
    }
  ];

  const templates = [
    { 
      id: 'ranking', 
      name: 'ランキング', 
      desc: 'おすすめ商品TOP5-10',
      shortDuration: '30-60秒',
      mediumDuration: '4-6分',
      color: 'bg-red-500' 
    },
    { 
      id: 'comparison', 
      name: '比較(VS)', 
      desc: '商品・サービス比較',
      shortDuration: '45-60秒',
      mediumDuration: '5-7分',
      color: 'bg-blue-500' 
    },
    { 
      id: 'tutorial', 
      name: 'チュートリアル', 
      desc: 'How-to・使い方解説',
      shortDuration: '30-45秒',
      mediumDuration: '3-5分',
      color: 'bg-green-500' 
    },
    { 
      id: 'news', 
      name: 'トレンドニュース', 
      desc: '最新情報・話題解説',
      shortDuration: '15-30秒',
      mediumDuration: '3-4分',
      color: 'bg-purple-500' 
    }
  ];

  const durationOptions = [
    { id: 'auto', name: '自動最適化', desc: 'AIが最適な尺を判定' },
    { id: 'short', name: 'ショート重視', desc: '15-60秒メイン' },
    { id: 'medium', name: 'ミディアム重視', desc: '3-8分メイン' },
    { id: 'custom', name: 'カスタム', desc: '尺を手動指定' }
  ];

  const generateSteps = {
    hybrid: [
      'マーケット分析中...',
      'ハイブリッド戦略策定中...',
      'ミディアム動画構成作成中...',
      'ショート動画抽出ポイント特定中...',
      'コンテンツ同期生成中...',
      'クロスプロモーション設定中...',
      '相互リンク生成中...',
      '最終最適化中...'
    ],
    short: [
      'トレンド分析中...',
      'バズポイント特定中...',
      'ショート最適化中...',
      'エフェクト適用中...',
      'エンゲージメント最大化中...'
    ],
    medium: [
      '詳細リサーチ中...',
      '収益化対策準備中...',
      '長尺構成作成中...',
      'SEO最適化中...',
      'レンダリング中...'
    ]
  };

  const generateVideo = async () => {
    setIsGenerating(true);
    setProgress(0);
    setGeneratedVideos(null);
    setActiveTab('generating');

    const steps = generateSteps[selectedFormat];
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i]);
      setProgress((i + 1) / steps.length * 100);
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    // ハイブリッド戦略の場合は複数動画生成
    const mockResults = selectedFormat === 'hybrid' ? {
      medium: {
        title: `【完全ガイド】${keyword} おすすめランキングTOP10 - 2025年最新版`,
        duration: '5:24',
        thumbnail: '🎬',
        format: '16:9 (横型)',
        description: `${keyword}を徹底比較！専門家が選ぶおすすめTOP10を詳しく解説します。\n\n🔥 ショート版もチェック → [自動リンク]\n\n▼タイムスタンプ\n0:00 イントロ\n0:30 選定基準\n1:00 TOP10発表\n...\n\n▼紹介商品\n1位: [商品名] - https://amzn.to/xxx\n2位: [商品名] - https://amzn.to/xxx`,
        tags: ['おすすめ', keyword, 'ランキング', 'レビュー', '2025年最新', '完全ガイド'],
        estimatedRevenue: Math.floor(Math.random() * 25000) + 15000,
        seoScore: 92,
        monetization: '広告収益+アフィリエイト'
      },
      short: {
        title: `${keyword} TOP3をサクッと紹介！ #shorts`,
        duration: '0:45',
        thumbnail: '⚡',
        format: '9:16 (縦型)',
        description: `${keyword}のおすすめTOP3を45秒でサクッと解説！\n\n📺 詳細版はこちら → [自動リンク]\n\n#${keyword} #おすすめ #shorts`,
        tags: ['shorts', keyword, 'おすすめ', 'サクッと', 'TOP3'],
        estimatedRevenue: Math.floor(Math.random() * 8000) + 3000,
        viralPotential: 89,
        engagement: 'バズ狙い最適化'
      },
      crossPromotion: {
        shortToMedium: '「詳しい比較が見たい方は概要欄のリンクから！」',
        mediumToShort: '「サクッと知りたい方はショート版もどうぞ！」',
        strategy: '相互送客による視聴時間最大化'
      }
    } : selectedFormat === 'short' ? {
      short: {
        title: `${keyword} おすすめTOP3 #shorts`,
        duration: '0:50',
        thumbnail: '⚡',
        format: '9:16 (縦型)',
        description: `${keyword}のおすすめを50秒でご紹介！`,
        tags: ['shorts', keyword, 'おすすめ'],
        estimatedRevenue: Math.floor(Math.random() * 8000) + 2000,
        viralPotential: 85
      }
    } : {
      medium: {
        title: `【2025年版】${keyword} 完全比較ガイド`,
        duration: '6:15',
        thumbnail: '🎬',
        format: '16:9 (横型)',
        description: `${keyword}を専門家が詳しく解説します。`,
        tags: [keyword, 'レビュー', '比較', '2025年'],
        estimatedRevenue: Math.floor(Math.random() * 20000) + 10000,
        seoScore: 88
      }
    };

    setGeneratedVideos(mockResults);
    setIsGenerating(false);
    setActiveTab('result');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI ハイブリッド動画生成ツール</h1>
                <p className="text-sm text-gray-300">ショート+ミディアム動画を同時生成 | 収益最大化戦略</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-300">今月の予想収益</p>
                <p className="font-bold text-green-400">¥234,000</p>
              </div>
              <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
          {[
            { id: 'input', name: '設定', icon: Target },
            { id: 'generating', name: '生成中', icon: Zap },
            { id: 'result', name: '結果', icon: Video }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.id === 'generating' && !isGenerating}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 入力タブ */}
        {activeTab === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* 動画形式選択 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <RotateCcw className="w-5 h-5 mr-2 text-purple-400" />
                  動画形式選択
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formats.map((format) => (
                    <div
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedFormat === format.id
                          ? 'border-yellow-400 bg-white/20'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {format.recommended && (
                        <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                          推奨
                        </div>
                      )}
                      <div className={`w-12 h-12 bg-gradient-to-r ${format.color} rounded-lg flex items-center justify-center mb-3`}>
                        <format.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-lg mb-1">{format.name}</h3>
                      <p className="text-sm text-gray-400 mb-3">{format.desc}</p>
                      <div className="text-sm font-bold text-green-400">{format.revenue}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* キーワード入力 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-yellow-400" />
                  キーワード入力
                </h2>
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="例: ワイヤレスイヤホン、美容クリーム、筋トレグッズ"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:border-yellow-400 focus:outline-none transition-colors text-white placeholder-gray-400"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['ワイヤレスイヤホン', '美容クリーム', '筋トレグッズ', 'スマートウォッチ', 'ノートPC'].map((suggestion) => (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTemplate === template.id
                          ? 'border-yellow-400 bg-white/20'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-4 h-4 ${template.color} rounded`}></div>
                        <div className="font-bold">{template.name}</div>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">{template.desc}</div>
                      {selectedFormat === 'hybrid' && (
                        <div className="text-xs space-y-1">
                          <div>📱 ショート: {template.shortDuration}</div>
                          <div>🖥️ ミディアム: {template.mediumDuration}</div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 生成ボタン */}
              <button
                onClick={generateVideo}
                disabled={!keyword || isGenerating}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold py-6 px-8 rounded-xl text-xl transition-all transform hover:scale-105 disabled:scale-100 disabled:text-gray-400 flex items-center justify-center space-x-2"
              >
                <Zap className="w-6 h-6" />
                <span>
                  {selectedFormat === 'hybrid' ? 'ハイブリッド動画生成開始'
                    : selectedFormat === 'short' ? 'ショート動画生成開始'
                    : 'ミディアム動画生成開始'}
                </span>
              </button>
            </div>

            {/* サイドバー */}
            <div className="space-y-6">
              {/* ハイブリッド戦略メリット */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-400/30">
                <h3 className="font-bold mb-4 flex items-center">
                  <Star className="w-4 h-4 mr-2 text-yellow-400" />
                  ハイブリッド戦略の威力
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>収益化期間を50%短縮</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>相互送客で視聴時間UP</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>複数プラットフォーム対応</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span>競合との圧倒的差別化</span>
                  </div>
                </div>
              </div>

              {/* リアルタイム統計 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="font-bold mb-4 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                  リアルタイム統計
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">今日の生成数</span>
                    <span className="font-bold">1,247本</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ハイブリッド選択率</span>
                    <span className="font-bold text-purple-400">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">平均収益向上</span>
                    <span className="font-bold text-green-400">+240%</span>
                  </div>
                </div>
              </div>

              {/* 機能一覧 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="font-bold mb-4">AIが自動化する機能</h3>
                <div className="space-y-3">
                  {[
                    { icon: Image, text: 'サムネイル同時生成', color: 'text-blue-400' },
                    { icon: Music, text: '尺別BGM最適化', color: 'text-purple-400' },
                    { icon: Star, text: '相互リンク自動挿入', color: 'text-yellow-400' },
                    { icon: Clock, text: '同時レンダリング', color: 'text-green-400' },
                    { icon: TrendingUp, text: 'SEO最適化', color: 'text-red-400' }
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
        )}

        {/* 生成中タブ */}
        {activeTab === 'generating' && isGenerating && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
              <div className="text-2xl font-bold mb-4">{currentStep}</div>
              <div className="w-full bg-white/20 rounded-full h-4 mb-6">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-lg font-bold text-yellow-400 mb-2">
                {Math.floor(progress)}% 完了
              </div>
              <div className="text-gray-400 mb-8">
                {selectedFormat === 'hybrid' 
                  ? 'ショート＋ミディアム動画を同時生成しています...'
                  : selectedFormat === 'short'
                  ? 'バズを狙ったショート動画を生成しています...'
                  : '収益化に最適なミディアム動画を生成しています...'}
              </div>
              
              {selectedFormat === 'hybrid' && (
                <div className="grid grid-cols-2 gap-6 text-left">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Monitor className="w-5 h-5 text-green-400" />
                      <span className="font-bold">ミディアム動画</span>
                    </div>
                    <div className="text-sm text-gray-400">収益化基盤構築中...</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Smartphone className="w-5 h-5 text-blue-400" />
                      <span className="font-bold">ショート動画</span>
                    </div>
                    <div className="text-sm text-gray-400">バズポイント最適化中...</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 結果タブ */}
        {activeTab === 'result' && generatedVideos && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                🎉 動画生成完了！
              </h2>
              <p className="text-gray-400">
                {selectedFormat === 'hybrid' ? 'ショート＋ミディアム動画の同時投稿でチャンネルを爆伸びさせましょう！'
                  : selectedFormat === 'short' ? 'バズ狙いのショート動画が完成しました！'
                  : '収益化に最適なミディアム動画が完成しました！'}
              </p>
            </div>

            {selectedFormat === 'hybrid' ? (
              <>
                {/* ハイブリッド結果 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* ミディアム動画 */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Monitor className="w-6 h-6 text-green-400" />
                      <h3 className="text-xl font-bold">ミディアム動画（収益化メイン）</h3>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 mb-4">
                      <div className="text-4xl text-center mb-2">{generatedVideos.medium.thumbnail}</div>
                      <div className="text-center">
                        <div className="font-bold text-lg mb-1">{generatedVideos.medium.title}</div>
                        <div className="text-sm text-gray-400 space-x-4">
                          <span>⏱️ {generatedVideos.medium.duration}</span>
                          <span>📺 {generatedVideos.medium.format}</span>
                          <span>📊 SEO {generatedVideos.medium.seoScore}/100</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="w-5 h-5 text-green-400" />
                          <span className="font-bold">予想月収</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          ¥{generatedVideos.medium.estimatedRevenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{generatedVideos.medium.monetization}</div>
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
                  </div>

                  {/* ショート動画 */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Smartphone className="w-6 h-6 text-blue-400" />
                      <h3 className="text-xl font-bold">ショート動画（バズ狙い）</h3>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 mb-4">
                      <div className="text-4xl text-center mb-2">{generatedVideos.short.thumbnail}</div>
                      <div className="text-center">
                        <div className="font-bold text-lg mb-1">{generatedVideos.short.title}</div>
                        <div className="text-sm text-gray-400 space-x-4">
                          <span>⏱️ {generatedVideos.short.duration}</span>
                          <span>📱 {generatedVideos.short.format}</span>
                          <span>🔥 バズ度 {generatedVideos.short.viralPotential}/100</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-blue-400" />
                          <span className="font-bold">予想月収</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-400">
                          ¥{generatedVideos.short.estimatedRevenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{generatedVideos.short.engagement}</div>
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
                  </div>
                </div>

                {/* ハイブリッド戦略効果 */}
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-400/30">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <RotateCcw className="w-5 h-5 mr-2 text-purple-400" />
                    ハイブリッド戦略の相乗効果
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">
                        ¥{(generatedVideos.medium.estimatedRevenue + generatedVideos.short.estimatedRevenue).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">合計予想月収</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-400 mb-2">240%</div>
                      <div className="text-sm text-gray-400">単体比収益向上</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400 mb-2">3-6ヶ月</div>
                      <div className="text-sm text-gray-400">収益化期間</div>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-white/10 rounded-lg">
                    <h4 className="font-bold mb-2">🔄 相互送客戦略</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <ArrowRight className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300">ショート → ミディアム:</span>
                        <span>"{generatedVideos.crossPromotion.shortToMedium}"</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ArrowRight className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-300">ミディアム → ショート:</span>
                        <span>"{generatedVideos.crossPromotion.mediumToShort}"</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* YouTube 投稿用コンテンツ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ミディアム動画用 */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <h4 className="font-bold mb-4 flex items-center">
                      <Monitor className="w-4 h-4 mr-2 text-green-400" />
                      ミディアム動画用コンテンツ
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-bold mb-2">YouTube 説明文</h5>
                        <textarea 
                          value={generatedVideos.medium.description}
                          readOnly
                          className="w-full h-32 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-sm resize-none"
                        />
                      </div>
                      <div>
                        <h5 className="font-bold mb-2">推奨タグ</h5>
                        <div className="flex flex-wrap gap-1">
                          {generatedVideos.medium.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ショート動画用 */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <h4 className="font-bold mb-4 flex items-center">
                      <Smartphone className="w-4 h-4 mr-2 text-blue-400" />
                      ショート動画用コンテンツ
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-bold mb-2">YouTube 説明文</h5>
                        <textarea 
                          value={generatedVideos.short.description}
                          readOnly
                          className="w-full h-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-sm resize-none"
                        />
                      </div>
                      <div>
                        <h5 className="font-bold mb-2">推奨タグ</h5>
                        <div className="flex flex-wrap gap-1">
                          {generatedVideos.short.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 投稿戦略ガイド */}
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-400/30">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-yellow-400" />
                    推奨投稿戦略
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold mb-3 text-green-400">ミディアム動画</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>週2-3回の定期投稿</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>平日19-21時の投稿推奨</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>収益化条件クリア重視</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold mb-3 text-blue-400">ショート動画</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>毎日投稿でアルゴリズム攻略</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>18-20時のゴールデンタイム</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>バズによるチャンネル成長</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* 単体動画結果 */
              <div className="max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <div className="bg-black/30 rounded-lg p-4 mb-4">
                        <div className="text-6xl text-center mb-4">
                          {selectedFormat === 'short' ? generatedVideos.short.thumbnail : generatedVideos.medium.thumbnail}
                        </div>
                        <div className="text-center">
                          <div className="font-bold">
                            {selectedFormat === 'short' ? generatedVideos.short.title : generatedVideos.medium.title}
                          </div>
                          <div className="text-sm text-gray-400">
                            時間: {selectedFormat === 'short' ? generatedVideos.short.duration : generatedVideos.medium.duration}
                          </div>
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
                      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="w-5 h-5 text-green-400" />
                          <span className="font-bold">予想収益</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          ¥{(selectedFormat === 'short' ? generatedVideos.short.estimatedRevenue : generatedVideos.medium.estimatedRevenue).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold mb-2">推奨タグ</h4>
                        <div className="flex flex-wrap gap-1">
                          {(selectedFormat === 'short' ? generatedVideos.short.tags : generatedVideos.medium.tags).map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 次のアクション */}
            <div className="text-center space-y-4">
              <button
                onClick={() => {
                  setActiveTab('input');
                  setKeyword('');
                  setGeneratedVideos(null);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-3 rounded-lg font-bold transition-colors flex items-center space-x-2 mx-auto"
              >
                <Zap className="w-5 h-5" />
                <span>新しい動画を生成する</span>
              </button>
              <p className="text-gray-400 text-sm">
                ハイブリッド戦略で収益を最大化し、YouTubeチャンネルを成功に導きましょう！
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HybridVideoGenerator;