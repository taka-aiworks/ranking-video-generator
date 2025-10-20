// lightweight on-screen logger (uses window.__progressLog if present)
const log = (msg) => {
  console.log(msg);
  if (typeof window !== 'undefined' && typeof window.__progressLog === 'function') {
    try { window.__progressLog(msg); } catch (_) {}
  }
};
// src/services/tts/voicevox.js - VOICEVOX local TTS client (browser-side)

// VoiceVOXサーバーURLを取得（設定可能）
function normalizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw.trim();
  // 末尾スラッシュ除去
  if (url.endsWith('/')) url = url.slice(0, -1);
  // プロトコル補完
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}
const getVoiceVoxUrl = () => {
  // ローカルストレージから設定されたURLを取得
  const savedUrl = localStorage.getItem('voicevox_url');
  if (savedUrl) {
    return normalizeUrl(savedUrl);
  }
  
  // デフォルト: 常にローカルホストを使用（VoiceVOXはローカルで動いている）
  return 'http://localhost:50021';
};

// 常に最新のURLを参照するためのヘルパー
const getBaseUrl = () => getCurrentVoiceVoxUrl();

// VoiceVOXのURLを設定する関数
export function setVoiceVoxUrl(url) {
  localStorage.setItem('voicevox_url', url);
  console.log('VoiceVOX URL設定:', url);
}

// VoiceVOXのURLを取得する関数
export function getCurrentVoiceVoxUrl() {
  const savedUrl = localStorage.getItem('voicevox_url');
  if (savedUrl) {
    return savedUrl;
  }
  
  // デフォルト: 動的にVoiceVOXサーバーURLを決定
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const serverHost = isLocalhost ? 'localhost' : window.location.hostname;
  return `http://${serverHost}:50021`;
}

// VoiceVOXサーバーの状態を確認
export async function checkVoiceVoxStatus() {
  try {
    const url = `${getBaseUrl()}/speakers`;
    log(`VOICEVOX 接続確認: GET ${url}`);
    const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
    if (!response.ok) {
      console.error('❌ VoiceVOXサーバー応答エラー:', response.status);
      log(`❌ 応答エラー status=${response.status}`);
      return false;
    }
    // コンテンツがJSONか検証（ngrokランディングを弾く）
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.error('❌ 予期しない応答（JSONではありません）。ngrokのランディングを解除してください:', url);
      log('❌ JSON以外の応答（ngrokランディング未解除の可能性）');
      return false;
    }
    await response.json();
    console.log('✅ VoiceVOXサーバー接続成功:', getBaseUrl());
    log('✅ 接続成功');
    return true;
  } catch (error) {
    console.error('❌ VoiceVOXサーバー接続エラー:', error);
    log(`❌ 接続エラー: ${String(error)}`);
    console.log('💡 VoiceVOXが起動していない可能性があります。');
    console.log('   1. VoiceVOXアプリを起動してください');
    console.log('   2. サーバー設定で「外部連携を許可」をONにしてください');
    console.log('   3. ポート50021で起動していることを確認してください');
    return false;
  }
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: { 'ngrok-skip-browser-warning': 'true', ...(options.headers || {}) }
    });
	if (!res.ok) {
		throw new Error(`VOICEVOX API Error: ${res.status}`);
	}
	return await res.json();
}

export async function fetchSpeakers() {
	return await fetchJson(`${getBaseUrl()}/speakers`);
}

export async function synthesizeToBlob(text, speakerStyleId, queryOverrides = {}) {
	if (!text || !text.trim()) {
		throw new Error('Text is empty');
	}
	if (typeof speakerStyleId !== 'number') {
		throw new Error('speakerStyleId must be a number (styles.id)');
	}

	log(`🗣️ 合成開始: speaker=${speakerStyleId}, length=${text.length}`);
	// リトライ付きでaudio_query取得
	let audioQuery;
	for (let i = 0; i < 3; i++) {
		try {
			audioQuery = await fetchJson(
				`${getBaseUrl()}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerStyleId}`,
				{ method: 'POST' }
			);
			break;
		} catch (error) {
			log(`⚠️ audio_query リトライ ${i + 1}/3: ${error.message}`);
			if (i === 2) throw error;
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	}
	log('✅ audio_query 取得');

	const mergedQuery = { ...audioQuery, ...queryOverrides };

	log('🎛️ synthesis リクエスト送信');
	// リトライ付きでsynthesis実行
	let res;
	for (let i = 0; i < 3; i++) {
		try {
			res = await fetch(`${getBaseUrl()}/synthesis?speaker=${speakerStyleId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
				body: JSON.stringify(mergedQuery)
			});
			if (res.ok) break;
			throw new Error(`HTTP ${res.status}`);
		} catch (error) {
			log(`⚠️ synthesis リトライ ${i + 1}/3: ${error.message}`);
			if (i === 2) throw error;
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}

	if (!res.ok) {
		log(`❌ synthesis 応答エラー status=${res.status}`);
		throw new Error(`VOICEVOX synthesis failed: ${res.status}`);
	}
	log('✅ synthesis 成功、Blob 受信');
	return await res.blob();
}

export const voicevoxTtsService = {
	fetchSpeakers,
	synthesizeToBlob
};

export default voicevoxTtsService;






