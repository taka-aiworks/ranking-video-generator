// src/services/tts/voicevox.js - VOICEVOX local TTS client (browser-side)

const VOICEVOX_BASE_URL = 'http://localhost:50021';

async function fetchJson(url, options) {
	const res = await fetch(url, options);
	if (!res.ok) {
		throw new Error(`VOICEVOX API Error: ${res.status}`);
	}
	return await res.json();
}

export async function fetchSpeakers() {
	return await fetchJson(`${VOICEVOX_BASE_URL}/speakers`);
}

export async function synthesizeToBlob(text, speakerStyleId, queryOverrides = {}) {
	if (!text || !text.trim()) {
		throw new Error('Text is empty');
	}
	if (typeof speakerStyleId !== 'number') {
		throw new Error('speakerStyleId must be a number (styles.id)');
	}

	const audioQuery = await fetchJson(
		`${VOICEVOX_BASE_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerStyleId}`,
		{ method: 'POST' }
	);

	const mergedQuery = { ...audioQuery, ...queryOverrides };

	const res = await fetch(`${VOICEVOX_BASE_URL}/synthesis?speaker=${speakerStyleId}`, {
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



