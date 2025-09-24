// VideoTemplates.js - 動画テンプレート定義とレンダリングロジック

export const TemplateConfig = {
  ranking: {
    id: 'ranking',
    name: 'ランキング',
    description: 'おすすめ商品TOP5-10',
    shortConfig: {
      duration: 45,
      maxItems: 3,
      structure: ['intro', 'ranking', 'cta'],
      sections: {
        intro: { duration: 0.2, name: 'イントロ' },
        ranking: { duration: 0.7, name: 'ランキング発表' },
        cta: { duration: 0.1, name: '行動喚起' }
      }
    },
    mediumConfig: {
      duration: 300,
      maxItems: 10,
      structure: ['intro', 'criteria', 'ranking', 'details', 'conclusion'],
      sections: {
        intro: { duration: 0.15, name: 'イントロダクション' },
        criteria: { duration: 0.15, name: '選定基準説明' },
        ranking: { duration: 0.5, name: 'ランキング詳細' },
        details: { duration: 0.15, name: '詳細解説' },
        conclusion: { duration: 0.05, name: 'まとめ' }
      }
    }
  },

  comparison: {
    id: 'comparison',
    name: '比較(VS)',
    description: '商品・サービス比較',
    shortConfig: {
      duration: 50,
      maxItems: 2,
      structure: ['intro', 'item1', 'item2', 'comparison', 'winner'],
      sections: {
        intro: { duration: 0.2, name: 'イントロ' },
        item1: { duration: 0.25, name: '商品A紹介' },
        item2: { duration: 0.25, name: '商品B紹介' },
        comparison: { duration: 0.2, name: '比較' },
        winner: { duration: 0.1, name: '結論' }
      }
    },
    mediumConfig: {
      duration: 360,
      maxItems: 2,
      structure: ['intro', 'overview', 'item1_detail', 'item2_detail', 'comparison', 'verdict'],
      sections: {
        intro: { duration: 0.1, name: 'イントロ' },
        overview: { duration: 0.15, name: '概要説明' },
        item1_detail: { duration: 0.3, name: '商品A詳細' },
        item2_detail: { duration: 0.3, name: '商品B詳細' },
        comparison: { duration: 0.1, name: '総合比較' },
        verdict: { duration: 0.05, name: '最終判定' }
      }
    }
  },

  tutorial: {
    id: 'tutorial',
    name: 'チュートリアル',
    description: 'How-to・使い方解説',
    shortConfig: {
      duration: 40,
      maxItems: 3,
      structure: ['problem', 'solution', 'steps', 'result'],
      sections: {
        problem: { duration: 0.2, name: '問題提起' },
        solution: { duration: 0.2, name: '解決策提示' },
        steps: { duration: 0.5, name: '手順解説' },
        result: { duration: 0.1, name: '結果' }
      }
    },
    mediumConfig: {
      duration: 280,
      maxItems: 5,
      structure: ['intro', 'overview', 'preparation', 'steps', 'tips', 'conclusion'],
      sections: {
        intro: { duration: 0.1, name: 'イントロ' },
        overview: { duration: 0.15, name: '全体概要' },
        preparation: { duration: 0.15, name: '事前準備' },
        steps: { duration: 0.45, name: '詳細手順' },
        tips: { duration: 0.1, name: 'コツ・注意点' },
        conclusion: { duration: 0.05, name: 'まとめ' }
      }
    }
  },

  news: {
    id: 'news',
    name: 'トレンドニュース',
    description: '最新情報・話題解説',
    shortConfig: {
      duration: 35,
      maxItems: 3,
      structure: ['breaking', 'key_points', 'impact'],
      sections: {
        breaking: { duration: 0.3, name: '速報' },
        key_points: { duration: 0.5, name: 'ポイント解説' },
        impact: { duration: 0.2, name: '影響・今後' }
      }
    },
    mediumConfig: {
      duration: 240,
      maxItems: 5,
      structure: ['intro', 'background', 'details', 'analysis', 'future'],
      sections: {
        intro: { duration: 0.1, name: 'ニュース概要' },
        background: { duration: 0.2, name: '背景説明' },
        details: { duration: 0.4, name: '詳細内容' },
        analysis: { duration: 0.2, name: '専門分析' },
        future: { duration: 0.1, name: '今後の展望' }
      }
    }
  }
};

