// src/components/Generator/SimpleVideoGenerator.jsx - 画像切り替え修正版



import React, { useState, useRef, useCallback, useEffect } from 'react';

import { Play, Download, Zap, Smartphone, Monitor, Video, Edit3, Save, AlertCircle, CheckCircle } from 'lucide-react';



// サービス層インポート

import openaiService from '../../services/api/openai.js';

import videoComposer from '../../services/video/videoComposer.js';

import contentAnalyzer from '../../services/generators/contentAnalyzer.js';

import mediaIntegrator from '../../services/integration/mediaIntegrator.js';

import trendAnalyzer from '../../services/api/trendAnalyzer.js';

import voicevoxService from '../../services/tts/voicevox.js';

import { useImageIntegration } from '../../hooks/useImageIntegration.js';
import ImageSelector from '../ImageSelector.jsx';
import SlideImageSelector from '../SlideImageSelector.jsx';
import localImageService from '../../services/media/localImageService.js';
import irasutoyaService from '../../services/media/irasutoyaService.js';



const SimpleVideoGenerator = () => {

  // === 基本状態 ===

  const [keyword, setKeyword] = useState('');

  const [format, setFormat] = useState('short');


  const [tab, setTab] = useState('input');

  const [useIrasutoya, setUseIrasutoya] = useState(true); // いらすとや使用フラグ（デフォルトON）
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showSlideImageSelector, setShowSlideImageSelector] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(null);
  const [slideImages, setSlideImages] = useState({}); // スライド別画像

  
  
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

  // === 🆕 TTS設定 ===
  const [ttsSpeakerId, setTtsSpeakerId] = useState(2); // VOICEVOX styles.id (四国めたんのノーマル)
  const [ttsSpeed, setTtsSpeed] = useState(1.0); // 0.5 - 2.0
  const [ttsSpeakers, setTtsSpeakers] = useState([]); // {label, styleId}

  useEffect(() => {
    (async () => {
      try {
        const data = await voicevoxService.fetchSpeakers();
        // speakers: [{name, styles:[{id, name}]}]
        const list = [];
        data.forEach(sp => {
          (sp.styles || []).forEach(st => {
            list.push({ label: `${sp.name} - ${st.name}`, styleId: st.id });
          });
        });
        setTtsSpeakers(list);
      } catch (_) {
        // 失敗時はデフォルトのみ
        setTtsSpeakers([{ label: '四国めたん - ノーマル', styleId: 2 }]);
      }
    })();
  }, []);



  // === 🆕 トレンド分析状態 ===



  const [trendKeywords, setTrendKeywords] = useState([]);

  const [isLoadingTrends, setIsLoadingTrends] = useState(false);



  // === 🆕 画像統合フック ===

  const {

    images,

    isLoading: isImageLoading,

    error: imageError,

    settings: imageSettings,

    integrateImages,

    updateSettings: updateImageSettings,

    hasImages,

    isIntegrationEnabled

  } = useImageIntegration();



  // === Canvas参照 ===

  const canvasRef = useRef(null);



  // === 🆕 トレンドキーワード取得機能 ===

  const loadTrendKeywords = useCallback(async () => {

    setIsLoadingTrends(true);

    try {

      // console.debug('📈 トレンドキーワード取得開始');

      const keywords = await trendAnalyzer.fetchTrendKeywords();

      setTrendKeywords(keywords);

      // console.debug('📈 トレンドキーワード取得完了:', keywords.length + '個');

    } catch (error) {

      console.error('❌ トレンドキーワード取得エラー:', error);

      // フォールバックキーワードを設定

      setTrendKeywords(trendAnalyzer.getFallbackTrendKeywords());

    } finally {

      setIsLoadingTrends(false);

    }

  }, []);



  // === 🆕 トレンド分析機能（削除予定） ===
  // 不要な機能なので削除しました
  /*
  const analyzeTrend = useCallback(async (inputKeyword) => {

    if (!inputKeyword.trim()) return;

    
    
    setIsAnalyzingTrend(true);

    try {

      console.log('📈 トレンド分析開始:', inputKeyword);

      
      
      // トレンド分析と関連キーワードを並行実行

      const [trendData, relatedData] = await Promise.all([

        trendAnalyzer.analyzeTrend(inputKeyword),

        trendAnalyzer.generateRelatedKeywords(inputKeyword)

      ]);
      


      // setTrendAnalysis(trendData);
      // setRelatedKeywords(relatedData);
      
      console.log('📈 トレンド分析完了:', { trendData, relatedData });

    } catch (error) {

      console.error('❌ トレンド分析エラー:', error);

    } finally {

      // setIsAnalyzingTrend(false);

    }

  }, []);
  */



  // === 🆕 コンポーネント初期化時にトレンドキーワードを取得 ===

  useEffect(() => {

    loadTrendKeywords();

  }, [loadTrendKeywords]);



  // === フォーマット設定 ===

  const formats = [

    { 

      id: 'short', 

      name: 'ショート動画', 

      icon: Smartphone, 

      desc: '15-60秒の縦型動画', 

      platform: 'TikTok, YouTube Shorts'

    },

    { 

      id: 'medium', 

      name: 'ミディアム動画', 

      icon: Monitor, 

      desc: '3-8分の横型動画', 

      platform: 'YouTube通常動画'

    }

  ];



  // === スクリプト保存 ===

  const handleSaveScript = useCallback(() => {

    if (editableScript) {

      setGeneratedScript(editableScript);

      setIsEditingScript(false);

      console.log('✅ スクリプト保存完了:', editableScript.title);

    }

  }, [editableScript]);



  // === 編集開始 ===

  const handleStartEditing = useCallback(() => {

    if (generatedScript) {

      setEditableScript(JSON.parse(JSON.stringify(generatedScript)));

      setIsEditingScript(true);

    }

  }, [generatedScript]);



  // === ステップ1：内容（スクリプト）生成 ===

  const handleGenerate = useCallback(async () => {

    if (!keyword.trim()) {

      setError('キーワードを入力してください');

      return;

    }



    setIsGenerating(true);

    setError(null);

    setProgress(0);

    // スクリプト生成中はタブ遷移しない（動画生成と誤認させない）

    setGeneratedScript(null);



    try {

      const optimalDuration = contentAnalyzer.calculateOptimalDuration(keyword, 'auto', format);

      console.log(`⏰ AI計算時間: ${optimalDuration}秒`);



      setStatus(`🧠 "${keyword}" の動画設計をAIが作成中...`);

      setProgress(10);



      const videoDesign = await openaiService.generateVideoDesign(keyword, 'auto', format, optimalDuration);

      setGeneratedScript(videoDesign);

      setStatus('📝 AI設計図完成！自動で画像を挿入中...');

      setProgress(90);

      // 自動で画像を挿入
      await autoInsertImages(videoDesign);

      setStatus('📝 AI設計図完成！編集してから動画生成できます');

      setProgress(100);

      setTab('script');



    } catch (err) {

      console.error('AI動画生成エラー:', err);

      setError('AI動画生成でエラーが発生しました: ' + err.message);

    } finally {

      setIsGenerating(false);

    }

  }, [keyword, format, integrateImages, isIntegrationEnabled]);

  // === 🖼️ 自動画像挿入関数 ===
  const autoInsertImages = useCallback(async (videoDesign) => {
    try {
      console.log('🖼️ 自動画像挿入開始');
      
      const newSlideImages = {};
      
      // タイトルスライドの画像を挿入
      if (videoDesign.title) {
        const titleImage = await selectImageForSlide(0, videoDesign.title);
        if (titleImage) {
          newSlideImages[0] = titleImage;
          console.log('✅ タイトルスライド画像挿入:', titleImage.alt);
        }
      }
      
      // アイテムスライドの画像を挿入
      if (videoDesign.items && videoDesign.items.length > 0) {
        for (let i = 0; i < videoDesign.items.length; i++) {
          const item = videoDesign.items[i];
          const slideText = item.text || item.main || item.name || '';
          const slideIndex = i + 1;
          
          const itemImage = await selectImageForSlide(slideIndex, slideText);
          if (itemImage) {
            newSlideImages[slideIndex] = itemImage;
            console.log(`✅ アイテム${i + 1}スライド画像挿入:`, itemImage.alt);
          }
        }
      }
      
      // まとめスライドの画像を挿入（YouTube関連を優先）
      const summaryIndex = videoDesign.items ? videoDesign.items.length + 1 : 1;
      
      // YouTube関連の画像を優先的に検索
      const youtubeKeywords = ['youtuber', 'mask', 'sunglass', 'イベント'];
      let summaryImage = null;
      
      for (const keyword of youtubeKeywords) {
        const result = await localImageService.searchImages(keyword, 10);
        if (result.success && result.images.length > 0) {
          const images = localImageService.normalizeImages(result.images);
          summaryImage = images[Math.floor(Math.random() * images.length)];
          console.log(`✅ まとめスライド画像挿入 (${keyword}):`, summaryImage.alt);
          break;
        }
      }
      
      // 見つからない場合は通常の選択
      if (!summaryImage) {
        summaryImage = await selectImageForSlide(summaryIndex, 'この動画がいいと思ったらチャンネル登録・高評価お願いします');
      }
      
      if (summaryImage) {
        newSlideImages[summaryIndex] = summaryImage;
        console.log('✅ まとめスライド画像挿入:', summaryImage.alt);
      }
      
      // 画像を設定
      setSlideImages(newSlideImages);
      console.log('🎉 自動画像挿入完了:', Object.keys(newSlideImages).length, '件');
      
    } catch (error) {
      console.error('❌ 自動画像挿入エラー:', error);
    }
  }, []);

  // === 🎯 スライド用画像選択関数 ===
  const selectImageForSlide = useCallback(async (slideIndex, slideText) => {
    try {
      if (!slideText) return null;

      // カテゴリを判定
      const category = detectCategoryFromText(slideText);
      console.log(`🎯 スライド${slideIndex}のカテゴリ判定: ${category}`);

      // ローカル画像から検索
      const result = await localImageService.searchImages(category, 50);
      if (result.success && result.images.length > 0) {
        const images = localImageService.normalizeImages(result.images);
        const selectedImage = images[Math.floor(Math.random() * images.length)];
        console.log(`✅ ローカル画像選択: ${selectedImage.alt}`);
        return selectedImage;
      }

      // フォールバック: いらすとやサービス
      const keyword = extractKeywordFromSlide(slideText);
      const fallbackImages = await irasutoyaService.fetchImages(keyword, 10);
      if (fallbackImages.length > 0) {
        const selectedImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
        console.log(`✅ フォールバック画像選択: ${selectedImage.alt}`);
        return selectedImage;
      }

      return null;
    } catch (error) {
      console.error('❌ 画像選択エラー:', error);
      return null;
    }
  }, []);

  // === 🎯 テキストからカテゴリを判定 ===
  const detectCategoryFromText = useCallback((text) => {
    if (!text) return 'その他';
    
    // まとめスライドの場合はイベントカテゴリを返す
    if (text.includes('まとめ') || text.includes('summary') || text.includes('チャンネル登録') || text.includes('高評価')) {
      return 'イベント';
    }
    
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
  }, []);

  // === 🔍 スライドからキーワードを抽出 ===
  const extractKeywordFromSlide = useCallback((slideText) => {
    if (!slideText) return '汎用';
    
    if (slideText.includes('title') || slideText.includes('タイトル')) {
      return 'タイトル';
    }
    
    if (slideText.includes('まとめ') || slideText.includes('summary') || slideText.includes('チャンネル登録') || slideText.includes('高評価')) {
      return 'イベント';
    }
    
    const contentKeywords = {
      '副業': ['副業', 'バイト', 'アルバイト', '仕事', '働く'],
      'お金': ['お金', '金', '収入', '稼ぐ', '利益'],
      '投資': ['投資', '株', '株式', '運用', '資産'],
      '貯金': ['貯金', '貯蓄', '節約', '家計'],
      'ビジネス': ['ビジネス', '起業', '経営', '会社'],
      '健康': ['健康', '体', '身体', '体調'],
      '運動': ['運動', '筋トレ', 'ジム', 'ランニング'],
      'ダイエット': ['ダイエット', '痩せる', '体重', '減量'],
      '勉強': ['勉強', '学習', '学ぶ', '知識'],
      '受験': ['受験', '試験', 'テスト', '合格'],
      '英語': ['英語', '英会話', 'TOEIC', '語学'],
      '料理': ['料理', 'レシピ', '食べ物', '食事'],
      '掃除': ['掃除', '片付け', '整理', '清潔'],
      '睡眠': ['睡眠', '寝る', '眠る', '休息'],
      'ゲーム': ['ゲーム', '遊び', '娯楽', '趣味'],
      '映画': ['映画', 'ドラマ', '動画', 'エンタメ'],
      '音楽': ['音楽', '歌', '楽器', 'コンサート']
    };
    
    for (const key in contentKeywords) {
      for (const term of contentKeywords[key]) {
        if (slideText.includes(term)) {
          return key;
        }
      }
    }
    
    return '汎用';
  }, []);

  // === 🎤 音声生成ヘルパー関数 ===
  const generateSlideAudios = useCallback(async (videoDesign) => {
    console.log('🎤 スライド別音声生成開始');
    
    // テキスト抽出
    const extractAllText = (obj) => {
      if (typeof obj === 'string') return obj;
      if (Array.isArray(obj)) return obj.map(extractAllText).join('。');
      if (obj && typeof obj === 'object') {
        return Object.values(obj).map(extractAllText).join('。');
      }
      return '';
    };

    const slideTexts = [];
    
    // タイトルスライド
    slideTexts.push({
      type: 'title',
      text: `${videoDesign.title}`
    });
    
    // 各項目スライド
    if (videoDesign.items) {
      videoDesign.items.forEach((item, i) => {
        // 新フォーマット: item.text（自然な文章）
        // 旧フォーマット: item.name + item.main（後方互換）
        let itemText = item.text || '';
        
        if (!itemText) {
          // 旧フォーマットの場合
          const itemTitle = item.name || item.title || '';
          const mainContent = item.main || item.content?.main || item.description || '';
          const details = item.details || item.content?.details || '';
          
          itemText = itemTitle;
          if (mainContent) {
            itemText += `。${mainContent}`;
          }
          if (details && videoDesign.duration > 60) {
            itemText += `。${details}`;
          }
        } else {
          // 新フォーマット: detailsがあれば追加
          const details = item.details || '';
          if (details && videoDesign.duration > 60) {
            itemText += `。${details}`;
          }
        }
        
        slideTexts.push({
          type: 'item',
          text: itemText
        });
      });
    }
    
    // まとめスライド（締めの定型文のみに変更）
    slideTexts.push({
      type: 'summary',
      text: 'この動画がいいと思ったらチャンネル登録・高評価お願いします'
    });
    
    console.log('📝 スライド別テキスト:', slideTexts.map((s, i) => `[${i+1}] ${s.type}: ${s.text.substring(0, 50)}...`));
    
    // 各スライドの音声を生成
    const slideAudios = [];
    for (let i = 0; i < slideTexts.length; i++) {
      const slide = slideTexts[i];
      console.log(`🎤 [${i+1}/${slideTexts.length}] ${slide.type} 音声生成中: ${slide.text.substring(0, 30)}...`);
      
      try {
        // VoiceVoxで音声生成（選択した話者・スピードを使用）
        const clampedSpeed = Math.min(2.0, Math.max(0.5, ttsSpeed || 1.0));
        const audioBlob = await voicevoxService.synthesizeToBlob(slide.text, ttsSpeakerId, { speedScale: clampedSpeed });
        
        // BlobからURLを生成
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // 音声の長さを取得（Audio要素を使って）
        const audio = new Audio(audioUrl);
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', resolve);
        });
        const duration = audio.duration;
        
        console.log(`✅ [${i+1}/${slideTexts.length}] ${slide.type} 音声生成完了: ${duration.toFixed(2)}秒`);
        
        slideAudios.push({
          type: slide.type,
          url: audioUrl,
          duration: duration
        });
      } catch (error) {
        console.error(`❌ [${i+1}/${slideTexts.length}] ${slide.type} 音声生成失敗:`, error);
        throw error;
      }
    }
    
    console.log('🎵 全スライド音声生成完了:', {
      totalSlides: slideAudios.length,
      totalDuration: slideAudios.reduce((sum, a) => sum + a.duration, 0).toFixed(2) + '秒',
      breakdown: slideAudios.map((a, i) => `[${i+1}] ${a.type}: ${a.duration.toFixed(2)}s`)
    });
    
    // videoDesignに音声データを追加
    return {
      ...videoDesign,
      slideAudios: slideAudios
    };
  }, [ttsSpeakerId, ttsSpeed]);

  // === ステップ2：動画生成（確定したスクリプトから） ===

  const handleGenerateVideo = useCallback(async () => {

    try {

      setIsGenerating(true);

      setProgress(0);

      setStatus('🖼️ 素材準備中...');

      setTab('generating');



      // 編集済みがあればそれを使用

      const baseDesign = (isEditingScript && editableScript) ? editableScript : generatedScript;

      if (!baseDesign) {

        setError('先にスクリプトを生成してください');

        setTab('input');

        return;

      }



      const optimalDuration = baseDesign.duration || contentAnalyzer.calculateOptimalDuration(keyword, 'auto', format);



      // 画像統合

      let enhancedVideoDesign = baseDesign;

      if (isIntegrationEnabled) {

        setProgress(20);

        try {

          enhancedVideoDesign = await integrateImages(baseDesign);

          setProgress(45);

        } catch (imgError) {

          console.warn('⚠️ 画像統合エラー:', imgError);

          setStatus('⚠️ 画像取得失敗 - プレースホルダーで生成');

        }

      }



      // 🎤 音声生成（TTS）
      let audioEnhancedDesign = enhancedVideoDesign;
      
      // 既に音声がある場合はスキップ
      if (!enhancedVideoDesign.slideAudios || enhancedVideoDesign.slideAudios.length === 0) {
        setStatus('🎤 音声を生成中...');
        setProgress(50);
        
        audioEnhancedDesign = await generateSlideAudios(enhancedVideoDesign);
      } else {
        console.log('🎤 音声データ既存 - スキップ');
        setProgress(50);
      }
      
      // Canvas初期化
      videoComposer.initCanvas(canvasRef, audioEnhancedDesign);

      setStatus(`🎬 ${optimalDuration}秒動画を生成中...`);

      setProgress(60);



      // 目標尺に合わせてナレーション再生速度を微調整（±15%）
      const totalSec = (audioEnhancedDesign.slideAudios || []).reduce((s,a)=> s + (a.duration || 0), 0);
      const actualDuration = Math.round(totalSec);
      const targetSec = format === 'short' ? 45 : format === 'medium' ? 60 : totalSec;
      const playbackRate = Math.min(1.15, Math.max(0.85, totalSec / Math.max(10, targetSec)));

      // デバッグ: 画像データを確認
      console.log('🎬 動画生成開始 - 画像データ確認:');
      console.log('slideImages:', slideImages);
      console.log('slideImages keys:', Object.keys(slideImages || {}));
      console.log('slideImages values:', Object.values(slideImages || {}));

      const generatedVideo = await videoComposer.generateVideoWithImages(

        audioEnhancedDesign,

        slideImages || {},

        (videoProgress) => {
          setProgress(60 + (videoProgress * 0.35));
          // 進捗に応じて実際の時間を表示
          const currentTime = Math.round(totalSec * (videoProgress / 100));
          setStatus(`🎬 動画生成中... ${currentTime}/${actualDuration}秒`);
        },

        { narrationPlaybackRate: playbackRate }

      );

      const result = {

        title: audioEnhancedDesign.title,

        duration: `${actualDuration}秒`,

        format: `${audioEnhancedDesign.canvas.width}x${audioEnhancedDesign.canvas.height}`,

        thumbnail: format === 'short' ? '📱' : '🎬',

        description: audioEnhancedDesign.metadata?.description || '',

        tags: audioEnhancedDesign.metadata?.tags || [],

        videoData: generatedVideo,

        aiDesign: audioEnhancedDesign,

        hasImages: slideImages && Object.keys(slideImages).length > 0,

        imageCount: slideImages ? Object.keys(slideImages).length : 0

      };



      setStatus('✅ AI動画生成完了！');

      setProgress(100);

      setVideo(result);

      setTimeout(() => setTab('result'), 800);

    } catch (err) {

      console.error('動画生成エラー:', err);

      setError('動画生成でエラーが発生しました: ' + err.message);

      setTab('script');

    } finally {

      setIsGenerating(false);

    }

  }, [isEditingScript, editableScript, generatedScript, integrateImages, isIntegrationEnabled, format, keyword, generateSlideAudios, slideImages]);



  // === ダウンロード ===

  const downloadVideo = useCallback((videoData, filename) => {

    if (!videoData?.url) return;

    const a = document.createElement('a');

    a.href = videoData.url;

    a.download = filename;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

  }, []);



  // === リセット ===

  const resetAll = useCallback(() => {

    setKeyword('');

    setFormat('short');

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

                <h1 className="text-xl font-bold">🤖 AI汎用動画生成ツール</h1>

                <p className="text-sm text-gray-300">キーワード入力 → AI判断 → 編集 → 動画生成</p>

              </div>

            </div>

          </div>

        </div>

      </div>



      {/* Tab Navigation */}

      <div className="max-w-4xl mx-auto px-6 pt-6">

        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">

          {[

            { id: 'input', name: '入力', icon: Zap },

            { id: 'script', name: 'スクリプト確認', icon: Edit3 },

            { id: 'generating', name: '動画生成中', icon: Video },

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

        {(error || imageError) && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center space-x-2">

            <AlertCircle className="w-5 h-5 text-red-400" />

            <span className="text-red-400">{error || imageError}</span>
            <button 

              onClick={() => setError(null)}

              className="ml-auto text-red-400 hover:text-red-300"

            >

              ✕

            </button>

          </div>

        )}



        {/* 入力タブ */}

        {tab === 'input' && (

          <div className="space-y-6">

            {/* キーワード入力 */}

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">

              <h2 className="text-xl font-bold mb-4">🎯 何について動画を作りますか？</h2>

              <div className="relative">

                <input

                  type="text"

                  value={keyword}

                  onChange={e => setKeyword(e.target.value)}

                  placeholder="例: ワイヤレスイヤホン / 子育てでやったほうがいいこと / iPhone vs Android"

                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:border-yellow-400 focus:outline-none text-white placeholder-gray-400 text-lg"

                />


              </div>
              
              

              {/* 🆕 実際のトレンドキーワード（APIから取得） */}
              <div className="mt-4">

                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">🔥 リアルタイムトレンドキーワード:</p>
                  <button

                    onClick={loadTrendKeywords}
                    disabled={isLoadingTrends}
                    className="text-xs text-yellow-400 hover:text-yellow-300 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isLoadingTrends ? (
                      <>
                        <div className="animate-spin w-3 h-3 border border-yellow-400 border-t-transparent rounded-full"></div>
                        更新中...
                      </>
                    ) : (
                      <>
                        🔄 更新
                      </>
                    )}
                  </button>

                </div>

                
                {/* デバッグ情報 */}
                <div className="text-xs text-gray-500 mb-2">
                  📊 状態: {isLoadingTrends ? '読み込み中' : '完了'} | 
                  キーワード数: {trendKeywords.length}個 | 
                  フォールバック: {trendKeywords.length > 0 && trendKeywords[0].source === 'フォールバック' ? 'はい' : 'いいえ'}
              </div>



                {isLoadingTrends && trendKeywords.length === 0 ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                    <span className="ml-2 text-sm text-gray-400">トレンドキーワード取得中...</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">

                    {trendKeywords.map((item, index) => (
                      <button

                        key={`trend-${index}`}
                        onClick={() => setKeyword(item.keyword)}

                        className={`px-3 py-1 ${item.color} hover:opacity-80 border rounded-full text-sm transition-all duration-200 flex items-center gap-1`}
                        title={`スコア: ${item.score}/10 | ソース: ${item.source || 'フォールバック'}`}
                      >
                        <span className="text-xs">{item.trend}</span>
                        <span>{item.keyword}</span>
                      </button>
                    ))}
                </div>
              )}

                {/* ソース説明 */}
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">🔥</span>
                    <span>リアルタイムトレンド（Google・YouTube・Twitter）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">⭐</span>
                    <span>安定人気キーワード</span>
                  </div>
                </div>
              </div>



              <div className="mt-4 p-4 bg-blue-500/20 rounded-lg">

                <div className="text-sm text-blue-400 font-bold mb-2">🤖 AIが自動で決めること</div>

                <div className="text-xs text-gray-300 space-y-1">

                  <div>• 動画の形式（ランキング/比較/解説/チュートリアル等）</div>

                  <div>• 具体的な内容・商品・サービス</div>

                  <div>• 動画の時間配分</div>

                  <div>• 視覚的なデザイン</div>

                </div>

              </div>

            </div>



            {/* 動画形式選択 */}

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">

              <h2 className="text-xl font-bold mb-4">📱 動画形式</h2>

              <div className="grid grid-cols-2 gap-4">

                {formats.map(f => (

                  <button

                    key={f.id}

                    onClick={() => setFormat(f.id)}

                    className={`p-4 rounded-lg border-2 transition-all text-left ${

                      format === f.id ? 'border-yellow-400 bg-white/20' : 'border-white/20 hover:bg-white/10'

                    }`}

                  >

                    <f.icon className="w-8 h-8 mb-2 text-yellow-400" />

                    <div className="font-bold">{f.name}</div>

                    <div className="text-sm text-gray-400 mb-2">{f.desc}</div>

                    <div className="text-xs text-green-400">{f.platform}</div>

                  </button>

                ))}

              </div>

            </div>



            {/* 🆕 画像設定セクション */}

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">

              <h2 className="text-xl font-bold mb-4">🖼️ 画像設定</h2>
              
              {/* 🆕 音声設定 */}
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-2">🎙️ 音声設定（VOICEVOX）</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">話者（名前 - スタイル）</label>
                    <select
                      value={ttsSpeakerId}
                      onChange={(e) => setTtsSpeakerId(Number(e.target.value) || 2)}
                      className="w-full px-3 py-2 bg-gray-800 text-white border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      {ttsSpeakers.map(opt => (
                        <option key={opt.styleId} value={opt.styleId} className="bg-gray-800 text-white">{opt.label}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-400 mt-1">VOICEVOXの話者とスタイルを選択</div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">読み上げスピード</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={ttsSpeed}
                      onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">現在: {ttsSpeed.toFixed(2)}x（自動でスライド時間と同期）</div>
                  </div>
                </div>
              </div>


            </div>



            {/* 生成ボタン */}
            <div className="space-y-3">
              {/* メイン生成ボタン */}
            <button

              onClick={handleGenerate}

              disabled={!keyword || isGenerating}

              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 text-black font-bold py-6 rounded-xl text-xl flex items-center justify-center space-x-2 transition-all transform hover:scale-105 disabled:scale-100"

            >

              <Zap className="w-6 h-6" />

              <span>

                {isGenerating ? '🧠 設計作成中...' : '🧠 設計図を作成する'}

              </span>

            </button>
          </div>

          </div>

        )}



        {/* スクリプト確認タブ */}

        {tab === 'script' && (

          <div className="space-y-6">

            {!generatedScript ? (

              <div className="bg-white/10 rounded-xl p-8 text-center">

                <div className="text-6xl mb-4">📝</div>

                <div className="text-xl font-bold mb-2">まだスクリプトがありません</div>

                <div className="text-gray-400">

                  まずキーワードを入力して動画を生成してください

                </div>

              </div>

            ) : (

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">

                <div className="flex items-center justify-between mb-6">

                  <h2 className="text-2xl font-bold">📝 AI生成スクリプト</h2>

                <div className="flex space-x-2">
                  {/* 手動画像選択ボタンは削除 - 自動で画像が挿入されます */}

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

                    <button

                      onClick={async () => {
                        try {
                          setIsGenerating(true);
                          setStatus('🎤 音声生成中...');
                          setProgress(10);
                          setTab('generating');
                          
                          // スクリプトから音声を生成
                          const script = isEditingScript ? editableScript : generatedScript;
                          
                          if (!script) {
                            setError('スクリプトが見つかりません');
                            setTab('script');
                            return;
                          }
                          
                          console.log('🎤 音声生成開始');
                          const audioEnhancedScript = await generateSlideAudios(script);
                          
                          // 音声付きスクリプトを保存
                          setGeneratedScript(audioEnhancedScript);
                          if (isEditingScript) {
                            setEditableScript(audioEnhancedScript);
                          }
                          
                          setStatus('✅ 音声生成完了！動画生成できます');
                          setProgress(100);
                          setTab('script');
                        } catch (error) {
                          console.error('❌ 音声生成エラー:', error);
                          setError('音声生成に失敗しました: ' + error.message);
                          setTab('script');
                        } finally {
                          setIsGenerating(false);
                        }
                      }}

                      disabled={isGenerating}

                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg font-bold flex items-center space-x-2"

                    >
                      <span>🎤</span>
                      <span>音声生成</span>

                    </button>

                    <button

                      onClick={handleGenerateVideo}

                      disabled={isGenerating}

                      className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 px-4 py-2 rounded-lg font-bold"

                    >

                      🎬 動画を生成

                    </button>

                  </div>

                </div>



                {/* スクリプト表示・編集 */}

                <UniversalScriptDisplay 

                  script={isEditingScript ? editableScript : generatedScript}

                  isEditing={isEditingScript}

                  onUpdate={setEditableScript}

                  showImageSelector={showImageSelector}

                  setShowImageSelector={setShowImageSelector}

                  showSlideImageSelector={showSlideImageSelector}

                  setShowSlideImageSelector={setShowSlideImageSelector}

                  slideImages={slideImages}

                  setSlideImages={setSlideImages}

                  currentSlideIndex={currentSlideIndex}

                  setCurrentSlideIndex={setCurrentSlideIndex}

                  keyword={keyword}

                />

                {/* まとめスライド - アイテムスライドと同じ形式 */}
                {isEditingScript ? editableScript : generatedScript ? (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-bold mb-2">
                      スライド{(isEditingScript ? editableScript : generatedScript).items ? (isEditingScript ? editableScript : generatedScript).items.length + 2 : 2}: まとめ
                      {slideImages[(isEditingScript ? editableScript : generatedScript).items ? (isEditingScript ? editableScript : generatedScript).items.length + 1 : 1] && <span className="ml-2 text-green-500">✓</span>}
                    </h3>
                    <div className="flex space-x-2">
                      {slideImages[(isEditingScript ? editableScript : generatedScript).items ? (isEditingScript ? editableScript : generatedScript).items.length + 1 : 1] && (
                        <img 
                          src={slideImages[(isEditingScript ? editableScript : generatedScript).items ? (isEditingScript ? editableScript : generatedScript).items.length + 1 : 1].url} 
                          alt={slideImages[(isEditingScript ? editableScript : generatedScript).items ? (isEditingScript ? editableScript : generatedScript).items.length + 1 : 1].alt} 
                          className="w-16 h-16 object-cover rounded" 
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-white mb-1">{slideImages[(isEditingScript ? editableScript : generatedScript).items ? (isEditingScript ? editableScript : generatedScript).items.length + 1 : 1]?.alt || '画像'}</p>
                        <p className="text-xs text-gray-400">カテゴリ: {slideImages[(isEditingScript ? editableScript : generatedScript).items ? (isEditingScript ? editableScript : generatedScript).items.length + 1 : 1]?.category || 'イベント'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentSlideIndex((isEditingScript ? editableScript : generatedScript).items ? (isEditingScript ? editableScript : generatedScript).items.length + 1 : 1);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        {slideImages[(isEditingScript ? editableScript : generatedScript).items ? (isEditingScript ? editableScript : generatedScript).items.length + 1 : 1] ? '変更' : '選択'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* 動画設定 - 一番下に配置 */}
                <div className="bg-white/5 rounded-lg p-4 mt-6">
                  <h3 className="font-bold text-lg mb-3">⚙️ 動画設定</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">時間:</span>
                      <span className="text-white ml-2">{calculateVideoDuration(isEditingScript ? editableScript : generatedScript)}秒</span>
                    </div>
                    <div>
                      <span className="text-gray-400">サイズ:</span>
                      <span className="text-white ml-2">1080×1920</span>
                    </div>
                  </div>
                </div>

              </div>

            )}

                  </div>

        )}



        {/* 生成中タブ */}

        {tab === 'generating' && (

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">

            <div className="text-2xl font-bold mb-4">🤖 {status || 'AIが動画を作成中...'}</div>

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



        {/* 完成タブ */}

        {tab === 'result' && video && (

          <div className="space-y-6">

            <div className="text-center mb-6">

              <h2 className="text-3xl font-bold text-yellow-400 mb-2">🎉 動画完成！</h2>

              <p className="text-gray-400">

                AIが作成した{video.hasImages ? '画像付き' : ''}動画をご確認ください

              </p>

            </div>



            <div className="bg-white/10 rounded-xl p-6 text-center">

              <div className="text-4xl mb-4">{video.thumbnail}</div>

              <div className="font-bold text-xl mb-2">{video.title}</div>

              <div className="text-gray-400 mb-2">{video.duration} | {video.videoData.size}</div>

              <div className="text-sm text-yellow-400 mb-2">{video.format}</div>
              
              
              
              <div className="flex justify-center space-x-4 mb-6">

                <button 

                  onClick={() => window.open(video.videoData.url)}

                  className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg flex items-center space-x-2"

                >

                  <Play className="w-5 h-5" />

                  <span>再生</span>

                </button>

                <button 

                  onClick={() => downloadVideo(video.videoData, `ai_video_${keyword}.webm`)}

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

                  🆕 新しい動画を作る

                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

};



// 動画時間を計算する関数（45-60秒に固定）
const calculateVideoDuration = (script) => {
  if (!script) return 0;
  
  let totalDuration = 0;
  
  // タイトルスライド: 15秒
  if (script.title) {
    totalDuration += 15;
  }
  
  // アイテムスライド: 各15秒（45秒ちょうどになるように）
  if (script.items && script.items.length > 0) {
    totalDuration += script.items.length * 15;
  }
  
  // まとめスライド: 15秒
  totalDuration += 15;
  
  return totalDuration;
};

// 汎用スクリプト表示コンポーネント（簡潔版）

const UniversalScriptDisplay = ({ 
  script, 
  isEditing, 
  onUpdate, 
  showImageSelector, 
  setShowImageSelector, 
  showSlideImageSelector,
  setShowSlideImageSelector,
  slideImages,
  setSlideImages,
  currentSlideIndex,
  setCurrentSlideIndex,
  keyword 
}) => {

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

          <div className="text-xl font-bold text-yellow-400">{typeof script.title === 'string' ? script.title : JSON.stringify(script.title)}</div>

        )}

        {/* タイトルスライド画像 */}
        {slideImages && slideImages[0] && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-300">タイトルスライド画像</span>
              <button
                onClick={() => setCurrentSlideIndex(0)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                変更
              </button>
      </div>
            <div className="flex items-center space-x-3">
              <div>
                <div className="text-sm text-white">{slideImages[0].alt}</div>
                <div className="text-xs text-gray-400">カテゴリ: {slideImages[0].category}</div>
              </div>
              <img 
                src={slideImages[0].url} 
                alt={slideImages[0].alt} 
                className="w-16 h-16 object-cover rounded"
              />
            </div>
          </div>
        )}

      </div>



      {/* 動画の種類・説明 */}

      {script.videoType && (

        <div>

          <label className="block text-sm font-bold text-gray-300 mb-2">動画タイプ</label>

          <div className="bg-blue-500/20 px-4 py-2 rounded-lg">

            <span className="text-blue-300 font-bold">{typeof script.videoType === 'string' ? script.videoType : JSON.stringify(script.videoType)}</span>

          </div>

        </div>

      )}



      {/* 動画の説明・構成 */}

      {script.content && (

        <div>

          <h3 className="font-bold text-lg mb-4">📝 動画の内容・構成</h3>

          <div className="space-y-3">

            {script.content.description && (

              <div className="bg-white/5 rounded-lg p-4">

                <h4 className="font-bold text-green-400 mb-2">📋 動画の説明</h4>

                <p className="text-gray-300">{typeof script.content?.description === 'string' ? script.content.description : JSON.stringify(script.content?.description)}</p>

              </div>

            )}

            {script.content.structure && (

              <div className="bg-white/5 rounded-lg p-4">

                <h4 className="font-bold text-purple-400 mb-2">🎯 構成の狙い</h4>

                <p className="text-gray-300">{typeof script.content?.structure === 'string' ? script.content.structure : JSON.stringify(script.content?.structure)}</p>

              </div>

            )}

          </div>

        </div>

      )}



      {/* アイテム・コンテンツ一覧 */}

      {script.items && script.items.length > 0 && (

        <div>

          <h3 className="font-bold text-lg mb-4">📋 動画内容</h3>

          <div className="space-y-4">

            {script.items.map((item, index) => (

              <div key={index} className="bg-white/5 rounded-lg p-4">

                <div className="flex items-start space-x-4">

                  {/* ランク表示（あれば） */}

                  {item.rank && (

                    <div className="bg-yellow-400 text-black font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm">

                      {item.rank}

                    </div>

                  )}

                  {/* ステップ番号（あれば） */}

                  {item.id && !item.rank && (

                    <div className="bg-blue-400 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm">

                      {item.id}

                    </div>

                  )}

                  
                  
                  <div className="flex-1">

                    {isEditing ? (

                      <div className="space-y-3">

                        {/* 新フォーマット: item.text */}
                        <input
                          type="text"
                          value={item.text || item.name || item.title || ''}
                          onChange={(e) => {
                            const newItems = [...script.items];
                            newItems[index] = { ...newItems[index], text: e.target.value };
                            updateField('items', newItems);
                          }}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                          placeholder="自然な1文（25-40文字、数字入り）"
                        />

                        <textarea
                          value={item.details || item.content?.details || ''}
                          onChange={(e) => {
                            const newItems = [...script.items];
                            newItems[index] = { ...newItems[index], details: e.target.value };
                            updateField('items', newItems);
                          }}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                          rows="3"
                          placeholder="詳細説明（ミディアム動画用、省略可）"
                        />

                      </div>

                    ) : (

                      <div>

                        {/* 新フォーマット: item.text */}
                        {item.text ? (
                          <p className="text-white text-lg font-semibold mb-2">{item.text}</p>
                        ) : (
                          <>
                            {/* 旧フォーマット: name + main */}
                        <h4 className="font-bold text-white mb-2">
                          {item.name || item.title || `アイテム ${index + 1}`}
                        </h4>
                        
                        {/* 価格（あれば） */}
                        {item.price && (
                          <p className="text-green-400 font-bold mb-2">{item.price}</p>
                        )}
                        
                        {/* メイン内容 */}
                            {(item.main || item.content?.main) && (
                              <p className="text-gray-300 mb-2 text-lg font-semibold">{item.main || item.content.main}</p>
                            )}
                          </>
                        )}

                        
                        
                        {/* 詳細内容 */}

                        {item.content?.details && (

                          <p className="text-gray-300 mb-2">{item.content.details}</p>

                        )}

                        
                        
                        {/* 追加情報 */}

                        {item.content?.extra && (

                          <div className="bg-blue-500/20 p-3 rounded mt-3">

                            <p className="text-sm text-blue-300">{item.content.extra}</p>

                          </div>

                        )}

                        
                        
                        {/* 従来の description */}

                        {item.description && !item.content && (

                          <p className="text-gray-300">{typeof item.description === 'string' ? item.description : JSON.stringify(item.description)}</p>

                        )}

                        
                        
                        {/* 特徴・features */}

                        {item.features && item.features.length > 0 && (

                          <div className="mt-3">

                            <div className="flex flex-wrap gap-2">

                              {item.features.map((feature, i) => (

                                <span key={i} className="bg-purple-500/30 text-purple-200 px-2 py-1 rounded text-sm">

                                  ✓ {feature}

                                </span>

                              ))}

                            </div>

                          </div>

                        )}



                        {/* パーソナルコメント */}

                        {item.personalComment && (

                          <div className="bg-purple-500/20 p-3 rounded mt-3">

                            <p className="text-sm text-gray-300">{item.personalComment}</p>

                          </div>

                        )}

                        {/* アイテムスライド画像 */}
                        {slideImages && slideImages[index + 1] && (
                          <div className="mt-4 p-4 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-gray-300">アイテム{index + 1}スライド画像</span>
                              <button
                                onClick={() => setCurrentSlideIndex(index + 1)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                              >
                                変更
                              </button>
                            </div>
                            <div className="flex items-center space-x-3">
                              <img 
                                src={slideImages[index + 1].url} 
                                alt={slideImages[index + 1].alt} 
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div>
                                <div className="text-sm text-white">{slideImages[index + 1].alt}</div>
                                <div className="text-xs text-gray-400">カテゴリ: {slideImages[index + 1].category}</div>
                              </div>
                            </div>
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



      {/* シーン構成（詳細表示） */}

      {script.scenes && script.scenes.length > 0 && (

        <div>

          <h3 className="font-bold text-lg mb-4">🎬 シーン構成</h3>

          <div className="space-y-3">

            {script.scenes.map((scene, index) => (

              <div key={index} className="bg-white/5 rounded-lg p-4">

                <div className="flex items-center justify-between mb-2">

                  <span className="font-bold text-yellow-400">

                    シーン {index + 1}: {scene.type}

                  </span>

                  <span className="text-sm text-gray-400">

                    {scene.startTime}s - {scene.endTime}s

                  </span>

                </div>

                <div className="text-sm text-gray-300">

                  {scene.content?.mainText && (

                    <div><strong>メイン:</strong> {scene.content.mainText}</div>

                  )}

                  {scene.content?.subText && (

                    <div><strong>サブ:</strong> {scene.content.subText}</div>

                  )}

                  {scene.content?.announcement && (

                    <div><strong>アナウンス:</strong> {scene.content.announcement}</div>

                  )}

                </div>

              </div>

            ))}

          </div>

        </div>

      )}




      {/* 画像選択モーダル */}
      {showImageSelector && (
        <ImageSelector
          keyword={keyword}
          onImageSelect={(image) => {
            setSelectedImage(image);
            setShowImageSelector(false);
            // 選択された画像を動画生成に反映
            console.log('選択された画像:', image);
          }}
          onClose={() => setShowImageSelector(false)}
        />
      )}

      {/* スライド別画像選択モーダル */}
      {showSlideImageSelector && script && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">🎯 スライド別画像選択</h2>
              <button
                onClick={() => setShowSlideImageSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
    </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* タイトルスライド */}
              <div className={`border rounded-lg p-4 ${slideImages[0] ? 'border-green-500 border-4' : ''}`}>
                <h3 className="font-bold mb-2 text-center">
                  スライド1: タイトル
                  {slideImages[0] && <span className="ml-2 text-green-500">✓</span>}
                </h3>
                <p className="text-sm text-gray-600 mb-3 text-center">{typeof script.title === 'string' ? script.title : JSON.stringify(script.title)}</p>
                <div className="flex justify-center items-center space-x-2">
                  {slideImages[0] && (
                    <img src={slideImages[0].url} alt={slideImages[0].alt} className="w-16 h-16 object-cover rounded" />
                  )}
                  <button
                    onClick={() => {
                      setCurrentSlideIndex(0);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    {slideImages[0] ? '変更' : '選択'}
                  </button>
                </div>
              </div>

              {/* アイテムスライド */}
              {script.items && script.items.map((item, index) => (
                <div key={index} className={`border rounded-lg p-4 ${slideImages[index + 1] ? 'border-green-500 border-4' : ''}`}>
                  <h3 className="font-bold mb-2 text-center">
                    スライド{index + 2}: アイテム{index + 1}
                    {slideImages[index + 1] && <span className="ml-2 text-green-500">✓</span>}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 text-center">{typeof (item.text || item.main || item.name) === 'string' ? (item.text || item.main || item.name) : JSON.stringify(item.text || item.main || item.name)}</p>
                  <div className="flex justify-center items-center space-x-2">
                    {slideImages[index + 1] && (
                      <img src={slideImages[index + 1].url} alt={slideImages[index + 1].alt} className="w-16 h-16 object-cover rounded" />
                    )}
                    <button
                      onClick={() => {
                      setCurrentSlideIndex(index + 1);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      {slideImages[index + 1] ? '変更' : '選択'}
                    </button>
                  </div>
                </div>
              ))}

              {/* まとめスライド（アイテムスライドと同じ形式） */}
              {script.items && (
                <div className={`border rounded-lg p-4 ${slideImages[script.items.length + 1] ? 'border-green-500 border-4' : ''}`}>
                <h3 className="font-bold mb-2">
                    スライド{script.items.length + 2}: まとめ
                    {slideImages[script.items.length + 1] && <span className="ml-2 text-green-500">✓</span>}
                </h3>
                  <p className="text-sm text-gray-600 mb-3">この動画がいいと思ったらチャンネル登録・高評価お願いします</p>
                <div className="flex space-x-2">
                    {slideImages[script.items.length + 1] && (
                      <img src={slideImages[script.items.length + 1].url} alt={slideImages[script.items.length + 1].alt} className="w-16 h-16 object-cover rounded" />
                  )}
                  <button
                    onClick={() => {
                        setCurrentSlideIndex(script.items.length + 1);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                      {slideImages[script.items.length + 1] ? '変更' : '選択'}
                  </button>
                </div>
              </div>
              )}

            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSlideImageSelector(false)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 個別スライド画像選択モーダル */}
      {currentSlideIndex !== null && script && (
        <SlideImageSelector
          slideIndex={currentSlideIndex}
          slideText={
            currentSlideIndex === 0 ? script.title :
            currentSlideIndex <= (script.items ? script.items.length : 0) ?
              (script.items[currentSlideIndex - 1]?.text || script.items[currentSlideIndex - 1]?.main || script.items[currentSlideIndex - 1]?.name) :
            'この動画がいいと思ったらチャンネル登録・高評価お願いします'
          }
          currentImage={slideImages[currentSlideIndex]}
          onImageSelect={(slideIndex, image) => {
            setSlideImages(prev => ({ ...prev, [slideIndex]: image }));
            setCurrentSlideIndex(null);
            console.log(`スライド${slideIndex + 1}の画像選択:`, image);
          }}
          onClose={() => setCurrentSlideIndex(null)}
        />
      )}

    </div>

  );

};



export default SimpleVideoGenerator;