// src/components/ImageSelector.jsx
import React, { useState, useEffect } from 'react';
import irasutoyaService from '../services/media/irasutoyaService.js';

const ImageSelector = ({ keyword, onImageSelect, onClose }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (keyword) {
      loadImages();
    }
  }, [keyword]);

  const loadImages = async () => {
    setLoading(true);
    try {
      // いらすとやの検索URLを生成
      const searchUrl = irasutoyaService.generateSearchUrl(keyword);
      console.log('🔍 いらすとや検索URL:', searchUrl);
      
      // 手動で設定された画像を取得
      const manualImages = irasutoyaService.getManualUrls(keyword);
      
      // フォールバック画像も追加
      const fallbackImages = irasutoyaService.getFallbackImages(keyword, 10);
      
      // 全ての画像を結合（より多くの画像を提供）
      const allImages = irasutoyaService.getAllAvailableImages(keyword, 20);
      
      setImages(allImages);
    } catch (error) {
      console.error('❌ 画像読み込みエラー:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleConfirm = () => {
    if (selectedImage && onImageSelect) {
      onImageSelect(selectedImage);
    }
  };

  const handleOpenIrasutoya = () => {
    const searchUrl = irasutoyaService.generateSearchUrl(keyword);
    window.open(searchUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">🎨 画像選択: {keyword}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
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
            <span>いらすとやで「{keyword}」を検索</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-xl">🔄 画像を読み込み中...</div>
          </div>
        ) : (
          <>
            {/* 画像グリッド */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
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
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200x150/CCCCCC/666666?text=画像読み込み失敗';
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                    <div className="truncate">{image.alt}</div>
                    <div className="text-xs opacity-75">{image.source}</div>
                  </div>
                  {selectedImage?.url === image.url && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
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
                    className="w-20 h-20 object-cover rounded"
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

export default ImageSelector;