// テンプレート別描画クラス
export class TemplateRenderer {
  constructor(format, template, videoEngine) {
    this.format = format; // 'short' or 'medium'
    this.template = template;
    this.videoEngine = videoEngine;
    this.config = TemplateConfig[template];
    this.formatConfig = format === 'short' ? this.config.shortConfig : this.config.mediumConfig;
  }

  // セクション描画の振り分け
  renderSection(ctx, section, progress, data, canvasConfig) {
    switch (section) {
      case 'intro':
        return this.renderIntro(ctx, progress, data, canvasConfig);
      case 'ranking':
        return this.renderRanking(ctx, progress, data, canvasConfig);
      case 'comparison':
        return this.renderComparison(ctx, progress, data, canvasConfig);
      case 'steps':
        return this.renderSteps(ctx, progress, data, canvasConfig);
      case 'breaking':
        return this.renderBreaking(ctx, progress, data, canvasConfig);
      case 'cta':
        return this.renderCTA(ctx, progress, data, canvasConfig);
      case 'conclusion':
        return this.renderConclusion(ctx, progress, data, canvasConfig);
      default:
        return this.renderGeneric(ctx, section, progress, data, canvasConfig);
    }
  }

  // イントロ描画
  renderIntro(ctx, progress, data, config) {
    const { width, height } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    // アニメーション効果
    const scale = 0.8 + Math.sin(progress * Math.PI * 2) * 0.2;
    const fadeIn = Math.min(progress * 2, 1);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.globalAlpha = fadeIn;

    // タイトル
    ctx.fillStyle = '#ffffff';
    ctx.font = this.format === 'short' ? 'bold 60px Arial' : 'bold 100px Arial';
    ctx.textAlign = 'center';
    
    const title = data?.title || this.getDefaultTitle();
    const titleLines = this.wrapText(ctx, title, width * 0.8);
    
    titleLines.forEach((line, index) => {
      ctx.fillText(line, 0, -50 + index * (this.format === 'short' ? 70 : 120));
    });

    // サブタイトル
    ctx.fillStyle = '#ff6b6b';
    ctx.font = this.format === 'short' ? 'bold 40px Arial' : 'bold 70px Arial';
    const subtitle = this.getSubtitle(data);
    ctx.fillText(subtitle, 0, 100);

    ctx.restore();
  }

  // ランキング描画
  renderRanking(ctx, progress, data, config) {
    const { width, height } = config;
    const items = data?.items || [];
    const maxItems = this.formatConfig.maxItems;
    const itemDuration = 1 / maxItems;
    const currentItemIndex = Math.floor(progress * maxItems);
    const itemProgress = (progress * maxItems) % 1;

    if (currentItemIndex < items.length) {
      const item = items[currentItemIndex];
      this.renderRankingItem(ctx, item, currentItemIndex + 1, itemProgress, config);
    }
  }

