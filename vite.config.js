import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // 環境変数を明示的に読み込み
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('🔧 Vite設定 - 環境変数確認:');
  console.log('- Mode:', mode);
  console.log('- CWD:', process.cwd());
  console.log('- VITE_OPENAI_API_KEY:', env.VITE_OPENAI_API_KEY ? '✅設定済み' : '❌未設定');

  return {
    plugins: [react()],
    
    // 環境変数を強制的に公開
    define: {
      'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY),
    },
    
    // 開発サーバー設定
    server: {
      port: 5173,
      open: true
    },
    
    // 環境変数ファイルの場所を明示
    envDir: './',
    
    // VITE_プレフィックスを確実に読み込み
    envPrefix: ['VITE_']
  }
})