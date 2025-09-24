import React, { useRef, useState } from 'react';

class VideoGenerator {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.startTime = 0;
    this.animationId = null;
    
    this.rankingData = [];
    this.currentPhase = 'intro'; // intro, ranking, outro
    this.currentItemIndex = 0;
  }
  
  initialize(canvas, onStatusUpdate, onComplete) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onStatusUpdate = onStatusUpdate || (() => {});
    this.onComplete = onComplete || (() => {});
    
    // キャンバスサイズ設定
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    
    this.startDrawing();
  }
  
  startDrawing() {
    this.drawFrame();
  }
  
  drawFrame() {
    if (!this.ctx) return;
    
    const now = this.isRecording ? (Date.now() - this.startTime) / 1000 : 0;
    
    // 背景描画
    this.drawBackground();
    
    if (this.isRecording) {
      const timing = this.calculateTiming(this.recordingDuration);
      
      if (now < timing.introDuration) {
        // 導入部分
        this.currentPhase = 'intro';
        this.drawIntro(now / timing.introDuration);
        this.onStatusUpdate(`導入部分 (${now.toFixed(1)}s)`);
      } else if (now < this.recordingDuration - timing.outroDuration) {
        // ランキング部分
        this.currentPhase = 'ranking';
        const rankingTime = now - timing.introDuration;
        this.currentItemIndex = Math.floor(rankingTime / timing.itemDuration);
        const itemProgress = (rankingTime % timing.itemDuration) / timing.itemDuration;
        
        if (this.currentItemIndex < this.rankingData.length) {
          this.drawRankingItem(
            this.rankingData[this.currentItemIndex], 
            itemProgress,
            this.currentItemIndex
          );
          this.onStatusUpdate(`${this.rankingData[this.currentItemIndex]} (${now.toFixed(1)}s)`);
        }
      } else {
        // まとめ部分
        this.currentPhase = 'outro';
        const outroProgress = (now - (this.recordingDuration - timing.outroDuration)) / timing.outroDuration;
        this.drawOutro(outroProgress);
        this.onStatusUpdate(`まとめ部分 (${now.toFixed(1)}s)`);
      }
      
      // プログレスバー
      this.drawProgressBar(now, this.recordingDuration);
    } else {
      // 待機中の表示
      this.drawWaitingScreen();
    }
    
    this.animationId = requestAnimationFrame(() => this.drawFrame());
  }
  
  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // デコレーション
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      this.ctx.beginPath();
      this.ctx.arc(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height,
        50 + Math.random() * 100,
        0,
        Math.PI * 2
      );
      this.ctx.stroke();
    }
  }
  
  drawWaitingScreen() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 120px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ランキング動画準備中...', this.canvas.width / 2, this.canvas.height / 2);
  }
  
  drawIntro(progress) {
    const scale = 0.8 + Math.sin(progress * Math.PI * 2) * 0.2;
    
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(scale, scale);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 150px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('おすすめランキング', 0, -100);
    
    this.ctx.font = 'bold 100px Arial';
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.fillText(`TOP ${this.rankingData.length}`, 0, 50);
    
    this.ctx.font = '80px Arial';
    this.ctx.fillStyle = '#4ecdc4';
    this.ctx.fillText('発表します！', 0, 150);
    
    this.ctx.restore();
  }
  
  drawRankingItem(item, progress, index) {
    // 項目分離
    const parts = item.split(':');
    const rank = parts[0].trim();
    const title = parts[1] ? parts[1].trim() : '';
    
    // 背景パネル
    this.ctx.fillStyle = 'rgba(45, 55, 72, 0.9)';
    this.ctx.fillRect(100, 150, this.canvas.width - 200, 700);
    
    this.ctx.strokeStyle = '#4ecdc4';
    this.ctx.lineWidth = 8;
    this.ctx.strokeRect(100, 150, this.canvas.width - 200, 700);
    
    // ランキング表示（アニメーション）
    const rankScale = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, 400);
    this.ctx.scale(rankScale, rankScale);
    
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.font = 'bold 250px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(rank, 0, 0);
    
    this.ctx.restore();
    
    // タイトル
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 100px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, this.canvas.width / 2, 650);
    
    // エフェクト
    if (progress < 0.3) {
      const effectAlpha = 1 - progress * 3;
      this.ctx.fillStyle = `rgba(78, 205, 196, ${effectAlpha})`;
      this.ctx.font = '120px Arial';
      this.ctx.fillText('✨', this.canvas.width / 2 - 300, 400);
      this.ctx.fillText('✨', this.canvas.width / 2 + 300, 400);
    }
    
    // 番号表示（右上）
    this.ctx.fillStyle = '#4ecdc4';
    this.ctx.font = '60px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${index + 1}/${this.rankingData.length}`, this.canvas.width - 150, 250);
  }
  
  drawOutro(progress) {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 120px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ありがとうございました！', this.canvas.width / 2, 400);
    
    this.ctx.font = '80px Arial';
    this.ctx.fillStyle = '#4ecdc4';
    this.ctx.fillText('チャンネル登録・高評価お願いします！', this.canvas.width / 2, 520);
    
    // 回転ハート
    const rotation = progress * Math.PI * 4;
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, 700);
    this.ctx.rotate(rotation);
    this.ctx.font = '100px Arial';
    this.ctx.fillText('❤️', 0, 0);
    this.ctx.restore();
  }
  
  drawProgressBar(currentTime, totalTime) {
    const progress = currentTime / totalTime;
    const barWidth = this.canvas.width * 0.8;
    const barHeight = 20;
    const x = (this.canvas.width - barWidth) / 2;
    const y = this.canvas.height - 80;
    
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(x, y, barWidth, barHeight);
    
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.fillRect(x, y, barWidth * progress, barHeight);
  }
  
  calculateTiming(totalDuration) {
    const introDuration = Math.min(5, totalDuration * 0.2);
    const outroDuration = Math.min(5, totalDuration * 0.2);
    const rankingDuration = totalDuration - introDuration - outroDuration;
    const itemDuration = rankingDuration / this.rankingData.length;
    
    return { introDuration, outroDuration, rankingDuration, itemDuration };
  }
  
  async generateVideo(rankingData, duration) {
    this.rankingData = rankingData;
    this.recordingDuration = duration;
    this.chunks = [];
    
    this.onStatusUpdate('録画準備中...');
    
    const stream = this.canvas.captureStream(30);
    const options = {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 2000000 // 2Mbps
    };
    
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      delete options.mimeType;
    }
    
    this.mediaRecorder = new MediaRecorder(stream, options);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      
      this.onStatusUpdate('完了！');
      this.onComplete({ url, sizeMB, blob });
    };
    
    this.mediaRecorder.start(100);
    this.startTime = Date.now();
    this.isRecording = true;
    
    this.onStatusUpdate(`録画中... (${duration}秒)`);
    
    setTimeout(() => {
      this.stopRecording();
    }, duration * 1000);
  }
  
  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    
    this.isRecording = false;
    this.onStatusUpdate('録画停止中...');
    
    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }
  
  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.stopRecording();
  }
}

// React コンポーネント
const VideoGeneratorComponent = ({ onVideoGenerated, onStatusUpdate }) => {
  const canvasRef = useRef(null);
  const videoGeneratorRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  React.useEffect(() => {
    if (canvasRef.current && !isInitialized) {
      videoGeneratorRef.current = new VideoGenerator();
      videoGeneratorRef.current.initialize(
        canvasRef.current,
        onStatusUpdate,
        onVideoGenerated
      );
      setIsInitialized(true);
    }

    return () => {
      if (videoGeneratorRef.current) {
        videoGeneratorRef.current.cleanup();
      }
    };
  }, [isInitialized, onStatusUpdate, onVideoGenerated]);

  const generateVideo = (rankingData, duration = 15) => {
    if (videoGeneratorRef.current) {
      videoGeneratorRef.current.generateVideo(rankingData, duration);
    }
  };

  // generateVideo を外部から呼べるようにする
  React.useImperativeHandle(React.forwardRef(), () => ({
    generateVideo
  }));

  return (
    <div className="w-full max-w-4xl mx-auto">
      <canvas
        ref={canvasRef}
        className="w-full h-auto border-2 border-gray-300 rounded-lg"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
};

export default VideoGeneratorComponent;