  // ランキングアイテム描画
  renderRankingItem(ctx, item, rank, progress, config) {
    const { width, height } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    // 背景パネル
    const panelWidth = width * 0.9;
    const panelHeight = this.format === 'short' ? height * 0.5 : height * 0.6;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    // スライドインアニメーション
    const slideOffset = (1 - Math.min(progress * 2, 1)) * width;
    
    ctx.save();
    ctx.translate(slideOffset, 0);

    // パネル背景
    ctx.fillStyle = 'rgba(45, 55, 72, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // パネル境界線
    ctx.strokeStyle = this.getRankColor(rank);
    ctx.lineWidth = this.format === 'short' ? 4 : 8;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // ランク表示
    const rankScale = 1 + Math.sin(progress * Math.PI * 6) * 0.1;
    ctx.save();
    ctx.translate(centerX, centerY - 80);
    ctx.scale(rankScale, rankScale);

    ctx.fillStyle = this.getRankColor(rank);
    ctx.font = this.format === 'short' ? 'bold 100px Arial' : 'bold 150px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${rank}位`, 0, 0);
    ctx.restore();

    // アイテム名
    ctx.fillStyle = '#ffffff';
    ctx.font = this.format === 'short' ? 'bold 36px Arial' : 'bold 50px Arial';
    ctx.textAlign = 'center';
    const itemName = item?.name || `商品${rank}`;
    const nameLines = this.wrapText(ctx, itemName, panelWidth * 0.8);
    
    nameLines.forEach((line, index) => {
      ctx.fillText(line, centerX, centerY + 60 + index * 45);
    });

    // 価格・評価など
    if (item?.price || item?.rating) {
      ctx.font = this.format === 'short' ? '24px Arial' : '32px Arial';
      ctx.fillStyle = '#4ecdc4';
      let infoText = '';
      if (item.price) infoText += `¥${item.price.toLocaleString()}`;
      if (item.rating) infoText += ` ⭐${item.rating}`;
      
      ctx.fillText(infoText, centerX, centerY + 120);
    }

    ctx.restore();

    // 進行表示
    this.renderProgress(ctx, rank, maxItems, config);
  }

  // 比較描画
  renderComparison(ctx, progress, data, config) {
    const { width, height } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    if (!data?.items || data.items.length < 2) return;

    const item1 = data.items[0];
    const item2 = data.items[1];

    // VS表示
    ctx.fillStyle = '#ff6b6b';
    ctx.font = this.format === 'short' ? 'bold 80px Arial' : 'bold 120px Arial';
    ctx.textAlign = 'center';
    
    const vsScale = 1 + Math.sin(progress * Math.PI * 4) * 0.2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(vsScale, vsScale);
    ctx.fillText('VS', 0, 0);
    ctx.restore();

    // 商品A (左側)
    ctx.fillStyle = '#4ecdc4';
    ctx.font = this.format === 'short' ? 'bold 32px Arial' : 'bold 48px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(item1?.name || '商品A', centerX - 120, centerY - 60);

    // 商品B (右側)
    ctx.fillStyle = '#ffa500';
    ctx.textAlign = 'left';
    ctx.fillText(item2?.name || '商品B', centerX + 120, centerY - 60);
  }

  // ステップ描画
  renderSteps(ctx, progress, data, config) {
    const { width, height } = config;
    const steps = data?.steps || [];
    const stepDuration = 1 / steps.length;
    const currentStep = Math.floor(progress * steps.length);
    const stepProgress = (progress * steps.length) % 1;

    if (currentStep < steps.length) {
      const step = steps[currentStep];
      this.renderStep(ctx, step, currentStep + 1, stepProgress, config);
    }
  }

  // ステップアイテム描画
  renderStep(ctx, step, stepNumber, progress, config) {
    const { width, height } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    // ステップ番号
    ctx.fillStyle = '#ffa500';
    ctx.font = this.format === 'short' ? 'bold 60px Arial' : 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`STEP ${stepNumber}`, centerX, centerY - 80);

    // ステップ内容
    ctx.fillStyle = '#ffffff';
    ctx.font = this.format === 'short' ? 'bold 28px Arial' : 'bold 40px Arial';
    const stepText = step?.text || step || `ステップ${stepNumber}`;
    const textLines = this.wrapText(ctx, stepText, width * 0.8);
    
