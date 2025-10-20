// server/index.js
// Expressサーバー - いらすとやスクレイピングAPI

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import IrasutoyaScraper from './irasutoyaScraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// 静的ファイル配信（ローカル画像）
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// スクレイパーインスタンス
const scraper = new IrasutoyaScraper();

// 初期化
scraper.initialize();

// ===== API エンドポイント =====

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'いらすとやスクレイピングサーバー稼働中' });
});

// 全カテゴリをスクレイピング
app.post('/api/scrape/all', async (req, res) => {
  try {
    console.log('🚀 全カテゴリスレイピング開始（API経由）');
    const results = await scraper.scrapeAllCategories();
    
    res.json({
      success: true,
      message: '全カテゴリスレイピング完了',
      results: results
    });
  } catch (error) {
    console.error('❌ スクレイピングエラー:', error);
    res.status(500).json({
      success: false,
      message: 'スクレイピングエラー',
      error: error.message
    });
  }
});

// 特定カテゴリをスクレイピング
app.post('/api/scrape/category/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { maxPages = 3 } = req.body;
    
    const categories = scraper.getCategoryUrls();
    const category = categories.find(cat => cat.name === categoryName);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `カテゴリ「${categoryName}」が見つかりません`
      });
    }
    
    console.log(`🎯 カテゴリ「${categoryName}」スクレイピング開始（API経由）`);
    const newImages = await scraper.scrapeCategory(categoryName, category.url, maxPages);
    
    res.json({
      success: true,
      message: `カテゴリ「${categoryName}」スクレイピング完了`,
      newImagesCount: newImages.length,
      newImages: newImages
    });
  } catch (error) {
    console.error('❌ カテゴリスレイピングエラー:', error);
    res.status(500).json({
      success: false,
      message: 'カテゴリスレイピングエラー',
      error: error.message
    });
  }
});

// キーワードで画像を検索
app.get('/api/images/search', async (req, res) => {
  try {
    const { keyword, limit = 20 } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'キーワードが必要です'
      });
    }
    
    console.log(`🔍 画像検索: "${keyword}"`);
    const images = await scraper.searchImages(keyword, parseInt(limit));
    
    res.json({
      success: true,
      keyword: keyword,
      count: images.length,
      images: images
    });
  } catch (error) {
    console.error('❌ 画像検索エラー:', error);
    res.status(500).json({
      success: false,
      message: '画像検索エラー',
      error: error.message
    });
  }
});

// 全画像を取得
app.get('/api/images/all', async (req, res) => {
  try {
    const { limit } = req.query;
    const images = await scraper.getAllImages();
    
    const limitedImages = limit ? images.slice(0, parseInt(limit)) : images;
    
    res.json({
      success: true,
      totalCount: images.length,
      count: limitedImages.length,
      images: limitedImages
    });
  } catch (error) {
    console.error('❌ 画像取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '画像取得エラー',
      error: error.message
    });
  }
});

// メタデータを取得
app.get('/api/metadata', async (req, res) => {
  try {
    const metadata = await scraper.loadMetadata();
    
    res.json({
      success: true,
      metadata: {
        totalImages: metadata.images.length,
        lastUpdated: metadata.lastUpdated,
        categories: [...new Set(metadata.images.map(img => img.category))]
      }
    });
  } catch (error) {
    console.error('❌ メタデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'メタデータ取得エラー',
      error: error.message
    });
  }
});

// カテゴリ一覧を取得
app.get('/api/categories', (req, res) => {
  try {
    const categories = scraper.getCategoryUrls();
    
    res.json({
      success: true,
      categories: categories.map(cat => ({
        name: cat.name,
        url: cat.url
      }))
    });
  } catch (error) {
    console.error('❌ カテゴリ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'カテゴリ一覧取得エラー',
      error: error.message
    });
  }
});

// メタデータをクリーンアップ
app.post('/api/cleanup', async (req, res) => {
  try {
    console.log('🧹 メタデータクリーンアップ開始（API経由）');
    const cleanedImages = await scraper.cleanupMetadata();
    
    res.json({
      success: true,
      message: 'メタデータクリーンアップ完了',
      cleanedCount: cleanedImages.length
    });
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error);
    res.status(500).json({
      success: false,
      message: 'クリーンアップエラー',
      error: error.message
    });
  }
});

// ===== 定期実行スケジューラー =====

// 毎日午前3時に自動スクレイピング（新着画像チェック）
cron.schedule('0 3 * * *', async () => {
  console.log('⏰ 定期スクレイピング開始（毎日午前3時）');
  try {
    const results = await scraper.scrapeAllCategories();
    console.log('✅ 定期スクレイピング完了:', results);
  } catch (error) {
    console.error('❌ 定期スクレイピングエラー:', error);
  }
}, {
  timezone: 'Asia/Tokyo'
});

// 毎週日曜日午前2時に全カテゴリの深いスクレイピング
cron.schedule('0 2 * * 0', async () => {
  console.log('⏰ 週次深いスクレイピング開始（毎週日曜午前2時）');
  try {
    const results = await scraper.scrapeAllCategories();
    console.log('✅ 週次深いスクレイピング完了:', results);
  } catch (error) {
    console.error('❌ 週次深いスクレイピングエラー:', error);
  }
}, {
  timezone: 'Asia/Tokyo'
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 いらすとやスクレイピングサーバー起動`);
  console.log(`📍 ポート: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📁 画像保存先: ${path.join(__dirname, '../public/images/irasutoya')}`);
});

export default app;
