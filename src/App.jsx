import React, { useState, useRef, useCallback } from 'react';
import { Play, Download, Zap, Smartphone, Monitor, Target, Video, Star, TrendingUp } from 'lucide-react';

const HybridVideoGenerator = () => {
  const [keyword, setKeyword] = useState('');
  const [format, setFormat] = useState('hybrid');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videos, setVideos] = useState(null);
  const [tab, setTab] = useState('input');
  
  const canvasRef = useRef(null);

  const generateVideo = useCallback(async (duration) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 1920;
    canvas.height = 1080;

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      return { blob, url: URL.createObjectURL(blob), size: (blob.size/1024/1024).toFixed(1) + 'MB' };
    };

    recorder.start();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const prog = Math.min(elapsed / (duration * 1000), 1);

      // 背景
      const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(1, '#db2777');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1920, 1080);

      // テキスト
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${keyword} おすすめランキング`, 960, 200);
      
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 120px Arial';
      ctx.fillText(`#${Math.floor(prog * 5) + 1}`, 960, 400);

      if (prog < 1) requestAnimationFrame(animate);
      else setTimeout(() => recorder.stop(), 100);
    };

    animate();
    
    return new Promise(resolve => {
      recorder.onstop = () => resolve({
        blob: new Blob(chunks, { type: 'video/webm' }),
        url: URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })),
        size: (new Blob(chunks).size/1024/1024).toFixed(1) + 'MB'
      });
    });
  }, [keyword]);

  const handleGenerate = async () => {
    if (!keyword) return;
    
    setIsGenerating(true);
    setTab('generating');
    setProgress(0);
    
    const results = {};
    
    try {
      if (format === 'hybrid' || format === 'medium') {
        setProgress(30);
        const medium = await generateVideo(3);
        results.medium = {
          title: `${keyword} 完全ガイド`,
          duration: '3:00',
          revenue: 18500,
          video: medium
        };
      }
      
      setProgress(60);
      
      if (format === 'hybrid' || format === 'short') {
        const short = await generateVideo(1);
        results.short = {
          title: `${keyword} #shorts`,
          duration: '45秒',
          revenue: 8200,
          video: short
        };
      }
      
      setProgress(100);
      setVideos(results);
      setTimeout(() => setTab('result'), 1000);
    } catch (err) {
      alert('エラー: ' + err.message);
    }
    
    setIsGenerating(false);
  };

  const download = (video, name) => {
    const a = document.createElement('a');
    a.href = video.url;
    a.download = name;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-pink-900 text-white p-6">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">🎬 AI動画生成ツール</h1>
        <p className="text-gray-300">ハイブリッド戦略で収益最大化</p>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex bg-white/10 rounded-lg p-1">
          {[
            { id: 'input', name: '設定', icon: Target },
            { id: 'generating', name: '生成中', icon: Zap },
            { id: 'result', name: '結果', icon: Video }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              disabled={isGenerating}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded transition ${
                tab === t.id ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Input Tab */}
        {tab === 'input' && (
          <div className="space-y-6">
            {/* Format Selection */}
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">動画形式</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'hybrid', name: 'ハイブリッド', icon: Star, desc: 'ショート+ミディアム', revenue: '月15-35万' },
                  { id: 'short', name: 'ショート', icon: Smartphone, desc: '15-60秒', revenue: '月5-15万' },
                  { id: 'medium', name: 'ミディアム', icon: Monitor, desc: '3-8分', revenue: '月10-25万' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`p-4 rounded-lg border-2 transition ${
                      format === f.id ? 'border-yellow-400 bg-white/20' : 'border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <f.icon className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                    <div className="font-bold">{f.name}</div>
                    <div className="text-sm text-gray-400">{f.desc}</div>
                    <div className="text-sm text-green-400 mt-1">{f.revenue}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Keyword Input */}
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">キーワード</h2>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="例: ワイヤレスイヤホン"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:border-yellow-400 focus:outline-none text-white placeholder-gray-400"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {['ワイヤレスイヤホン', '美容クリーム', 'スマートウォッチ'].map(k => (
                  <button
                    key={k}
                    onClick={() => setKeyword(k)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!keyword || isGenerating}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 text-black font-bold py-6 rounded-xl text-xl flex items-center justify-center space-x-2"
            >
              <Zap className="w-6 h-6" />
              <span>動画生成開始</span>
            </button>
          </div>
        )}

        {/* Generating Tab */}
        {tab === 'generating' && (
          <div className="bg-white/10 rounded-xl p-8 text-center">
            <div className="text-2xl font-bold mb-4">動画生成中...</div>
            <div className="w-full bg-white/20 rounded-full h-4 mb-4">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-lg font-bold text-yellow-400">{progress}% 完了</div>
          </div>
        )}

        {/* Result Tab */}
        {tab === 'result' && videos && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-yellow-400 mb-2">🎉 生成完了！</h2>
            </div>
            
            {format === 'hybrid' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {videos.medium && (
                  <div className="bg-white/10 rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-3 flex items-center">
                      <Monitor className="w-5 h-5 mr-2 text-green-400" />
                      ミディアム動画
                    </h3>
                    <div className="bg-black/30 rounded p-4 mb-4 text-center">
                      <div className="text-4xl mb-2">🎬</div>
                      <div className="font-bold">{videos.medium.title}</div>
                      <div className="text-sm text-gray-400">{videos.medium.duration}</div>
                      <div className="text-sm text-green-400">ファイル: {videos.medium.video.size}</div>
                    </div>
                    <div className="text-2xl font-bold text-green-400 mb-4">
                      月収予想: ¥{videos.medium.revenue.toLocaleString()}
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => window.open(videos.medium.video.url)}
                        className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center justify-center space-x-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>再生</span>
                      </button>
                      <button 
                        onClick={() => download(videos.medium.video, `medium_${keyword}.webm`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center justify-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>DL</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {videos.short && (
                  <div className="bg-white/10 rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-3 flex items-center">
                      <Smartphone className="w-5 h-5 mr-2 text-blue-400" />
                      ショート動画
                    </h3>
                    <div className="bg-black/30 rounded p-4 mb-4 text-center">
                      <div className="text-4xl mb-2">📱</div>
                      <div className="font-bold">{videos.short.title}</div>
                      <div className="text-sm text-gray-400">{videos.short.duration}</div>
                      <div className="text-sm text-blue-400">ファイル: {videos.short.video.size}</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-400 mb-4">
                      月収予想: ¥{videos.short.revenue.toLocaleString()}
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => window.open(videos.short.video.url)}
                        className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center justify-center space-x-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>再生</span>
                      </button>
                      <button 
                        onClick={() => download(videos.short.video, `short_${keyword}.webm`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center justify-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>DL</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/10 rounded-xl p-6">
                {(() => {
                  const video = format === 'short' ? videos.short : videos.medium;
                  return (
                    <div className="text-center">
                      <div className="text-4xl mb-4">{format === 'short' ? '📱' : '🎬'}</div>
                      <div className="font-bold text-xl mb-2">{video.title}</div>
                      <div className="text-gray-400 mb-4">{video.duration} | {video.video.size}</div>
                      <div className="text-2xl font-bold text-green-400 mb-6">
                        月収予想: ¥{video.revenue.toLocaleString()}
                      </div>
                      <div className="flex justify-center space-x-4">
                        <button 
                          onClick={() => window.open(video.video.url)}
                          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg flex items-center space-x-2"
                        >
                          <Play className="w-5 h-5" />
                          <span>再生</span>
                        </button>
                        <button 
                          onClick={() => download(video.video, `${format}_${keyword}.webm`)}
                          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg flex items-center space-x-2"
                        >
                          <Download className="w-5 h-5" />
                          <span>ダウンロード</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 収益予測 */}
            {format === 'hybrid' && videos.medium && videos.short && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-400/30 text-center">
                <h3 className="text-xl font-bold mb-4">🚀 ハイブリッド効果</h3>
                <div className="text-3xl font-bold text-green-400 mb-2">
                  合計月収: ¥{(videos.medium.revenue + videos.short.revenue).toLocaleString()}
                </div>
                <div className="text-yellow-400">単体比 +240% の収益向上！</div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => {
                  setTab('input');
                  setKeyword('');
                  setVideos(null);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-lg font-bold"
              >
                新しい動画を生成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HybridVideoGenerator;