    textLines.forEach((line, index) => {
      ctx.fillText(line, centerX, centerY + index * 45);
    });
  }

  // 速報描画
  renderBreaking(ctx, progress, data, config) {
    const { width, height } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    // 点滅効果
    const flash = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;
    ctx.globalAlpha = 0.7 + flash * 0.3;

    // BREAKING表示
    ctx.fillStyle = '#ff4444';
    ctx.font = this.format === 'short' ? 'bold 50px Arial' : 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🚨 BREAKING NEWS 🚨', centerX, centerY - 100);

    // ニュース内容
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = this.format === 'short' ? 'bold 32px Arial' : 'bold 48px Arial';
    const newsText = data?.title || ' 最新ニュース';
    const newsLines = this.wrapText(ctx, newsText, width * 0.9);
    
    newsLines.forEach((line, index) => {
      ctx.fillText(line, centerX, centerY + index * (this.format === 'short' ? 45 : 60));
    });
  }

  // CTA描画
  renderCTA(ctx, progress, data, config) {
    const { width, height } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    // 呼びかけメッセージ
    ctx.fillStyle = '#ffffff';
    ctx.font = this.format === 'short' ? 'bold 40px Arial' : 'bold 60px Arial';
    ctx.textAlign = 'center';
    
    const messages = this.format === 'short' 
      ? ['👍 いいね', '📱 フォロー', '🔄 シェア', 'お願いします！']
      : ['👍 高評価', '🔔 チャンネル登録', '🔄 シェア', 'お願いします！'];

    messages.forEach((message, index) => {
      const y = centerY - 100 + index * (this.format === 'short' ? 50 : 70);
      ctx.fillText(message, centerX, y);
    });

    // アニメーションハート
    const heartScale = 1 + Math.sin(progress * Math.PI * 6) * 0.3;
    ctx.save();
    ctx.translate(centerX, centerY + 100);
    ctx.scale(heartScale, heartScale);
    ctx.font = '80px Arial';
    ctx.fillText('❤️', 0, 0);
    ctx.restore();
  }

  // 結論描画
  renderConclusion(ctx, progress, data, config) {
    const { width, height } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.fillStyle = '#4ecdc4';
    ctx.font = this.format === 'short' ? 'bold 50px Arial' : 'bold 70px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('まとめ', centerX, centerY - 100);

    // 結論内容
    ctx.fillStyle = '#ffffff';
    ctx.font = this.format === 'short' ? 'bold 28px Arial' : 'bold 40px Arial';
    const conclusion = data?.conclusion || '今回の内容はいかがでしたか？';
    const conclusionLines = this.wrapText(ctx, conclusion, width * 0.8);
    
    conclusionLines.forEach((line, index) => {
      ctx.fillText(line, centerX, centerY + index * 45);
    });
  }

  // 汎用セクション描画
  renderGeneric(ctx, section, progress, data, config) {
    const { width, height } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.fillStyle = '#ffffff';
    ctx.font = this.format === 'short' ? 'bold 40px Arial' : 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(section.toUpperCase(), centerX, centerY);
  }

  // 進行表示
  renderProgress(ctx, current, total, config) {
    const { width, height } = config;
    
    ctx.fillStyle = '#4ecdc4';
    ctx.font = this.format === 'short' ? '24px Arial' : '32px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${current}/${total}`, width - 30, 50);
  }

  // ユーティリティメソッド
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  getRankColor(rank) {
    const colors = ['#ffd700', '#c0c0c0', '#cd7f32', '#4ecdc4', '#ff6b6b'];
    return colors[Math.min(rank - 1, colors.length - 1)];
  }

  getDefaultTitle() {
    switch (this.template) {
      case 'ranking': return 'おすすめランキング';
      case 'comparison': return '徹底比較';
      case 'tutorial': return '完全ガイド';
      case 'news': return '最新ニュース';
      default: return 'タイトル';
    }
  }

  getSubtitle(data) {
    const count = this.formatConfig.maxItems;
    switch (this.template) {
      case 'ranking': return `TOP${count}発表`;
      case 'comparison': return 'どっちがお得？';
      case 'tutorial': return 'やり方解説';
      case 'news': return '速報';
      default: return 'サブタイトル';
    }
  }
}

export default { TemplateConfig, TemplateRenderer };