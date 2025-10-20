// src/components/ImageSelector.jsx
import React, { useState, useEffect } from 'react';
import irasutoyaService from '../services/media/irasutoyaService.js';
import localImageService from '../services/media/localImageService.js';

const ImageSelector = ({ keyword, onImageSelect, onClose }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [useLocalImages, setUseLocalImages] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    checkServerStatus();
    if (keyword) {
      loadImages();
    }
  }, [keyword, useLocalImages]);

  // サーバーの状態をチェック
  const checkServerStatus = async () => {
    try {
      const health = await localImageService.healthCheck();
      if (health.status === 'OK') {
        setServerStatus('online');
        const meta = await localImageService.getMetadata();
        setMetadata(meta.metadata);
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      console.log('ローカル画像サーバーがオフラインです');
      setServerStatus('offline');
    }
  };

  const loadImages = async () => {
    setLoading(true);
    try {
      // キーワードを単語化（「副業の始め方」→「副業」）
      const simplifiedKeyword = keyword.split(/[のをに、。\s]+/)[0] || keyword;
      console.log(`🔍 キーワード単語化: ${keyword} → ${simplifiedKeyword}`);
      
      let fetched = [];
      
      if (useLocalImages && serverStatus === 'online') {
        // ローカル画像から検索
        console.log('🏠 ローカル画像から検索中...');
        const result = await localImageService.searchImages(simplifiedKeyword, 20);
        if (result.success) {
          fetched = localImageService.normalizeImages(result.images);
          console.log(`📦 ローカル画像: ${fetched.length}件取得`);
        }
      }
      
      // ローカル画像が少ない場合は従来のいらすとやサービスを使用
      if (fetched.length < 5) {
        console.log('🌐 従来のいらすとやサービスを使用');
        const searchUrl = irasutoyaService.generateSearchUrl(simplifiedKeyword);
        console.log('🔍 いらすとや検索URL:', searchUrl);
        const fallbackImages = await irasutoyaService.fetchImages(simplifiedKeyword, 20);
        fetched = [...fetched, ...fallbackImages];
        console.log(`📦 フォールバック画像: ${fallbackImages.length}件追加`);
      }
      
      console.log(`📦 合計画像: ${fetched.length}件`);
      setImages(fetched);
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

  // スクレイピングを開始
  const handleStartScraping = async (categoryName = null) => {
    try {
      setLoading(true);
      const result = await localImageService.startScraping(categoryName);
      if (result.success) {
        alert(`スクレイピング完了！${result.newImagesCount || result.results?.length || 0}件の新しい画像を取得しました。`);
        // 画像を再読み込み
        await loadImages();
        // メタデータを更新
        await checkServerStatus();
      } else {
        alert(`スクレイピングエラー: ${result.message}`);
      }
    } catch (error) {
      console.error('スクレイピングエラー:', error);
      alert('スクレイピングエラーが発生しました。');
    } finally {
      setLoading(false);
    }
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

        {/* サーバー状態表示 */}
        <div className="mb-4 p-3 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">ローカル画像サーバー:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                serverStatus === 'online' ? 'bg-green-100 text-green-800' :
                serverStatus === 'offline' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {serverStatus === 'online' ? '🟢 オンライン' :
                 serverStatus === 'offline' ? '🔴 オフライン' :
                 '🟡 チェック中'}
              </span>
              {metadata && (
                <span className="text-xs text-gray-600">
                  (画像数: {metadata.totalImages}件)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1 text-sm">
                <input
                  type="checkbox"
                  checked={useLocalImages}
                  onChange={(e) => setUseLocalImages(e.target.checked)}
                  disabled={serverStatus === 'offline'}
                  className="rounded"
                />
                <span>ローカル画像を優先</span>
              </label>
            </div>
          </div>
        </div>

        {/* スクレイピング機能 */}
        {serverStatus === 'online' && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              新しい画像をローカルに取得して検索精度を向上させましょう
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStartScraping(keyword.split(/[のをに、。\s]+/)[0])}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm"
              >
                <span>📥</span>
                <span>「{keyword}」をスクレイピング</span>
              </button>
              <button
                onClick={() => handleStartScraping()}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm"
              >
                <span>🚀</span>
                <span>全カテゴリスレイピング</span>
              </button>
            </div>
          </div>
        )}

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
            <div className="mb-4 text-sm text-gray-600">
              📊 {images.length}件の画像が見つかりました
            </div>
            
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
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI0NDQ0NDQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlKjmiLfliLDvvIzmnKznm7TmlrnvvIzlm77niYc8L3RleHQ+PC9zdmc+';
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
