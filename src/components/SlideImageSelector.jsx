// src/components/SlideImageSelector.jsx
import React, { useState, useEffect } from 'react';
import irasutoyaService from '../services/media/irasutoyaService.js';

const SlideImageSelector = ({ slideIndex, slideText, onImageSelect, onClose, currentImage }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(currentImage || null);

  useEffect(() => {
    loadImages();
  }, [slideText]);

  const loadImages = async () => {
    setLoading(true);
    try {
      // スライドのテキストからキーワードを抽出
      const keyword = extractKeywordFromSlide(slideText);
      console.log(`🔍 スライド${slideIndex}の画像検索開始:`, keyword);
      
      // いらすとやの検索URLを生成
      const searchUrl = irasutoyaService.generateSearchUrl(keyword);
      console.log('🔍 いらすとや検索URL:', searchUrl);
      
      // 利用可能な画像を取得
      const allImages = irasutoyaService.getAllAvailableImages(keyword, 15);
      setImages(allImages);
    } catch (error) {
      console.error('❌ 画像読み込みエラー:', error);
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
    
    // テキストから主要なキーワードを抽出
    const keywords = slideText.split(/[、。\s]+/).filter(word => 
      word.length > 1 && 
      !['について', 'です', 'ます', 'する', 'した', 'ある', 'いる'].includes(word)
    );
    
    return keywords[0] || '汎用';
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleConfirm = () => {
    if (selectedImage && onImageSelect) {
      onImageSelect(slideIndex, selectedImage);
    }
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
            より多くの画像を探すには、いらすとやの検索ページを開いてください
          </p>
          <button
            onClick={handleOpenIrasutoya}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <span>🔍</span>
            <span>いらすとやで「{extractKeywordFromSlide(slideText)}」を検索</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-xl">🔄 画像を読み込み中...</div>
          </div>
        ) : (
          <>
            {/* 画像グリッド */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage?.url === image.url
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  onClick={() => handleImageClick(image)}
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI0NDQ0NDQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlKjmiLfliLDvvIzmnKznm7TmlrnvvIzlm77niYc8L3RleHQ+PC9zdmc+';
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                    <div className="truncate text-xs">{image.alt}</div>
                  </div>
                  {selectedImage?.url === image.url && (
                    <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 選択された画像のプレビュー */}
            {selectedImage && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold mb-2">選択された画像:</h3>
                <div className="flex items-center space-x-4">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.alt}
                    className="w-24 h-24 object-cover rounded"
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
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedImage}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg"
              >
                この画像を使用
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SlideImageSelector;
