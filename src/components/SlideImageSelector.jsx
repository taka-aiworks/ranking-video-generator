// src/components/SlideImageSelector.jsx
import React, { useState, useEffect } from 'react';
import irasutoyaService from '../services/media/irasutoyaService.js';

const SlideImageSelector = ({ slideIndex, slideText, onImageSelect, onClose, currentImage }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(currentImage || null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    loadImages();
  }, [slideText]);

  const loadImages = async () => {
    setLoading(true);
    try {
      // スライドのテキストからキーワードを抽出
      const keyword = extractKeywordFromSlide(slideText);
      
      // いらすとやの検索URLを生成
      const searchUrl = irasutoyaService.generateSearchUrl(keyword);
      
      // 利用可能な画像を取得（実際には表示しない）
      const allImages = await irasutoyaService.fetchImages(keyword, 0);
      setImages([]);
    } catch (error) {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // スライドテキストからキーワードを抽出
  const extractKeywordFromSlide = (slideText) => {
    if (!slideText) return '汎用';
    
    // タイトルスライドの場合
    if (slideText.includes('title') || slideText.includes('タイトル')) {
      return 'タイトル';
    }
    
    // まとめスライドの場合
    if (slideText.includes('まとめ') || slideText.includes('summary')) {
      return 'まとめ';
    }
    
    // 動画内容に即したキーワードマッピング
    const contentKeywords = {
      // お金・副業関連
      '副業': ['副業', 'バイト', 'アルバイト', '仕事', '働く'],
      'お金': ['お金', '金', '収入', '稼ぐ', '利益'],
      '投資': ['投資', '株', '株式', '運用', '資産'],
      '貯金': ['貯金', '貯蓄', '節約', '家計'],
      'ビジネス': ['ビジネス', '起業', '経営', '会社'],
      
      // 健康・運動関連
      '健康': ['健康', '体', '身体', '体調'],
      '運動': ['運動', '筋トレ', 'ジム', 'ランニング'],
      'ダイエット': ['ダイエット', '痩せる', '体重', '減量'],
      
      // 学習・勉強関連
      '勉強': ['勉強', '学習', '学ぶ', '知識'],
      '受験': ['受験', '試験', 'テスト', '合格'],
      '英語': ['英語', '英会話', 'TOEIC', '語学'],
      
      // 生活関連
      '料理': ['料理', 'レシピ', '食べ物', '食事'],
      '掃除': ['掃除', '片付け', '整理', '清潔'],
      '睡眠': ['睡眠', '寝る', '眠る', '休息'],
      
      // 趣味・娯楽
      'ゲーム': ['ゲーム', '遊び', '娯楽', '趣味'],
      '映画': ['映画', 'ドラマ', '動画', 'エンタメ'],
      '音楽': ['音楽', '歌', '楽器', 'コンサート']
    };
    
    // テキストからキーワードを検索
    for (const [category, keywords] of Object.entries(contentKeywords)) {
      for (const keyword of keywords) {
        if (slideText.includes(keyword)) {
          return category;
        }
      }
    }
    
    // マッチしない場合は、テキストから主要なキーワードを抽出
    const words = slideText.split(/[、。\s]+/).filter(word => 
      word.length > 1 && 
      !['について', 'です', 'ます', 'する', 'した', 'ある', 'いる', 'こと', 'もの', 'ため'].includes(word)
    );
    
    const extractedKeyword = words[0] || '汎用';
    return extractedKeyword;
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = {
        url: e.target.result, // Data URL
        alt: file.name,
        source: 'upload',
        author: 'ユーザー'
      };
      setUploadedImage(imageData);
      setSelectedImage(imageData);
      
      // 自動的に選択を確定
      if (onImageSelect) {
        onImageSelect(slideIndex, imageData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenIrasutoya = () => {
    const keyword = extractKeywordFromSlide(slideText);
    const searchUrl = irasutoyaService.generateSearchUrl(keyword);
    window.open(searchUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-5xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">🖼️ スライド{slideIndex + 1}の画像選択</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* スライドテキスト表示 */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg">
          <h3 className="font-bold text-sm text-gray-700 mb-1">スライド内容:</h3>
          <p className="text-sm text-gray-600">{slideText || 'テキストなし'}</p>
        </div>

        {/* いらすとや検索ボタン */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            いらすとやで画像を探してダウンロードしてください
          </p>
          <button
            onClick={handleOpenIrasutoya}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <span>🔍</span>
            <span>いらすとやで「{extractKeywordFromSlide(slideText)}」を検索</span>
          </button>
        </div>

        {/* 画像アップロード */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            ダウンロードした画像をアップロードしてください
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <span>📁</span>
            <span>画像をアップロード</span>
          </button>
        </div>

        {/* 選択された画像のプレビュー */}
        {selectedImage && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2 text-green-600">✅ 画像が選択されました:</h3>
            <div className="flex items-center space-x-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.alt}
                className="w-32 h-32 object-cover rounded border-4 border-green-400"
              />
              <div>
                <div className="font-medium">{selectedImage.alt}</div>
                <div className="text-sm text-gray-600">
                  出典: {selectedImage.author}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ボタン */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlideImageSelector;
