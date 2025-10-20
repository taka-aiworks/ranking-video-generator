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
  
  // デフォルト: 動的にVoiceVOXサーバーURLを決定（他のデバイスからアクセス可能）
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const serverHost = isLocalhost ? 'localhost' : window.location.hostname;
  return `http://${serverHost}:50021`;
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
    const response = await fetch(url);
    if (!response.ok) {
      console.error('❌ VoiceVOXサーバー応答エラー:', response.status);
      return false;
    }
    // コンテンツがJSONか検証（ngrokランディングを弾く）
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.error('❌ 予期しない応答（JSONではありません）。ngrokのランディングを解除してください:', url);
      return false;
    }
    await response.json();
    console.log('✅ VoiceVOXサーバー接続成功:', getBaseUrl());
    return true;
  } catch (error) {
    console.error('❌ VoiceVOXサーバー接続エラー:', error);
    console.log('💡 VoiceVOXが起動していない可能性があります。');
    console.log('   1. VoiceVOXアプリを起動してください');
    console.log('   2. サーバー設定で「外部連携を許可」をONにしてください');
    console.log('   3. ポート50021で起動していることを確認してください');
    return false;
  }
}

async function fetchJson(url, options) {
	const res = await fetch(url, options);
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

	const audioQuery = await fetchJson(
		`${getBaseUrl()}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerStyleId}`,
		{ method: 'POST' }
	);

	const mergedQuery = { ...audioQuery, ...queryOverrides };

	const res = await fetch(`${getBaseUrl()}/synthesis?speaker=${speakerStyleId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(mergedQuery)
	});

	if (!res.ok) {
		throw new Error(`VOICEVOX synthesis failed: ${res.status}`);
	}

	return await res.blob();
}

export const voicevoxTtsService = {
	fetchSpeakers,
	synthesizeToBlob
};

export default voicevoxTtsService;






