// src/components/VideoEngine/DurationCalculator.jsx - 動画時間自動計算

import React from 'react';
import { Clock, Calculator, Target } from 'lucide-react';

const DurationCalculator = ({ 
  contentData, 
  format, 
  template, 
  onDurationCalculated,
  showDetails = false 
}) => {
  // コンテンツ量解析
  const analyzeContent = (contentData) => {
    if (!contentData || !contentData.items) {
      return {
        itemCount: 3,
        totalTextLength: 300,
        complexity: 'medium',
        hasImages: false,
        avgItemLength: 100
      };
    }

    const items = contentData.items;
    const itemCount = items.length;
    
    let totalTextLength = 0;
    items.forEach(item => {
      totalTextLength += (item.name?.length || 0);
      totalTextLength += (item.description?.length || 0);
      if (item.features) {
        totalTextLength += item.features.join(' ').length;
      }
    });

    const avgItemLength = totalTextLength / itemCount;
    
    let complexity = 'simple';
    if (avgItemLength > 150 || itemCount > 7) complexity = 'complex';
    else if (avgItemLength > 80 || itemCount > 4) complexity = 'medium';

    return {
      itemCount,
      totalTextLength,
      complexity,
      hasImages: items.some(item => item.image),
      avgItemLength
    };
  };

  // 時間計算ロジック
  const calculateDuration = (contentAnalysis, format, template) => {
    const { itemCount, totalTextLength, complexity, hasImages } = contentAnalysis;
    
    // 基本時間設定
    const baseTime = {
      intro: 3,     // 導入
      outro: 3,     // まとめ
      transition: 1 // 項目間の遷移
    };

    // テンプレート別の項目あたり時間
    const itemDuration = {
      ranking: {
        short: 8,    // 8秒/項目
        medium: 25   // 25秒/項目
      },
      comparison: {
        short: 12,   // 12秒/項目（比較は詳細）
        medium: 30   // 30秒/項目
      },
      tutorial: {
        short: 10,   // 10秒/ステップ
        medium: 35   // 35秒/ステップ
      },
      news: {
        short: 9,    // 9秒/ニュース
        medium: 28   // 28秒/ニュース
      }
    };

    // 形式判定
    const videoFormat = format === 'hybrid' ? 'short' : format;
    const timePerItem = itemDuration[template]?.[videoFormat] || itemDuration.ranking[videoFormat];

    // 基本計算
    let calculatedTime = 
      baseTime.intro + 
      (itemCount * timePerItem) + 
      ((itemCount - 1) * baseTime.transition) + 
      baseTime.outro;

    // 複雑さによる調整
    const complexityMultiplier = {
      simple: 0.9,
      medium: 1.0,
      complex: 1.2
    };
    calculatedTime *= complexityMultiplier[complexity];

    // 画像がある場合の追加時間
    if (hasImages) {
      calculatedTime += itemCount * 2; // 2秒/項目追加
    }

    // 形式別の制限・調整
    if (videoFormat === 'short') {
      // ショート動画: 15-60秒
      calculatedTime = Math.max(15, Math.min(calculatedTime, 60));
    } else if (videoFormat === 'medium') {
      // ミディアム動画: 180-480秒（3-8分）
      calculatedTime = Math.max(180, Math.min(calculatedTime, 480));
    }

    return Math.round(calculatedTime);
  };

  // ハイブリッド用の両方計算
  const calculateHybridDurations = (contentAnalysis) => {
    return {
      short: calculateDuration(contentAnalysis, 'short', template),
      medium: calculateDuration(contentAnalysis, 'medium', template)
    };
  };

  // 実際の計算実行
  React.useEffect(() => {
    if (!contentData) return;

    const analysis = analyzeContent(contentData);
    
    if (format === 'hybrid') {
      const durations = calculateHybridDurations(analysis);
      onDurationCalculated(durations, analysis);
    } else {
      const duration = calculateDuration(analysis, format, template);
      onDurationCalculated(duration, analysis);
    }
  }, [contentData, format, template]);

  if (!showDetails) return null;

  // 詳細表示用のUI
  const analysis = analyzeContent(contentData);
  const durations = format === 'hybrid' 
    ? calculateHybridDurations(analysis)
    : calculateDuration(analysis, format, template);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mt-6">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <Calculator className="w-5 h-5 mr-2 text-blue-400" />
        🧮 AI動画時間計算
      </h3>

      {/* コンテンツ解析結果 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{analysis.itemCount}</div>
          <div className="text-sm text-gray-400">アイテム数</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{analysis.totalTextLength}</div>
          <div className="text-sm text-gray-400">総文字数</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {analysis.complexity === 'simple' ? '簡単' : 
             analysis.complexity === 'medium' ? '普通' : '複雑'}
          </div>
          <div className="text-sm text-gray-400">複雑さ</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {Math.round(analysis.avgItemLength)}
          </div>
          <div className="text-sm text-gray-400">平均文字数/項目</div>
        </div>
      </div>

      {/* 計算結果 */}
      <div className="space-y-4">
        <h4 className="font-bold text-lg">📊 計算結果</h4>
        
        {format === 'hybrid' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-500/20 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Clock className="w-4 h-4 mr-2" />
                <span className="font-bold">ショート動画</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{durations.short}秒</div>
              <div className="text-sm text-gray-400">
                {Math.floor(durations.short / 60)}:{String(durations.short % 60).padStart(2, '0')}
              </div>
            </div>
            <div className="bg-green-500/20 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Clock className="w-4 h-4 mr-2" />
                <span className="font-bold">ミディアム動画</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{durations.medium}秒</div>
              <div className="text-sm text-gray-400">
                {Math.floor(durations.medium / 60)}:{String(durations.medium % 60).padStart(2, '0')}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-400" />
                <span className="font-bold">計算された動画時間</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-400">{durations}秒</div>
                <div className="text-sm text-gray-400">
                  {Math.floor(durations / 60)}:{String(durations % 60).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 計算根拠 */}
        <div className="bg-white/5 rounded-lg p-4">
          <h5 className="font-bold mb-2">🔍 計算根拠</h5>
          <div className="text-sm text-gray-300 space-y-1">
            <div>• 導入・まとめ: 6秒</div>
            <div>• {template}形式: {format === 'short' ? '8-12秒' : '25-35秒'}/項目</div>
            <div>• 項目数: {analysis.itemCount}個</div>
            <div>• 複雑さ調整: {analysis.complexity === 'simple' ? '-10%' : analysis.complexity === 'complex' ? '+20%' : '±0%'}</div>
            {analysis.hasImages && <div>• 画像表示: +{analysis.itemCount * 2}秒</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DurationCalculator;