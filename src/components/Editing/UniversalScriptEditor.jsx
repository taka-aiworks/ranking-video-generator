// src/components/Editing/UniversalScriptEditor.jsx - 全テンプレート対応エディター

import React, { useState, useCallback } from 'react';
import { 
  Edit3, Save, Plus, Trash2, Star, MessageSquare, 
  ChevronDown, ChevronUp, Move, Clock
} from 'lucide-react';

const UniversalScriptEditor = ({ script, onSave, isEditing, onToggleEdit, template }) => {
  const [editableScript, setEditableScript] = useState(script || {});
  const [expandedItems, setExpandedItems] = useState({});

  // 項目展開/折りたたみ
  const toggleExpanded = useCallback((index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  // スクリプト更新
  const updateField = useCallback((path, value) => {
    setEditableScript(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []);

  // 配列更新
  const updateArrayItem = useCallback((arrayName, index, field, value) => {
    setEditableScript(prev => {
      const updated = { ...prev };
      if (!updated[arrayName]) updated[arrayName] = [];
      if (!updated[arrayName][index]) updated[arrayName][index] = {};
      updated[arrayName][index][field] = value;
      return updated;
    });
  }, []);

  // 配列要素追加
  const addArrayItem = useCallback((arrayName, defaultItem) => {
    setEditableScript(prev => {
      const updated = { ...prev };
      if (!updated[arrayName]) updated[arrayName] = [];
      updated[arrayName] = [...updated[arrayName], defaultItem];
      return updated;
    });
  }, []);

  // 配列要素削除
  const removeArrayItem = useCallback((arrayName, index) => {
    setEditableScript(prev => {
      const updated = { ...prev };
      if (!updated[arrayName]) return updated;
      updated[arrayName] = updated[arrayName].filter((_, i) => i !== index);
      return updated;
    });
  }, []);

  // 保存処理
  const handleSave = useCallback(() => {
    if (onSave) onSave(editableScript);
  }, [editableScript, onSave]);

  // テンプレート別のデフォルト項目を取得
  const getDefaultItem = useCallback(() => {
    const defaults = {
      ranking: {
        rank: (editableScript.items?.length || 0) + 1,
        name: '新しい商品',
        price: '¥0',
        rating: 4.0,
        description: '商品の詳細説明',
        features: ['特徴1', '特徴2'],
        pros: ['メリット1'],
        cons: ['デメリット1'],
        targetUser: 'おすすめユーザー',
        personalComment: '個人的な評価'
      },
      comparison: {
        position: editableScript.items?.length === 0 ? 'A' : 'B',
        name: '比較対象',
        price: '¥0',
        description: '詳細説明',
        strengths: ['強み1', '強み2'],
        weaknesses: ['弱み1'],
        suitableFor: 'おすすめな人・シーン'
      },
      tutorial: {
        stepNumber: (editableScript.steps?.length || 0) + 1,
        title: 'ステップタイトル',
        description: 'ステップの詳細説明',
        duration: 30,
        tips: ['コツ1'],
        commonMistakes: ['よくある間違い1']
      },
      news: {
        topicNumber: (editableScript.topics?.length || 0) + 1,
        headline: 'ニューストピック',
        summary: 'トピックの概要',
        impact: '影響・重要性',
        personalAnalysis: '専門家の分析'
      }
    };
    
    return defaults[template] || defaults.ranking;
  }, [template, editableScript]);

  // 項目追加
  const addNewItem = useCallback(() => {
    const arrayName = template === 'tutorial' ? 'steps' : 
                     template === 'news' ? 'topics' : 'items';
    addArrayItem(arrayName, getDefaultItem());
  }, [template, addArrayItem, getDefaultItem]);

  if (!isEditing) {
    // 表示モード - テンプレート別表示
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">📝 生成されたスクリプト</h2>
          <button
            onClick={onToggleEdit}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>編集開始</span>
          </button>
        </div>

        {/* 基本情報 */}
        <div className="mb-6 p-4 bg-white/5 rounded-lg">
          <h3 className="text-xl font-bold text-yellow-400 mb-2">{script?.title}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>📱 {template}形式</span>
            <span>⏱️ {script?.duration}秒</span>
            <span>🎬 {script?.canvas?.width}×{script?.canvas?.height}</span>
          </div>
          {script?.metadata?.description && (
            <p className="text-gray-300 mt-3">{script.metadata.description}</p>
          )}
        </div>

        {/* テンプレート別コンテンツ表示 */}
        {template === 'ranking' && script?.items && (
          <RankingDisplay items={script.items} />
        )}

        {template === 'comparison' && script?.items && (
          <ComparisonDisplay items={script.items} conclusion={script.conclusion} />
        )}

        {template === 'tutorial' && script?.steps && (
          <TutorialDisplay steps={script.steps} summary={script.summary} />
        )}

        {template === 'news' && script?.topics && (
          <NewsDisplay topics={script.topics} futureOutlook={script.futureOutlook} />
        )}
      </div>
    );
  }

  // 編集モード
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">✏️ スクリプト編集</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>
          <button
            onClick={onToggleEdit}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg"
          >
            キャンセル
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 基本情報編集 */}
        <div className="p-4 bg-white/5 rounded-lg">
          <h3 className="font-bold mb-4">📝 基本情報</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">動画タイトル</label>
              <input
                type="text"
                value={editableScript.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">説明文</label>
              <textarea
                value={editableScript.metadata?.description || ''}
                onChange={(e) => updateField('metadata.description', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* テンプレート別編集UI */}
        {template === 'ranking' && (
          <RankingEditor 
            script={editableScript} 
            updateField={updateField}
            updateArrayItem={updateArrayItem}
            addNewItem={addNewItem}
            removeArrayItem={removeArrayItem}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
          />
        )}

        {template === 'comparison' && (
          <ComparisonEditor 
            script={editableScript} 
            updateField={updateField}
            updateArrayItem={updateArrayItem}
          />
        )}

        {template === 'tutorial' && (
          <TutorialEditor 
            script={editableScript} 
            updateField={updateField}
            updateArrayItem={updateArrayItem}
            addNewItem={addNewItem}
            removeArrayItem={removeArrayItem}
          />
        )}

        {template === 'news' && (
          <NewsEditor 
            script={editableScript} 
            updateField={updateField}
            updateArrayItem={updateArrayItem}
            addNewItem={addNewItem}
            removeArrayItem={removeArrayItem}
          />
        )}

        {/* 保存ボタン */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg flex items-center space-x-2 font-bold"
          >
            <Save className="w-5 h-5" />
            <span>変更を保存して動画に反映</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ランキング表示コンポーネント
const RankingDisplay = ({ items }) => (
  <div className="space-y-4">
    <h4 className="font-bold text-lg">🏆 ランキング</h4>
    {items.map((item, index) => (
      <div key={index} className="bg-white/5 rounded-lg p-4">
        <div className="flex items-start space-x-4">
          <div className="bg-yellow-400 text-black font-bold rounded-full w-10 h-10 flex items-center justify-center">
            {item.rank}
          </div>
          <div className="flex-1">
            <h5 className="text-lg font-bold text-white">{item.name}</h5>
            <p className="text-green-400 font-bold">{item.price}</p>
            <p className="text-gray-300 my-2">{item.description}</p>
            {item.personalComment && (
              <div className="bg-purple-500/20 p-3 rounded mt-3">
                <p className="text-sm text-gray-300">{item.personalComment}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

// 比較表示コンポーネント  
const ComparisonDisplay = ({ items, conclusion }) => (
  <div className="space-y-4">
    <h4 className="font-bold text-lg">⚖️ 比較</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item, index) => (
        <div key={index} className="bg-white/5 rounded-lg p-4">
          <div className="text-center mb-3">
            <div className="bg-blue-500 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center mx-auto">
              {item.position}
            </div>
            <h5 className="text-lg font-bold text-white mt-2">{item.name}</h5>
            <p className="text-green-400 font-bold">{item.price}</p>
          </div>
          <p className="text-gray-300 mb-3">{item.description}</p>
        </div>
      ))}
    </div>
    {conclusion && (
      <div className="bg-yellow-500/20 p-4 rounded-lg">
        <h5 className="font-bold text-yellow-400">📝 結論</h5>
        <p className="text-white">{conclusion.recommendation}</p>
      </div>
    )}
  </div>
);

// チュートリアル表示コンポーネント
const TutorialDisplay = ({ steps, summary }) => (
  <div className="space-y-4">
    <h4 className="font-bold text-lg">📚 チュートリアル</h4>
    {steps.map((step, index) => (
      <div key={index} className="bg-white/5 rounded-lg p-4">
        <div className="flex items-start space-x-4">
          <div className="bg-green-500 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center">
            {step.stepNumber}
          </div>
          <div className="flex-1">
            <h5 className="text-lg font-bold text-white">{step.title}</h5>
            <p className="text-gray-300 my-2">{step.description}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ニュース表示コンポーネント
const NewsDisplay = ({ topics, futureOutlook }) => (
  <div className="space-y-4">
    <h4 className="font-bold text-lg">📰 最新ニュース</h4>
    {topics.map((topic, index) => (
      <div key={index} className="bg-white/5 rounded-lg p-4">
        <h5 className="text-lg font-bold text-white mb-2">{topic.headline}</h5>
        <p className="text-gray-300 mb-2">{topic.summary}</p>
        <div className="bg-blue-500/20 p-3 rounded">
          <p className="text-sm text-blue-300">{topic.personalAnalysis}</p>
        </div>
      </div>
    ))}
  </div>
);

// ランキング編集コンポーネント（省略 - 必要に応じて実装）
const RankingEditor = ({ script, updateArrayItem, addNewItem, removeArrayItem }) => (
  <div>ランキング編集UI</div>
);

const ComparisonEditor = () => <div>比較編集UI</div>;
const TutorialEditor = () => <div>チュートリアル編集UI</div>;
const NewsEditor = () => <div>ニュース編集UI</div>;

export default UniversalScriptEditor;