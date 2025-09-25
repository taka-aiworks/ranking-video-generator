// src/services/video/loopController.js - タイムアウト修正版

class LoopController {
  constructor() {
    this.sessionActive = false;
    this.startTime = null;
    this.duration = 0;
    this.timeoutId = null;
    this.recorder = null;
    this.onForceStop = null;
    this.animationIds = [];
  }

  // セッション開始
  startSession(duration, recorder, onForceStop) {
    console.log(`🔒 LoopController セッション開始: ${duration}s`);
    
    this.sessionActive = true;
    this.startTime = Date.now();
    this.duration = duration;
    this.recorder = recorder;
    this.onForceStop = onForceStop;
    this.animationIds = [];

    // 🆕 タイムアウト時間を大幅延長（動画時間 + 余裕時間）
    const timeoutDuration = (duration + 10) * 1000; // 動画時間 + 10秒の余裕
    console.log(`⏰ タイムアウト設定: ${timeoutDuration / 1000}秒後`);

    this.timeoutId = setTimeout(() => {
      console.warn('⚠️ 制限時間到達 - 強制終了実行');
      this.forceStop('TIMEOUT');
    }, timeoutDuration);
  }

  // セッション状態確認
  isSessionActive() {
    return this.sessionActive;
  }

  // アニメーションID登録
  registerAnimation(animationId) {
    if (this.sessionActive && animationId) {
      this.animationIds.push(animationId);
    }
  }

  // 正常終了
  endSession() {
    if (!this.sessionActive) return;
    
    console.log('✅ LoopController セッション正常終了');
    
    this.sessionActive = false;
    
    // タイムアウトクリア
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // アニメーション停止
    this.animationIds.forEach(id => {
      if (id) cancelAnimationFrame(id);
    });
    this.animationIds = [];
    
    // 初期化
    this.recorder = null;
    this.onForceStop = null;
    this.startTime = null;
  }

  // 強制停止
  forceStop(reason) {
    if (!this.sessionActive) return;
    
    console.log(`🚨 LoopController 強制停止: ${reason}`);
    
    this.sessionActive = false;
    
    // タイムアウトクリア
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // アニメーション停止
    this.animationIds.forEach(id => {
      if (id) cancelAnimationFrame(id);
    });
    this.animationIds = [];
    
    // 録画停止
    if (this.recorder && this.recorder.state === 'recording') {
      try {
        this.recorder.stop();
      } catch (error) {
        console.warn('録画停止エラー:', error);
      }
    }
    
    // コールバック実行
    if (this.onForceStop) {
      this.onForceStop(reason);
    }
    
    // 初期化
    this.recorder = null;
    this.onForceStop = null;
    this.startTime = null;
  }

  // 経過時間取得
  getElapsedTime() {
    if (!this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  // 残り時間取得
  getRemainingTime() {
    const elapsed = this.getElapsedTime();
    return Math.max(this.duration - elapsed, 0);
  }

  // セッション情報
  getSessionInfo() {
    return {
      active: this.sessionActive,
      duration: this.duration,
      elapsed: this.getElapsedTime(),
      remaining: this.getRemainingTime(),
      animationCount: this.animationIds.length
    };
  }
}

// シングルトンインスタンス
const loopController = new LoopController();
export default loopController;