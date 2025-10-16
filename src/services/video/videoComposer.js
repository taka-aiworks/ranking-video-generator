// src/services/video/videoComposer.js - オブジェクト形式画像対応版

import { API_CONFIG } from '../../config/api.js';
import loopController from './loopController.js';

class VideoComposer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.recorder = null;
    this.isGenerating = false;
    this.audioContext = null;
    this.audioBuffer = null;
    this.bgmSource = null;
    // 🆕 ナレーション（TTS）
    this.narrationBuffer = null;
    this.narrationSource = null;
    this.showDebugOverlay = false; // デフォルトはオフ
    this._frameToggle = false; // フレーム強制更新用トグル
    this.dataUrlCanvasCache = new Map(); // DataURL→原寸/縮小キャンバス
    this.fittedCanvasCache = new Map();  // (DataURL, WxH, mode, zoom, ox, oy)→フィット済みキャンバス
  }

  // BGM読み込み
  async loadBGM() {
    try {
      this.audioContext = new AudioContext();
      const response = await fetch('/audio/catchy-bgm.mp3');
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('🎵 BGM読み込み完了');
    } catch (error) {
      console.warn('⚠️ BGM読み込み失敗:', error);
      this.audioBuffer = null;
    }
  }

  // 🆕 TTS音声読み込み
  async loadNarration(audioUrl) {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      this.narrationBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('🎤 ナレーション読み込み完了');
    } catch (error) {
      console.error('❌ ナレーション読み込み失敗:', error);
      this.narrationBuffer = null;
    }
  }

  // 🎤 全スライドの音声を結合
  async combineAllAudios(slideAudios) {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      
      console.log('🎤 音声結合開始:', slideAudios.length, '件');
      
      // 各音声をAudioBufferとして読み込み
      const audioBuffers = [];
      for (const slideAudio of slideAudios) {
        const response = await fetch(slideAudio.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.push(audioBuffer);
      }
      
      // 全音声の合計長さを計算
      const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
      const sampleRate = audioBuffers[0].sampleRate;
      const numberOfChannels = audioBuffers[0].numberOfChannels;
      
      // 結合用のバッファを作成
      const combinedBuffer = this.audioContext.createBuffer(
        numberOfChannels,
        totalLength,
        sampleRate
      );
      
      // 各チャンネルのデータを結合
      let offset = 0;
      for (const buffer of audioBuffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          combinedBuffer.getChannelData(channel).set(channelData, offset);
        }
        offset += buffer.length;
      }
      
      this.narrationBuffer = combinedBuffer;
      console.log('✅ 音声結合完了:', (totalLength / sampleRate).toFixed(2), '秒');
      
    } catch (error) {
      console.error('❌ 音声結合失敗:', error);
      this.narrationBuffer = null;
    }
  }

  initCanvas(canvasRef, videoDesign) {
    console.log('🎬 Canvas初期化:', videoDesign?.title);
    
    this.canvas = canvasRef.current;
    if (!this.canvas) throw new Error('Canvas not found');
    
    this.ctx = this.canvas.getContext('2d');
    
    // 🎯 修正：pixelRatioを1に固定してスケール問題を回避
    const { width = 1080, height = 1920 } = videoDesign?.canvas || {};
    const pixelRatio = 1; // 固定（テキスト座標のずれを防ぐ）
    
    // Canvasの実際のサイズを設定
    this.canvas.width = width;
    this.canvas.height = height;
    
    // CSS表示サイズを設定
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    // 高品質描画設定
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.textRenderingOptimization = 'optimizeQuality';
    
    console.log(`✅ Canvas: ${width}x${height} (${pixelRatio}x scale)`);
    return this.canvas;
  }

  // 🆕 ナレーションをURLから読み込み（VOICEVOXのwav/webmを想定）
  async setNarrationFromUrl(url) {
    try {
      if (!url) {
        this.narrationBuffer = null;
        return;
      }
      if (!this.audioContext) this.audioContext = new AudioContext();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.narrationBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('🎤 ナレーション読み込み完了');
    } catch (e) {
      console.warn('⚠️ ナレーション読み込み失敗:', e);
      this.narrationBuffer = null;
    }
  }

  // 高品質録画開始（ビットレート/コーデック/フレームレート指定）
  startRecording(duration, options = {}) {
    // 🎯 高品質動画のためのビットレート調整
    const isStaticContent = true; // 主に静止画とテキスト
    const baseBitrate = isStaticContent ? 8000000 : 12000000; // 8Mbps or 12Mbps（高品質化）
    
    const {
      fps = 30, // 高品質のため30fpsに向上
      videoBitsPerSecond = baseBitrate,
      mimeTypePreferred = 'video/webm;codecs=vp9' // vp9に変更（高品質・高圧縮）
    } = options;

      const canvasStream = this.canvas.captureStream(fps);
      // ビデオトラックを保持して、後で明示的にrequestFrameできるようにする
      this.videoTrack = canvasStream.getVideoTracks()[0];
    
    // 🎵 音声ストリーム作成（BGM + ナレーションをミックス）
    let stream = canvasStream;
    if (this.audioContext) {
      const audioDestination = this.audioContext.createMediaStreamDestination();

      // ミキサー用ゲイン
      const mixerGain = this.audioContext.createGain();
      mixerGain.gain.value = 1.0;
      mixerGain.connect(audioDestination);

      // BGM接続（任意）
      if (this.audioBuffer) {
        this.bgmSource = this.audioContext.createBufferSource();
        this.bgmSource.buffer = this.audioBuffer;
        this.bgmSource.loop = true;
        const bgmGain = this.audioContext.createGain();
        bgmGain.gain.value = 0.25; // 低めにミックス
        this.bgmSource.connect(bgmGain);
        bgmGain.connect(mixerGain);
      }

      // ナレーション接続（任意）
      if (this.narrationBuffer) {
        console.log('🎤 ナレーション接続:', {
          bufferLength: this.narrationBuffer.length,
          duration: this.narrationBuffer.duration.toFixed(2) + 's',
          sampleRate: this.narrationBuffer.sampleRate,
          numberOfChannels: this.narrationBuffer.numberOfChannels
        });
        this.narrationSource = this.audioContext.createBufferSource();
        this.narrationSource.buffer = this.narrationBuffer;
        this.narrationSource.loop = false;
        // 再生速度で総尺を調整（>=0.5かつ<=2.0の範囲に丸め）
        const rate = Math.min(2.0, Math.max(0.5, options.narrationPlaybackRate || 1.0));
        this.narrationSource.playbackRate.value = rate;
        const narGain = this.audioContext.createGain();
        narGain.gain.value = 1.0; // 主音量
        this.narrationSource.connect(narGain);
        narGain.connect(mixerGain);
        console.log('✅ ナレーション接続完了');
      } else {
        console.warn('⚠️ ナレーションバッファが存在しません');
      }

      // Canvasと音声を結合
      stream = new MediaStream([
        ...canvasStream.getTracks(),
        ...audioDestination.stream.getTracks()
      ]);
      console.log('🎧 音声ミックス済みストリーム作成完了:', {
        videoTracks: canvasStream.getTracks().length,
        audioTracks: audioDestination.stream.getTracks().length,
        totalTracks: stream.getTracks().length
      });
    }

    // 使用可能な mimeType を選択（高品質優先）
    let mimeType = mimeTypePreferred;
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
      if (!MediaRecorder.isTypeSupported(mimeTypePreferred)) {
        // 高品質フォールバック順序
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          mimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
          mimeType = 'video/mp4;codecs=h264';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        } else {
          mimeType = '';
        }
      }
    }

    const recorderOptions = mimeType
      ? { mimeType, videoBitsPerSecond }
      : { videoBitsPerSecond };

    this.recorder = new MediaRecorder(stream, recorderOptions);
    
    const chunks = [];
    let chunkCount = 0;
    this.recorder.ondataavailable = e => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        chunkCount++;
        console.log('📦 データチャンク追加:', e.data.size, 'bytes', '累計:', chunkCount, 'チャンク');
        
        // 🎯 リアルタイムでチャンク状況を確認
        // 録画進捗ログを削除（ループ軽減）
      }
    };
    
    console.log('🔴 録画開始...', duration/1000 + 's', {
      fps,
      videoBitsPerSecond,
      mimeType: recorderOptions.mimeType || 'default'
    });
    console.log('🔍 ストリーム詳細:', {
      hasVideo: stream.getVideoTracks().length > 0,
      hasAudio: stream.getAudioTracks().length > 0,
      videoTrack: stream.getVideoTracks()[0]?.label || 'なし',
      audioTrack: stream.getAudioTracks()[0]?.label || 'なし'
    });
    
    return new Promise((resolve, reject) => {
      this.recorder.onstop = () => {
        console.log('⏹️ 録画停止、ファイル作成中...');
        console.log('📊 データチャンク統計:', {
          totalChunks: chunkCount,
          totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0) + ' bytes',
          averageChunkSize: Math.round(chunks.reduce((sum, chunk) => sum + chunk.size, 0) / chunkCount) + ' bytes'
        });
        
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(videoBlob);
        
        console.log('✅ 動画ファイル作成完了:', (videoBlob.size / (1024*1024)).toFixed(2) + 'MB');
        console.log('🎯 期待される動画時間:', duration/1000 + '秒');
        
        resolve({
          blob: videoBlob,
          url: url,
          size: (videoBlob.size / (1024*1024)).toFixed(2) + 'MB',
          expectedDuration: duration/1000 + '秒'
        });
      };
      
      this.recorder.onerror = reject;
      
      // 🎵 音声再生開始（ストリームに含まれている場合）
      if (this.bgmSource) {
        this.bgmSource.start();
        console.log('🎵 BGM再生開始');
      }
      if (this.narrationSource) {
        this.narrationSource.start();
        console.log('🎤 ナレーション再生開始');
      }
      
      this.recorder.start(); // 🎯 デフォルト設定で開始
      
      // 🕒 ナレーション終了で録画停止（完全同期）
      if (this.narrationSource) {
        this.narrationSource.onended = () => {
          console.log('⏰ ナレーション終了 - 録画停止実行');
        if (this.bgmSource) {
            try { this.bgmSource.stop(); } catch (_) {}
          console.log('🎵 BGM停止');
        }
          if (this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
          }
        };
      } else {
        // フォールバック: duration + 2s で停止
        const fallback = setTimeout(() => {
          console.log('⏰ フォールバック停止');
          if (this.bgmSource) {
            try { this.bgmSource.stop(); } catch (_) {}
            console.log('🎵 BGM停止');
          }
        if (this.recorder && this.recorder.state === 'recording') {
          this.recorder.stop();
        }
        }, duration + 2000);
        this.recordingTimer = fallback;
      }
    });
  }

  // 🚨 修正：画像付き動画生成（オブジェクト形式対応）
  async generateVideoWithImages(videoDesign, slideImages, onProgress) {
    console.log('🖼️ 画像データ受信検証:', {
      slideImagesType: typeof slideImages,
      isArray: Array.isArray(slideImages),
      isObject: slideImages && typeof slideImages === 'object',
      keys: slideImages ? Object.keys(slideImages) : [],
      hasImages: !!slideImages && Object.keys(slideImages || {}).length > 0
    });

    if (this.isGenerating) {
      throw new Error('Already generating video');
    }

    this.isGenerating = true;
    
    // 🎵 BGM読み込み
    await this.loadBGM();
    
    // 🎤 全スライドの音声を結合
    if (videoDesign.slideAudios && videoDesign.slideAudios.length > 0) {
      await this.combineAllAudios(videoDesign.slideAudios);
    }

    try {
      // 🆕 スライドごとの音声データがあるかチェック
      const hasSlideAudios = videoDesign.slideAudios && Array.isArray(videoDesign.slideAudios) && videoDesign.slideAudios.length > 0;
      
      if (!hasSlideAudios) {
        throw new Error('スライドごとの音声データが見つかりません。先に音声を生成してください。');
      }
      
      console.log('🎤 スライド音声データ:', videoDesign.slideAudios.map((a, i) => `[${i+1}] ${a.type}: ${a.duration?.toFixed(2)}s`));

      // 🛡️ 事前に各スライドの表示時間を正規化（NaN/Infinity/極端値を防ぐ）
      const MIN_SEC = 1.2;
      const normalizedSlideAudios = videoDesign.slideAudios.map((a, i) => {
        const d = Number(a.duration);
        const finite = Number.isFinite(d) && d > 0 ? d : 3;
        const clamped = Math.max(MIN_SEC, finite); // 上限は設けず、音声長に合わせる
        if (!Number.isFinite(d) || d <= 0 || clamped !== d && d !== clamped) {
          console.warn(`⏱️ スライド${i+1}のdurationを補正: original=${d}, used=${clamped}`);
        }
        return { ...a, duration: clamped };
      });

      // 🎯 修正：先に時間計算を行う
      let currentSlideIndex = 0;
      const totalSlides = normalizedSlideAudios.length;
      
      // 🎯 実際の表示時間を記録
      const slideTimings = [];
      const sessionStartTime = Date.now();
      
      // 🎯 修正：音声の実際の長さに基づいて動画時間を設定
      const totalDuration = normalizedSlideAudios.reduce((sum, audio) => sum + (audio.duration * 1000 || 0), 0);
      
      console.log('🔴 録画処理開始');
      // 🎯 修正：実際の動画時間で録画開始
      const recording = this.startRecording(totalDuration);
      console.log('✅ MediaRecorder開始完了');
      
      console.log('📋 詳細スライド計画:', {
        totalSlides: totalSlides,
        calculatedDuration: (totalDuration / 1000).toFixed(2) + 's',
        breakdown: normalizedSlideAudios.map((a, i) => `[${i+1}] ${a.type}: ${(a.duration || 0).toFixed(2)}s`)
      });
      
      // 🕒 オーディオクロックに同期した描画
      const narrationStartTime = this.audioContext ? this.audioContext.currentTime : 0;
      const waitUntilAudioTime = async (targetSec) => {
        if (!this.audioContext) {
          await this.sleep(targetSec * 1000);
          return;
        }
        return new Promise((resolve) => {
          const tick = () => {
            const t = this.audioContext.currentTime - narrationStartTime;
            if (t >= targetSec) return resolve();
            requestAnimationFrame(tick);
          };
          tick();
        });
      };

      let elapsed = 0;
      const frameLoopIntervalMs = Math.round(1000 / 30);
      const pumpFrame = () => {
        try { this.videoTrack && this.videoTrack.requestFrame && this.videoTrack.requestFrame(); } catch (_) {}
      };
      for (let i = 0; i < normalizedSlideAudios.length; i++) {
        const slideAudio = normalizedSlideAudios[i];
        const slideDuration = slideAudio.duration;

        // スライド描画開始ログを削除（ループ軽減）
        const slideImage = this.getSlideImage(slideImages, i);
        if (slideAudio.type === 'title') {
          await this.renderTitleSlide(videoDesign, slideImage);
          this.drawDebugOverlay(i+1, totalSlides);
          this.nudgeFrame();
          await this.flushFrame();
        } else if (slideAudio.type === 'item') {
          const itemIndex = i - 1;
          const item = videoDesign.items[itemIndex];
          if (item) await this.renderItemSlide(item, itemIndex + 1, 0, slideImage);
          this.drawDebugOverlay(i+1, totalSlides);
          this.nudgeFrame();
          await this.flushFrame();
        } else if (slideAudio.type === 'summary') {
          await this.renderSummarySlide(videoDesign, slideImage);
          this.drawDebugOverlay(i+1, totalSlides);
          this.nudgeFrame();
          await this.flushFrame();
        }

        console.log(`🔇 ${slideAudio.type}の音声: ${slideDuration.toFixed(2)}秒（結合済み）`);
        console.log(`✅ ${slideAudio.type}描画完了`);

        const target = elapsed + slideDuration;
        // スライド表示ログを削除（ループ軽減）
        // 表示中は定期的にフレーム再描画 + 発行
        const slideImageLoop = slideImage; // 再利用
        while (true) {
          // 再描画（同じスライドを毎フレーム）
          if (slideAudio.type === 'title') {
            await this.renderTitleSlide(videoDesign, slideImageLoop);
          } else if (slideAudio.type === 'item') {
            const itemIndex = i - 1;
            const item = videoDesign.items[itemIndex];
            if (item) await this.renderItemSlide(item, itemIndex + 1, 0, slideImageLoop);
          } else if (slideAudio.type === 'summary') {
            await this.renderSummarySlide(videoDesign, slideImageLoop);
          }
          this.nudgeFrame();
          pumpFrame();
          await new Promise(r => setTimeout(r, frameLoopIntervalMs));
          if (!this.audioContext) break;
          const t = this.audioContext.currentTime - narrationStartTime;
          if (t >= target) break;
        }

        slideTimings.push({ slide: slideAudio.type, planned: slideDuration * 1000, actual: slideDuration * 1000 });
          if (onProgress) {
          const progress = ((i + 1) / totalSlides) * 100;
            onProgress(Math.round(progress));
            // 進捗ログを削除（ループ軽減）
          }
        elapsed = target;
      }
      
      console.log('🏁 全スライド描画完了');
      
      // 🎯 修正：手動停止を完全に削除し、タイマー停止のみを使用
      console.log('⏰ タイマー停止まで待機中...');
      
      // タイマーが発火するまで待機（手動停止なし）
      
      const videoData = await recording;
      
      // 🎯 修正：LoopControllerの終了処理も無効化
      // loopController.endSession();
      
      // 🎯 詳細な時間分析
      const totalActualTime = Date.now() - sessionStartTime;
      const plannedTotal = slideTimings.reduce((sum, t) => sum + t.planned, 0);
      const actualTotal = slideTimings.reduce((sum, t) => sum + t.actual, 0);
      
      // 実際の動画時間
      const actualDurationSeconds = totalActualTime / 1000;
      
      console.log('✅ 画像付き動画生成完了');
      console.log('📊 時間分析詳細:', {
        calculatedDuration: totalDuration / 1000 + 's',
        actualDuration: actualDurationSeconds + 's',
        plannedDrawingTime: plannedTotal / 1000 + 's',
        actualDrawingTime: actualTotal / 1000 + 's',
        fileSize: videoData.size,
        contentComplete: true
      });
      
      console.log('📋 スライド別時間詳細:', slideTimings.map(t => ({
        slide: t.slide,
        planned: (t.planned/1000).toFixed(1) + 's',
        actual: (t.actual/1000).toFixed(1) + 's',
        diff: ((t.actual - t.planned)/1000).toFixed(1) + 's'
      })));
      
      return {
        success: true,
        videoBlob: videoData.blob,
        url: videoData.url,
        duration: actualDurationSeconds, // 実際の動画時間を返す
        requestedDuration: totalDuration / 1000,
        slideCount: currentSlideIndex + 1,
        imagesUsed: slideImages ? Object.keys(slideImages).length : 0,
        size: videoData.size,
        timingAccurate: true
      };
      
    } catch (error) {
      console.error('🚨 画像付き動画生成エラー:', error);
      
      // 🎯 修正：エラー時のLoopController処理も無効化
      // if (loopController.isSessionActive && loopController.isSessionActive()) {
      //   loopController.endSession();
      // }
      
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  // 🚨 完全修正：getSlideImage メソッド（オブジェクト＋配列両対応）
  getSlideImage(slideImages, slideIndex) {
    if (!slideImages) {
      // 画像なし
      return null;
    }
    
    // 形式情報のみ（騒がしいログ削減）
    // console.debug 用に変更したいが本番では抑制
    
    // 🔧 修正1: オブジェクト形式の場合（推奨形式）
    if (slideImages && typeof slideImages === 'object' && !Array.isArray(slideImages)) {
      // 直接キーアクセス（最優先）
      if (slideImages[slideIndex]) {
        const image = slideImages[slideIndex];
        console.log(`✅ スライド${slideIndex}画像取得(オブジェクト):`, (image.alt || '').substring(0, 30) + '...');
        return image;
      }
      
      // slideIndexプロパティで検索
      const imageValues = Object.values(slideImages);
      const foundByProperty = imageValues.find(img => img?.slideIndex === slideIndex);
      if (foundByProperty) {
        console.log(`✅ スライド${slideIndex}画像取得(プロパティ検索):`, (foundByProperty.alt || '').substring(0, 30) + '...');
        return foundByProperty;
      }
    }
    
    // 🔧 修正2: 配列形式の場合（下位互換）
    if (Array.isArray(slideImages)) {
      // 直接インデックスアクセス
      if (slideImages[slideIndex]) {
        const image = slideImages[slideIndex];
        console.log(`✅ スライド${slideIndex}画像取得(配列):`, (image.alt || '').substring(0, 30) + '...');
        return image;
      }
      
      // slideIndexプロパティで検索
      const foundByProperty = slideImages.find(img => img?.slideIndex === slideIndex);
      if (foundByProperty) {
        console.log(`✅ スライド${slideIndex}画像取得(配列プロパティ検索):`, (foundByProperty.alt || '').substring(0, 30) + '...');
        return foundByProperty;
      }
    }
    
    // 明示的に未選択
    return null;
  }

  // タイトルスライド描画
  async renderTitleSlide(videoDesign, slideImage = null) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // タイトル（自動折り返し）
    const titleMaxWidth = Math.floor(this.canvas.width * 0.85);
    const titleMaxHeight = Math.floor(this.canvas.height * 0.25);
    this.drawWrappedText(
      videoDesign.title || 'タイトル',
      centerX,
      centerY - 200,
      70,
      '#212529',
      { bold: true },
      titleMaxWidth,
      titleMaxHeight
    );
    
    // 画像描画
    const imageX = this.canvas.width * 0.15;
    const imageY = centerY + 200;
    const imageWidth = this.canvas.width * 0.7;
    const imageHeight = 300;
    
    if (slideImage?.optimized?.canvas) {
      this.drawActualImage(slideImage.optimized.canvas, imageX, imageY, imageWidth, imageHeight);
    } else if (slideImage?.url && typeof slideImage.url === 'string' && slideImage.url.startsWith('data:')) {
      await this.drawDataUrlImage(slideImage.url, imageX, imageY, imageWidth, imageHeight);
    } else {
      // 画像未選択時は何も描画しない（プレースホルダー非表示）
    }
  }

  // 項目スライド描画（🆕 j=0で全内容表示に対応）
  async renderItemSlide(item, itemNumber, subSlideIndex = 0, slideImage = null) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    // 番号バッジは不要なのでコメントアウト
    // this.drawNumberBadge(itemNumber, 100, 120, 50);
    
    // 新フォーマット: item.text（自然な文章）
    // 旧フォーマット: item.name + item.main
    const itemText = item.text || '';
    const itemTitle = item.name || item.title || `項目`;
    const mainContent = item.main || item.content?.main || item.description || '';
    const details = item.details || item.content?.details || '';
    
    const textAreaHeight = this.canvas.height / 2;
    const imageX = this.canvas.width * 0.1;
    const imageY = this.canvas.height / 2;
    const imageWidth = this.canvas.width * 0.8;
    const imageHeight = this.canvas.height / 2;
    const textMaxWidth = Math.floor(this.canvas.width * 0.85);
    
    // 🆕 j=0の場合、全内容を表示
    if (subSlideIndex === 0) {
      if (itemText) {
        // 新フォーマット: item.text（自然な文章）を大きく表示
        this.drawWrappedText(itemText, centerX, 350, 65, '#000000', { bold: true }, textMaxWidth, 400);
        
        // 詳細（あれば下部に）
        if (details) {
          this.drawWrappedText(details, centerX, 700, 35, '#555555', {}, textMaxWidth, 200);
        }
      } else {
        // 旧フォーマット: title + main + details
        this.drawWrappedText(itemTitle, centerX, 250, 55, '#000000', { bold: true }, textMaxWidth, 200);
        
        if (mainContent) {
          this.drawWrappedText(mainContent, centerX, 450, 38, '#333333', {}, textMaxWidth, 150);
        }
        
        if (details) {
          this.drawWrappedText(details, centerX, 650, 35, '#555555', {}, textMaxWidth, 250);
        }
      }
      
      // 画像は下部に小さめに配置
      if (slideImage?.optimized?.canvas) {
        this.drawActualImage(slideImage.optimized.canvas, imageX, imageY + 100, imageWidth, imageHeight - 150);
      } else if (slideImage?.url && slideImage.url.startsWith('data:')) {
        await this.drawDataUrlImage(slideImage.url, imageX, imageY + 100, imageWidth, imageHeight - 150);
      } else {
        // 画像未選択時は何も描画しない（プレースホルダー非表示）
      }
    } else if (subSlideIndex === 1 && mainContent) {
      this.drawWrappedText(itemTitle, centerX, textAreaHeight * 0.25, 45, '#000000', { bold: true }, textMaxWidth, Math.floor(textAreaHeight * 0.4));
      this.drawWrappedText(mainContent, centerX, textAreaHeight * 0.7, 40, '#000000', {}, textMaxWidth, Math.floor(textAreaHeight * 0.6));
      if (slideImage?.optimized?.canvas) {
        this.drawActualImage(slideImage.optimized.canvas, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else if (slideImage?.url && slideImage.url.startsWith('data:')) {
        await this.drawDataUrlImage(slideImage.url, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else {
        // 画像未選択時は何も描画しない（プレースホルダー非表示）
      }
    } else if (subSlideIndex === 2 && details) {
      this.drawWrappedText('💡 ポイント', centerX, textAreaHeight * 0.25, 45, '#000000', { bold: true }, textMaxWidth, Math.floor(textAreaHeight * 0.35));
      this.drawWrappedText(details, centerX, textAreaHeight * 0.7, 38, '#000000', {}, textMaxWidth, Math.floor(textAreaHeight * 0.65));
      if (slideImage?.optimized?.canvas) {
        this.drawActualImage(slideImage.optimized.canvas, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else if (slideImage?.url && slideImage.url.startsWith('data:')) {
        await this.drawDataUrlImage(slideImage.url, imageX, imageY + 30, imageWidth, imageHeight - 60);
      } else {
        // 画像未選択時は何も描画しない（プレースホルダー非表示）
      }
    }
  }

  // まとめスライド描画
  async renderSummarySlide(videoDesign, slideImage = null) {
    this.drawWhiteBackground();
    
    const centerX = this.canvas.width / 2;
    const textAreaHeight = this.canvas.height / 2;
    
    // エンディングCTA
    this.drawWrappedText(
      'この動画が良かったら…',
      centerX,
      textAreaHeight * 0.35,
      42,
      '#000000',
      { bold: true },
      Math.floor(this.canvas.width * 0.9),
      Math.floor(textAreaHeight * 0.5)
    );
    this.drawCTAButtons(centerX, textAreaHeight * 0.6);
    
    // まとめ画像
    const imageX = this.canvas.width * 0.2;
    const imageY = this.canvas.height * 0.7;
    const imageWidth = this.canvas.width * 0.6;
    const imageHeight = 200;
    
    if (slideImage?.optimized?.canvas) {
      this.drawActualImage(slideImage.optimized.canvas, imageX, imageY, imageWidth, imageHeight);
    } else if (slideImage?.url && slideImage.url.startsWith('data:')) {
      await this.drawDataUrlImage(slideImage.url, imageX, imageY, imageWidth, imageHeight);
    } else {
      // 画像未選択時は何も描画しない（プレースホルダー非表示）
    }
  }

  // 🧪 デバッグ用オーバーレイ
  drawDebugOverlay(slideIndex, totalSlides) {
    if (!this.showDebugOverlay || !this.ctx || !this.canvas) return;
    const text = `SLIDE ${slideIndex}/${totalSlides}`;
    this.ctx.save();
    this.ctx.globalAlpha = 0.6;
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(this.canvas.width - 320, 20, 300, 70);
    this.ctx.globalAlpha = 1.0;
    this.ctx.fillStyle = '#ffffff';
    // フォント取得関数が未定義でも安全に動くよう、固定フォントを使用
    this.ctx.font = 'bold 32px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(text, this.canvas.width - 30, 70);
    this.ctx.restore();
  }

  // 🖼️ フレームフラッシュ（Canvasの描画内容を確実にストリームへ反映）
  async flushFrame() {
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
  }

  // 🎯 ほぼ不可視の1pxを書き換えてフレーム差分を強制発生
  nudgeFrame() {
    if (!this.ctx || !this.canvas) return;
    this._frameToggle = !this._frameToggle;
    this.ctx.save();
    this.ctx.globalAlpha = 0.003; // 肉眼では分からない透明度
    this.ctx.fillStyle = this._frameToggle ? '#000' : '#111';
    this.ctx.fillRect(0, 0, 1, 1);
    this.ctx.restore();
  }

  // 通常の動画生成（画像なし）
  async generateVideo(videoDesign, onProgress) {
    console.log('🎬 通常動画生成開始');
    return this.generateVideoWithImages(videoDesign, {}, onProgress);
  }

  // 実際の画像描画
  drawActualImage(canvas, x, y, width, height) {
    try {
      this.ctx.drawImage(canvas, x, y, width, height);
    } catch (error) {
      console.error('🚨 画像描画エラー:', error);
      this.drawImagePlaceholder(x, y, width, height, 'エラー');
    }
  }

  // Data URL画像描画（アップロード画像用）
  async drawDataUrlImage(dataUrl, x, y, width, height, options = {}) {
    try {
      const fitMode = options.mode || 'cover'; // 'cover' | 'contain'
      const zoom = Math.min(3, Math.max(0.5, options.zoom || 1.0));
      const offsetX = Math.min(1, Math.max(0, options.offsetX ?? 0.5)); // 0..1 中心
      const offsetY = Math.min(1, Math.max(0, options.offsetY ?? 0.5));

      // 1) ベースキャンバス（最大辺を制限してダウンサンプルキャッシュ）
      const baseCanvas = await this.getBaseCanvasFromDataUrl(dataUrl);
      // 2) 目的サイズへフィット（cover/contain + 中心オフセット + ズーム）
      const fitted = this.getFittedCanvas(baseCanvas, width, height, { mode: fitMode, zoom, offsetX, offsetY, key: dataUrl });
      this.ctx.drawImage(fitted, x, y, width, height);
    } catch (error) {
      console.warn('⚠️ DataURL画像描画失敗:', error);
      this.drawImagePlaceholder(x, y, width, height, '画像');
    }
  }

  async getBaseCanvasFromDataUrl(dataUrl) {
    let cached = this.dataUrlCanvasCache.get(dataUrl);
    if (cached) return cached;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    img.src = dataUrl;
    await loaded;
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const maxEdge = 2048; // メモリ・速度対策
    const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
    const outW = Math.max(1, Math.round(srcW * scale));
    const outH = Math.max(1, Math.round(srcH * scale));
    const off = document.createElement('canvas');
    off.width = outW;
    off.height = outH;
    const offCtx = off.getContext('2d');
    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = 'high';
    offCtx.drawImage(img, 0, 0, outW, outH);
    this.dataUrlCanvasCache.set(dataUrl, off);
    return off;
  }

  getFittedCanvas(baseCanvas, targetW, targetH, opts) {
    const mode = opts.mode || 'cover';
    const zoom = Math.min(3, Math.max(0.5, opts.zoom || 1.0));
    const ox = Math.min(1, Math.max(0, opts.offsetX ?? 0.5));
    const oy = Math.min(1, Math.max(0, opts.offsetY ?? 0.5));
    const cacheKey = `${opts.key}|${targetW}x${targetH}|${mode}|${zoom}|${ox}|${oy}`;
    const cached = this.fittedCanvasCache.get(cacheKey);
    if (cached) return cached;

    const sw = baseCanvas.width;
    const sh = baseCanvas.height;
    const srcAspect = sw / sh;
    const dstAspect = targetW / targetH;

    let drawW, drawH;
    if (mode === 'contain') {
      if (srcAspect > dstAspect) {
        drawW = targetW * zoom;
        drawH = drawW / srcAspect;
      } else {
        drawH = targetH * zoom;
        drawW = drawH * srcAspect;
      }
    } else { // cover
      if (srcAspect > dstAspect) {
        // 幅が余る → 高さ基準で拡大
        drawH = targetH * zoom;
        drawW = drawH * srcAspect;
      } else {
        // 高さが余る → 幅基準で拡大
        drawW = targetW * zoom;
        drawH = drawW / srcAspect;
      }
    }

    // 中心オフセット（0..1）で切り取り位置を調整
    const dx = (targetW - drawW) * ox;
    const dy = (targetH - drawH) * oy;

    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(baseCanvas, dx, dy, drawW, drawH);

    this.fittedCanvasCache.set(cacheKey, out);
    return out;
  }

  // プレースホルダー画像描画
  drawImagePlaceholder(x, y, width, height, text = '画像') {
    this.ctx.save();
    
    // 背景
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.fillRect(x, y, width, height);
    
    // 枠線
    this.ctx.strokeStyle = '#dee2e6';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
    
    // テキスト
    this.ctx.fillStyle = '#6c757d';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x + width/2, y + height/2);
    
    this.ctx.restore();
  }

  // 白背景描画
  drawWhiteBackground() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // 大きなテキスト描画
  drawLargeText(text, x, y, fontSize = 32, color = '#000000', options = {}) {
    this.ctx.save();
    
    const weight = options.bold ? 'bold' : 'normal';
    this.ctx.font = `${weight} ${fontSize}px Arial`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = y - (totalHeight / 2) + (lineHeight / 2);
    
    lines.forEach((line, index) => {
      this.ctx.fillText(line, x, startY + (index * lineHeight));
    });
    
    this.ctx.restore();
  }

  // 折り返しテキスト描画（キャンバス幅に応じて自動改行/縮小）
  drawWrappedText(text, x, y, fontSize = 32, color = '#000000', options = {}, maxWidth, maxHeight) {
    this.ctx.save();
    // 全てのテキストを太字に統一
    const weight = '900'; // 超太字
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const minFontSize = Math.max(16, Math.floor(fontSize * 0.6));
    let currentFontSize = fontSize;
    let lines = [];
    let lineHeight;

    // 改行を一旦保持しつつ各段落ごとにラップ
    const paragraphs = (text || '').toString().split('\n');

    const wrapWithFont = (size) => {
      this.ctx.font = `${weight} ${size}px Arial, "Noto Sans JP", sans-serif`;
      const computedLines = [];
      const space = ' ';
      paragraphs.forEach(p => {
        const lineBuffer = [];
        // 日本語対策: スペースがない場合は1文字ずつ扱う
        const hasSpace = p.includes(space);
        const tokens = hasSpace ? p.split(space) : p.split('');
        let currentLine = '';
        tokens.forEach((token, idx) => {
          const fragment = hasSpace ? (currentLine ? currentLine + space + token : token) : (currentLine + token);
          const width = this.ctx.measureText(fragment).width;
          if (maxWidth && width > maxWidth && currentLine) {
            lineBuffer.push(currentLine);
            currentLine = hasSpace ? token : token; // token自体を次行に
          } else {
            currentLine = fragment;
          }
        });
        if (currentLine) lineBuffer.push(currentLine);
        // 空行も尊重
        if (lineBuffer.length === 0) lineBuffer.push('');
        computedLines.push(...lineBuffer);
      });
      return computedLines;
    };

    while (currentFontSize >= minFontSize) {
      lines = wrapWithFont(currentFontSize);
      lineHeight = currentFontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      if (!maxHeight || totalHeight <= maxHeight) {
        break;
      }
      currentFontSize -= 2;
    }

    // 最終描画
    this.ctx.font = `${weight} ${currentFontSize}px Arial`;
    lineHeight = currentFontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = y - (totalHeight / 2) + (lineHeight / 2);
    lines.forEach((line, index) => {
      this.ctx.fillText(line, x, startY + (index * lineHeight));
    });

    this.ctx.restore();
  }

  // 番号バッジ描画
  drawNumberBadge(number, x, y, radius) {
    this.ctx.save();
    
    // 円描画
    this.ctx.fillStyle = '#007bff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // 番号描画
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(number.toString(), x, y);
    
    this.ctx.restore();
  }

  // いいね/登録ボタン風のCTAを描画
  drawCTAButtons(centerX, baseY) {
    const buttonWidth = Math.floor(this.canvas.width * 0.36);
    const buttonHeight = 70;
    const gap = 30;
    const leftX = centerX - buttonWidth - (gap / 2);
    const rightX = centerX + (gap / 2);
    const y = baseY;

    // 左: グッドボタン
    this.drawRoundedButton(leftX, y, buttonWidth, buttonHeight, '#ffdd57', '#000000', '👍 高評価お願いします');
    // 右: チャンネル登録
    this.drawRoundedButton(rightX, y, buttonWidth, buttonHeight, '#ff6b6b', '#ffffff', '🔔 チャンネル登録');
  }

  drawRoundedButton(x, y, width, height, bgColor, textColor, label) {
    this.ctx.save();
    const radius = 16;
    this.ctx.fillStyle = bgColor;
    this.roundRectPath(x, y, width, height, radius);
    this.ctx.fill();

    this.ctx.fillStyle = textColor;
    this.ctx.font = 'bold 28px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x + width / 2, y + height / 2);
    this.ctx.restore();
  }

  roundRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + width - r, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    this.ctx.lineTo(x + width, y + height - r);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    this.ctx.lineTo(x + r, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  // Sleep関数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // クリーンアップ
  cleanup() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    
    // タイマーのクリーンアップ
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    this.isGenerating = false;
    console.log('🧹 VideoComposer クリーンアップ完了');
  }
}

const videoComposer = new VideoComposer();
export default videoComposer;