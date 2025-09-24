// src/services/video/loopController.js - 無限ループ防止システム

class LoopController {
  constructor() {
    this.isActive = false;
    this.startTime = null;
    this.maxDuration = 180000; // 最大3分（180秒）
    this.animationId = null;
    this.timeoutId = null;
    this.forceStopCallback = null;
    this.recorder = null;
  }

  // 録画セッション開始
  startSession(duration, recorder, forceStopCallback) {
    console.log('🔒 LoopController セッション開始:', duration + 's');
    
    this.reset(); // 前回セッションをクリア
    
    this.isActive = true;
    this.startTime = Date.now();
    this.recorder = recorder;
    this.forceStopCallback = forceStopCallback;
    
    // 指定時間 + バッファ（5秒）で強制停止
    const safetyDuration = Math.min(duration * 1000 + 5000, this.maxDuration);
    
    this.timeoutId = setTimeout(() => {
      console.log('⚠️ 制限時間到達 - 強制終了実行');
      this.forceStop('TIMEOUT');
    }, safetyDuration);
    
    return true;
  }

  // アニメーションIDの登録
  registerAnimation(animationId) {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.animationId = animationId;
  }

  // 現在の実行時間取得
  getElapsedTime() {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime;
  }

  // セッション状態確認
  isSessionActive() {
    return this.isActive && this.startTime;
  }

  // 正常終了
  endSession() {
    console.log('✅ LoopController セッション正常終了');
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.isActive = false;
    
    // 録画が継続中の場合は停止
    if (this.recorder && this.recorder.state === 'recording') {
      console.log('📹 録画停止処理');
      this.recorder.stop();
    }
  }

  // 強制停止
  forceStop(reason = 'UNKNOWN') {
    console.error('🚨 LoopController 強制停止:', reason);
    
    // アニメーション停止
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // タイマー停止
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // 録画停止
    if (this.recorder) {
      try {
        if (this.recorder.state === 'recording') {
          this.recorder.stop();
        }
      } catch (error) {
        console.error('録画停止エラー:', error);
      }
    }
    
    // コールバック実行
    if (this.forceStopCallback) {
      this.forceStopCallback(reason);
    }
    
    this.reset();
  }

  // リセット
  reset() {
    this.isActive = false;
    this.startTime = null;
    this.animationId = null;
    this.timeoutId = null;
    this.recorder = null;
    this.forceStopCallback = null;
  }

  // デバッグ情報
  getDebugInfo() {
    return {
      isActive: this.isActive,
      elapsedTime: this.getElapsedTime(),
      hasAnimation: !!this.animationId,
      hasTimeout: !!this.timeoutId,
      recorderState: this.recorder?.state || 'none'
    };
  }
}

// シングルトンインスタンス
const loopController = new LoopController();
export default loopController;