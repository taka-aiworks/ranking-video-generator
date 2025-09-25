// src/components/Generator/FlexibleVideoGenerator.jsx - 時間選択対応版

import React, { useState, useRef, useCallback } from 'react';
import { Play, Download, Zap, Smartphone, Monitor, Video, Edit3, Save, AlertCircle, CheckCircle, Clock } from 'lucide-react';

// サービス層インポート
import openaiService from '../../services/api/openai.js';
import videoComposer from '../../services/video/videoComposer.js';

const FlexibleVideoGenerator = () => {
  // === 基本状態 ===
  const [keyword, setKeyword] = useState('');
  const [format, setFormat] = useState('short');
  const [customDuration, setCustomDuration] = useState(30);
  const [tab, setTab] = useState('input');
  
  // === 生成状態 ===
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);

  // === 編集状態 ===
  const [generatedScript, setGeneratedScript] = useState(null);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editableScript, setEditableScript] = useState(null);

  // === Canvas参照 ===
  const canvasRef = useRef(null);

  // === フォーマット設定（時間選択対応） ===
  const formats = [
    { 
      id: 'short', 
      name: 'ショート動画', 
      icon: Smartphone, 
      desc: '縦型動画 (9:16)',
      platform: 'TikTok, YouTube Shorts',
      durations: [15, 30, 45, 60],
      defaultDuration: 30
    },
    { 
      id: 'medium', 
      name: 'ミディアム動画', 
      icon: Monitor, 
      desc: '横型動画 (16:9)', 
      platform: 'YouTube通常動画',
      durations: [60, 120, 180, 300, 480],
      defaultDuration: 120
    }
  ];

  // 時間プリセット
  const durationPresets = {
    short: [
      { value: 15, label: '15秒', desc: '超短編' },
      { value: 30, label: '30秒', desc: '標準' },
      { value: 45, label: '45秒', desc: '詳しめ' },
      { value: 60, label: '60秒', desc: '最大' }
    ],
    medium: [
      { value: 60, label: '1分', desc: 'コンパクト' },
      { value: 120, label: '2分', desc: '標準' },
      { value: 180, label: '3分', desc: '詳細' },
      { value: 300, label: '5分', desc: '徹底解説' },
      { value: 480, label: '8分', desc: '完全版' }
    ]
  };

  // フォーマット変更時の処理
  const handleFormatChange = useCallback((newFormat) => {
    setFormat(newFormat);
    const formatData = formats.find(f => f.id === newFormat);
    setCustomDuration(formatData?.defaultDuration || 30);
  }, [formats]);

  // スクリプト保存
  const handleSaveScript = useCallback(() => {
    if (editableScript) {
      setGeneratedScript(editableScript);
      setIsEditingScript(false);
      console.log('✅ スクリプト保存完了:', editableScript.title);
    }
  }, [editableScript]);

  // 編集開始
  const handleStartEditing = useCallback(() => {
    if (generatedScript) {
      setEditableScript(JSON.parse(JSON.stringify(generatedScript)));
      setIsEditingScript(true);
    }
  }, [generatedScript]);

  // AI動画生成（時間指定対応版）
  const handleGenerate = useCallback(async () => {
    if (!keyword.trim()) {
      setError('キーワードを入力してください');
      return;
    }

    if (customDuration < 15 || customDuration > 480) {
      setError('動画時間は15秒〜8分(480秒)の範囲で設定してください');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setTab('generating');
    setGeneratedScript(null);

    try {
      setStatus(`🧠 "${keyword}" の${customDuration}秒動画設計をAIが作成中...`);
      setProgress(20);

      // AI設計図生成（指定時間で文章量を調整）
      const videoDesign = await openaiService.generateVideoDesignWithDuration(
        keyword, 
        format, 
        customDuration
      );

      // 生成されたスクリプトを保存
      setGeneratedScript(videoDesign);
      setTab('script');
      
      setStatus(`📝 ${customDuration}秒動画の設計図完成！内容を確認できます`);
      setProgress(40);
      
      // Canvas初期化
      videoComposer.initCanvas(canvasRef, videoDesign);
      
      setStatus(`🎬 ${customDuration}秒動画を生成中...`);
      setProgress(50);
      
      // 動画生成
      const generatedVideo = await videoComposer.generateVideoFromDesign(
        videoDesign,
        (videoProgress) => {
          setProgress(50 + (videoProgress * 0.45)); // 50-95%
        }
      );

      // 結果保存
      const result = {
        title: videoDesign.title,
        duration: `${videoDesign.duration}秒`,
        format: `${videoDesign.canvas.width}x${videoDesign.canvas.height}`,
        thumbnail: format === 'short' ? '📱' : '🎬',
        description: videoDesign.metadata?.description || '',
        tags: videoDesign.metadata?.tags || [],
        videoData: generatedVideo,
        aiDesign: videoDesign
      };

      setStatus(`✅ ${customDuration}秒動画生成完了！`);
      setProgress(100);
      setVideo(result);

      // 結果表示へ移行
      setTimeout(() => {
        setTab('result');
      }, 1500);

    } catch (err) {
      console.error('AI動画生成エラー:', err);
      setError('AI動画生成でエラーが発生しました: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [keyword, format, customDuration]);

  // ダウンロード
  const downloadVideo = useCallback((videoData, filename) => {
    if (!videoData?.url) return;
    
    const a = document.createElement('a');
    a.href = videoData.url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // リセット
  const resetAll = useCallback(() => {
    setKeyword('');
    setFormat('short');
    setCustomDuration(30);
    setTab('input');
    setIsGenerating(false);
    setProgress(0);
    setStatus('');
    setVideo(null);
    setError(null);
    setGeneratedScript(null);
    setIsEditingScript(false);
    setEditableScript(null);
  }, []);

  // 現在のフォーマットデータ取得
  const currentFormat = formats.find(f => f.id === format) || formats[0];
  const currentPresets = durationPresets[format] || durationPresets.short;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold">⏱️ 時間選択式 AI動画生成</h1>
                <p className="text-sm text-gray-300">15秒〜8分まで自由に時間を設定できます</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
          {[
            { id: 'input', name: '設定', icon: Clock },
            { id: 'script', name: 'スクリプト', icon: Edit3 },
            { id: 'generating', name: '生成中', icon: Video },
            { id: 'result', name: '完成', icon: CheckCircle }
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

        {/* 設定タブ */}
        {tab === 'input' && (
          <div className="space-y-6">
            {/* キーワード入力 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">🎯 動画のテーマ</h2>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="例: ワイヤレスイヤホン / 子育てでやったほうがいいこと / iPhone vs Android"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:border-yellow-400 focus:outline-none text-white placeholder-gray-400 text-lg"
              />
              
              {/* サンプルキーワード */}
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">💡 人気キーワード:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'ワイヤレスイヤホン おすすめ',
                    '子育てでやったほうがいいこと',
                    'iPhone vs Android',
                    '副業の始め方',
                    '筋トレ 初心者',
                    '投資 始め方',
                    '節約術',
                    '美容液 おすすめ'
                  ].map(k => (
                    <button
                      key={k}
                      onClick={() => setKeyword(k)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* フォーマット選択 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">📱 動画フォーマット</h2>
              <div className="grid grid-cols-2 gap-4">
                {formats.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleFormatChange(f.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      format === f.id ? 'border-yellow-400 bg-white/20' : 'border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <f.icon className="w-8 h-8 mb-2 text-yellow-400" />
                    <div className="font-bold">{f.name}</div>
                    <div className="text-sm text-gray-400 mb-1">{f.desc}</div>
                    <div className="text-xs text-green-400">{f.platform}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 時間設定 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">⏰ 動画の長さ</h2>
              
              {/* プリセット時間 */}
              <div className="mb-4">
                <p className="text-sm text-gray-300 mb-3">📋 おすすめ時間:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {currentPresets.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setCustomDuration(preset.value)}
                      className={`p-3 rounded-lg border transition-all text-center ${
                        customDuration === preset.value 
                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300' 
                          : 'border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-bold">{preset.label}</div>
                      <div className="text-xs text-gray-400">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* カスタム時間入力 */}
              <div>
                <p className="text-sm text-gray-300 mb-2">🎚️ カスタム時間:</p>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min={format === 'short' ? 15 : 60}
                    max={format === 'short' ? 60 : 480}
                    step="5"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={format === 'short' ? 15 : 60}
                      max={format === 'short' ? 60 : 480}
                      value={customDuration}
                      onChange={(e) => setCustomDuration(parseInt(e.target.value) || 30)}
                      className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-center text-white"
                    />
                    <span className="text-gray-300">秒</span>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-400">
                  範囲: {format === 'short' ? '15-60秒' : '60-480秒(8分)'}
                </div>
              </div>

              {/* 時間の説明 */}
              <div className="mt-4 p-4 bg-blue-500/20 rounded-lg">
                <div className="text-sm text-blue-400 font-bold mb-2">💡 {customDuration}秒動画について</div>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>• AIが{customDuration}秒に最適な文章量で内容を生成</div>
                  <div>• 項目数: 約{Math.max(2, Math.floor(customDuration / 15))}個</div>
                  <div>• 1項目あたり: 約{Math.floor(customDuration / Math.max(2, Math.floor(customDuration / 15)))}秒</div>
                </div>
              </div>
            </div>

            {/* 生成ボタン */}
            <button
              onClick={handleGenerate}
              disabled={!keyword || isGenerating}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 text-black font-bold py-6 rounded-xl text-xl flex items-center justify-center space-x-2 transition-all transform hover:scale-105 disabled:scale-100"
            >
              <Clock className="w-6 h-6" />
              <span>🎬 {customDuration}秒動画をAIに作ってもらう</span>
            </button>

            <div className="text-center text-sm text-gray-400">
              ⚡ AIが{customDuration}秒に最適な文章量で動画を生成します
            </div>
          </div>
        )}

        {/* 他のタブは既存と同様 */}
        {/* スクリプトタブ */}
        {tab === 'script' && (
          <div className="space-y-6">
            {!generatedScript ? (
              <div className="bg-white/10 rounded-xl p-8 text-center">
                <div className="text-6xl mb-4">📝</div>
                <div className="text-xl font-bold mb-2">まだスクリプトがありません</div>
                <div className="text-gray-400">設定タブでキーワードと時間を指定して動画を生成してください</div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">📝 {generatedScript.duration}秒動画スクリプト</h2>
                  <div className="flex space-x-2">
                    {!isEditingScript ? (
                      <button
                        onClick={handleStartEditing}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>編集</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveScript}
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>保存</span>
                      </button>
                    )}
                  </div>
                </div>

                <UniversalScriptDisplay 
                  script={isEditingScript ? editableScript : generatedScript}
                  isEditing={isEditingScript}
                  onUpdate={setEditableScript}
                  duration={customDuration}
                />
              </div>
            )}
          </div>
        )}

        {/* 生成中・完成タブは既存と同様 */}
        {tab === 'generating' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
            <div className="text-2xl font-bold mb-4">🤖 {status || `${customDuration}秒動画をAIが作成中...`}</div>
            <div className="w-full bg-white/20 rounded-full h-4 mb-6">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-lg font-bold text-yellow-400 mb-4">
              {Math.floor(progress)}% 完了
            </div>
          </div>
        )}

        {tab === 'result' && video && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-yellow-400 mb-2">🎉 {customDuration}秒動画完成！</h2>
              <p className="text-gray-400">AIが作成した動画をご確認ください</p>
            </div>

            <div className="bg-white/10 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">{video.thumbnail}</div>
              <div className="font-bold text-xl mb-2">{video.title}</div>
              <div className="text-gray-400 mb-2">{video.duration} | {video.videoData.size}</div>
              <div className="text-sm text-yellow-400 mb-6">{video.format}</div>
              
              <div className="flex justify-center space-x-4 mb-6">
                <button 
                  onClick={() => window.open(video.videoData.url)}
                  className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg flex items-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>再生</span>
                </button>
                <button 
                  onClick={() => downloadVideo(video.videoData, `ai_video_${customDuration}s_${keyword}.webm`)}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg flex items-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>ダウンロード</span>
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={resetAll}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-lg font-bold"
                >
                  🆕 別の動画を作る
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 汎用スクリプト表示コンポーネント（時間表示対応版）
const UniversalScriptDisplay = ({ script, isEditing, onUpdate, duration }) => {
  if (!script) return null;

  const updateField = (path, value) => {
    if (!isEditing || !onUpdate) return;
    
    const updated = { ...script };
    const keys = path.split('.');
    let current = updated;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      {/* 時間情報 */}
      <div className="bg-yellow-500/20 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-yellow-300">⏱️ 動画時間: {duration}秒</div>
            <div className="text-sm text-yellow-200">AIが{duration}秒に最適化して生成</div>
          </div>
          {script.estimatedCharacters && (
            <div className="text-right">
              <div className="text-sm text-yellow-300">📝 文字数: {script.estimatedCharacters}</div>
              <div className="text-xs text-yellow-200">約{Math.floor(script.estimatedCharacters / 5)}秒分</div>
            </div>
          )}
        </div>
      </div>

      {/* タイトル */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">動画タイトル</label>
        {isEditing ? (
          <input
            type="text"
            value={script.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
          />
        ) : (
          <div className="text-xl font-bold text-yellow-400">{script.title}</div>
        )}
      </div>

      {/* 内容項目 */}
      {script.items && (
        <div>
          <h3 className="font-bold text-lg mb-4">📋 {duration}秒動画の内容</h3>
          <div className="space-y-4">
            {script.items.map((item, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-500 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => {
                            const newItems = [...script.items];
                            newItems[index] = { ...newItems[index], name: e.target.value };
                            updateField('items', newItems);
                          }}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                          placeholder="項目名"
                        />
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => {
                            const newItems = [...script.items];
                            newItems[index] = { ...newItems[index], description: e.target.value };
                            updateField('items', newItems);
                          }}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                          rows="3"
                          placeholder="詳細説明"
                        />
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-bold text-white mb-2">{item.name}</h4>
                        <p className="text-gray-300 mb-2">{item.description}</p>
                        {item.features && item.features.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {item.features.map((feature, i) => (
                              <span key={i} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-sm">
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.personalComment && (
                          <div className="bg-purple-500/20 p-3 rounded mt-3">
                            <p className="text-sm text-gray-300">{item.personalComment}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlexibleVideoGenerator;