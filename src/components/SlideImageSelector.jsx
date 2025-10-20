// src/components/SlideImageSelector.jsx
import React, { useState, useEffect } from 'react';
import irasutoyaService from '../services/media/irasutoyaService.js';
import localImageService from '../services/media/localImageService.js';

const SlideImageSelector = ({ slideIndex, slideText, onImageSelect, onClose, currentImage }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(currentImage || null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [useLocalImages, setUseLocalImages] = useState(true); // 常にローカル画像を優先
  const [serverStatus, setServerStatus] = useState('checking');
  const [metadata, setMetadata] = useState(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    checkServerStatus();
    loadImages();
    
    // 自動画像選択は無効化 - ユーザーが手動で選択する
    // if (serverStatus === 'online' && slideText) {
    //   setTimeout(() => {
    //     handleAutoImageSelection();
    //   }, 1000); // 1秒後に自動実行
    // }
  }, [slideText, useLocalImages, serverStatus]);

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
      // スライドのテキストからキーワードを抽出
      const keyword = extractKeywordFromSlide(slideText);
      console.log(`🔍 スライド${slideIndex + 1}のキーワード: ${keyword}`);
      
      let fetched = [];
      
      if (useLocalImages && serverStatus === 'online') {
        // ローカル画像から検索
        console.log('🏠 ローカル画像から検索中...');
        const result = await localImageService.searchImages(keyword, 20);
        if (result.success && result.images.length > 0) {
          fetched = localImageService.normalizeImages(result.images);
          console.log(`📦 ローカル画像: ${fetched.length}件取得`);
        } else {
          // キーワード検索で見つからない場合は、全画像からランダムに選択
          console.log('🔀 全画像からランダム選択中...');
          const allImagesResult = await localImageService.getAllImages(50);
          if (allImagesResult.success && allImagesResult.images.length > 0) {
            const shuffled = allImagesResult.images.sort(() => 0.5 - Math.random());
            fetched = localImageService.normalizeImages(shuffled.slice(0, 15));
            console.log(`📦 ランダム画像: ${fetched.length}件取得`);
          }
        }
      }
      
      // ローカル画像が全くない場合のみ従来のいらすとやサービスを使用
      if (fetched.length === 0) {
        console.log('🌐 フォールバック: 従来のいらすとやサービスを使用');
        const fallbackImages = await irasutoyaService.fetchImages(keyword, 15);
        fetched = [...fetched, ...fallbackImages];
        console.log(`📦 フォールバック画像: ${fallbackImages.length}件追加`);
      }
      
      console.log(`📦 スライド${slideIndex + 1}の合計画像: ${fetched.length}件`);
      console.log('📦 取得した画像サンプル:', fetched.slice(0, 3));
      setImages(fetched);
    } catch (error) {
      console.error('❌ 画像読み込みエラー:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // カテゴリ別の画像読み込み
  const loadImagesByCategory = async (category) => {
    setLoading(true);
    try {
      console.log(`🔍 カテゴリ別画像読み込み: ${category}`);
      const result = await localImageService.searchImages(category, 30);
      if (result.success && result.images.length > 0) {
        const fetched = localImageService.normalizeImages(result.images);
        setImages(fetched);
        console.log(`✅ ${category}カテゴリ: ${fetched.length}件の画像を表示`);
      } else {
        console.log(`❌ ${category}カテゴリ: 画像が見つかりません`);
        setImages([]);
      }
    } catch (error) {
      console.error('❌ カテゴリ別画像読み込みエラー:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // 全画像読み込み
  const loadAllImages = async () => {
    setLoading(true);
    try {
      console.log('🔍 全画像読み込み');
      const result = await localImageService.getAllImages(50);
      if (result.success && result.images.length > 0) {
        const fetched = localImageService.normalizeImages(result.images);
        setImages(fetched);
        console.log(`✅ 全画像: ${fetched.length}件の画像を表示`);
      } else {
        console.log('❌ 画像が見つかりません');
        setImages([]);
      }
    } catch (error) {
      console.error('❌ 全画像読み込みエラー:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // 自動画像選択関数
  const handleAutoImageSelection = async () => {
    if (!slideText || serverStatus !== 'online') return;
    
    try {
      console.log(`🤖 自動画像選択開始: ${slideText}`);
      
      // キーワードに基づいてカテゴリを判定
      const category = detectCategoryFromText(slideText);
      console.log(`🎯 判定されたカテゴリ: ${category}`);
      
      // そのカテゴリからランダムに画像を選択
      let selectedImage = null;
      
      const result = await localImageService.searchImages(category, 50);
      if (result.success && result.images.length > 0) {
        const images = localImageService.normalizeImages(result.images);
        // ランダムに選択
        selectedImage = images[Math.floor(Math.random() * images.length)];
        console.log(`✅ 自動選択された画像: ${selectedImage.title}`);
      }
      
      // ローカル画像が見つからない場合は従来のサービスを使用
      if (!selectedImage) {
        const keyword = extractKeywordFromSlide(slideText);
        const fallbackImages = await irasutoyaService.fetchImages(keyword, 10);
        if (fallbackImages.length > 0) {
          selectedImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
          console.log(`✅ フォールバック画像選択: ${selectedImage.alt}`);
        }
      }
      
      if (selectedImage) {
        console.log(`🎉 自動画像選択完了: ${selectedImage.title || selectedImage.alt}`);
        console.log('選択された画像データ:', selectedImage);
        onImageSelect(slideIndex, selectedImage);
        setSelectedImage(selectedImage);
      }
    } catch (error) {
      console.error('❌ 自動画像選択エラー:', error);
    }
  };

  // テキストからカテゴリを判定
  const detectCategoryFromText = (text) => {
    if (!text) return 'その他';
    
    const categoryKeywords = {
      '政治': ['政治', '政治家', '総理大臣', '大臣', '国会', '議会', '選挙', '投票'],
      'お金': ['お金', '金', '収入', '稼ぐ', '利益', '投資', '株', '貯金', '節約', '家計', '給料', '副業', 'バイト'],
      '健康': ['健康', '体', '身体', '体調', '病気', '病院', '薬', '治療', '医療', '医師', '看護師'],
      '運動': ['運動', '筋トレ', 'ジム', 'ランニング', '水泳', 'サイクリング', 'ヨガ', 'フィットネス', 'ダイエット', '痩せる'],
      '勉強': ['勉強', '学習', '学ぶ', '知識', '受験', '試験', 'テスト', '合格', '英語', '英会話', 'TOEIC', '学校', '大学'],
      '食べ物': ['食べ物', '料理', 'レシピ', '食事', 'ご飯', 'パン', '果物', '野菜', '肉', '魚', '寿司', 'ピザ', 'ケーキ'],
      '動物': ['動物', '犬', '猫', '鳥', '魚', 'ハムスター', 'うさぎ', '馬', '牛', '豚', 'ペット'],
      '家族': ['家族', '子供', '赤ちゃん', '母親', '父親', '祖母', '祖父', '兄弟', '姉妹', '友人', '隣人'],
      '恋愛': ['恋愛', 'カップル', '愛', '恋', 'デート', '結婚', '結婚式', 'バレンタイン', 'プレゼント'],
      'テクノロジー': ['パソコン', 'スマホ', 'タブレット', 'インターネット', 'アプリ', 'ソフトウェア', 'プログラミング', 'AI', 'ゲーム'],
      '交通': ['車', 'バス', '電車', '飛行機', '自転車', 'バイク', '旅行', '休暇', 'パスポート'],
      '自然': ['自然', '花', '木', '山', '海', '川', '湖', '森', '庭', '公園', '空', '雲', '太陽', '月', '星'],
      'スポーツ': ['スポーツ', 'サッカー', '野球', 'テニス', 'バスケットボール', 'ゴルフ', '水泳', 'スキー', 'スケート'],
      'イベント': ['イベント', 'パーティー', '誕生日', 'クリスマス', 'お正月', 'ハロウィン', '結婚式', '卒業式', '祭り', 'コンサート']
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }
    
    return 'その他';
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

        {/* スライドテキスト表示 */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg">
          <h3 className="font-bold text-sm text-gray-700 mb-1">スライド内容:</h3>
          <p className="text-sm text-gray-600">{slideText || 'テキストなし'}</p>
          <p className="text-xs text-blue-600 mt-1">
            推定キーワード: {extractKeywordFromSlide(slideText)}
          </p>
        </div>

        {/* 使用方法の説明 */}
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
          <h3 className="font-bold text-sm text-gray-700 mb-1">📝 使用方法:</h3>
          <p className="text-sm text-gray-600">
            1. カテゴリボタンをクリックして画像を表示<br/>
            2. お気に入りの画像をクリックして選択<br/>
            3. 「この画像を選択」ボタンで確定
          </p>
        </div>

        {/* カテゴリ選択 */}
        {serverStatus === 'online' && metadata && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              カテゴリを選択して画像を表示（{metadata.totalImages}件の画像が利用可能）
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {metadata.categories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => loadImagesByCategory(category)}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 py-1 rounded-lg text-sm"
                >
                  {category}
                </button>
              ))}
              <button
                onClick={loadAllImages}
                disabled={loading}
                className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-3 py-1 rounded-lg text-sm"
              >
                全て表示
              </button>
            </div>
          </div>
        )}

        {/* 画像選択グリッド */}
        {loading ? (
          <div className="text-center py-8">
            <div className="text-xl">🔄 画像を読み込み中...</div>
          </div>
        ) : images.length > 0 ? (
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
                    onLoad={(e) => {
                      console.log('✅ 画像読み込み成功:', image.url);
                    }}
                    onError={(e) => {
                      console.error('❌ 画像読み込みエラー:', image.url);
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
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg">📷 画像が見つかりませんでした</div>
            <div className="text-sm mt-2">スクレイピングを実行するか、手動で画像をアップロードしてください</div>
          </div>
        )}

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
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedImage ? (
              <span className="text-green-600 font-medium">
                ✅ 画像が選択されています: {selectedImage.alt}
              </span>
            ) : (
              <span className="text-gray-500">画像を選択してください</span>
            )}
          </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (selectedImage && onImageSelect) {
                      onImageSelect(slideIndex, selectedImage);
                      onClose(); // 画像選択後は自動でモーダルを閉じる
                    }
                  }}
                  disabled={!selectedImage}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg"
                >
                  この画像を選択
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                >
                  キャンセル
                </button>
              </div>
        </div>
      </div>
    </div>
  );
};

export default SlideImageSelector;
