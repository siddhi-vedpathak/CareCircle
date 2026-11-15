/**
 * CareCircle Audio & Speech Synthesis Engine
 * - Two-tone gentle synthesizer chime via Web Audio API
 * - Backend Google Cloud TTS (POST /api/tts) with MP3 base64 playback
 * - IndexedDB client-side audio caching for offline playback
 * - Background prefetching for next reminder
 * - Resilient browser SpeechSynthesis fallback with sentence queue and keep-alive resume()
 * - Console reporting of active voice path
 */

import { buildSpokenReminderSentence, buildSpokenCelebrationSentence } from './i18n.js';

let audioCtx = null;
let isAudioUnlocked = false;
let keepAliveTimer = null;

/**
 * Initialize Web Audio Context
 */
export function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        isAudioUnlocked = true;
      });
    } else {
      isAudioUnlocked = true;
    }
  } catch (e) {
    // Ignore
  }
  return isAudioUnlocked;
}

export function isAudioReady() {
  return isAudioUnlocked;
}

/**
 * Synthesizes a calming two-tone bell chime.
 * Returns a promise that resolves when the chime finishes (~1.3s).
 */
export function playGentleChime() {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      const now = ctx.currentTime;

      // Tone 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.9);

      // Tone 2: G5 (783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.22);
      gain2.gain.setValueAtTime(0, now + 0.22);
      gain2.gain.linearRampToValueAtTime(0.22, now + 0.27);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 1.3);

      setTimeout(() => resolve(), 1300);
    } catch (err) {
      resolve();
    }
  });
}

/**
 * IndexedDB audio cache for offline playback
 */
const DB_NAME = 'CareCircleAudioCache';
const DB_STORE = 'audio_clips';

function openAudioDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function getCachedAudioFromDb(key) {
  try {
    const db = await openAudioDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function setCachedAudioInDb(key, base64Audio) {
  try {
    const db = await openAudioDb();
    if (!db) return;
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.put(base64Audio, key);
  } catch (e) {
    // Ignore cache write errors
  }
}

/**
 * Fetch TTS audio from /api/tts backend endpoint with IndexedDB caching
 */
export async function fetchTtsAudio(text, lang = 'mr-IN') {
  const cacheKey = `${lang}:${text.trim()}`;

  // 1. Check client IndexedDB cache
  const idbCached = await getCachedAudioFromDb(cacheKey);
  if (idbCached) {
    return { audioBase64: idbCached, voicePath: 'indexeddb-cache' };
  }

  // 2. Query /api/tts endpoint
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.audioContent) {
      // Cache in IndexedDB for offline access
      await setCachedAudioInDb(cacheKey, data.audioContent);
      return {
        audioBase64: data.audioContent,
        voicePath: data.cached ? 'gcp-cache' : 'gcp-tts'
      };
    }
  } catch (err) {
    // Network or server error - fallback to browser speech synthesis
  }
  return null;
}

/**
 * Pre-fetch audio in background for the next upcoming reminder
 */
export async function prefetchNextReminderAudio(profile, meds, language = 'mr') {
  if (!meds || meds.length === 0) return;
  const langCode = language === 'mr' ? 'mr-IN' : (language === 'hi' ? 'hi-IN' : 'en-IN');
  const text = buildSpokenReminderSentence(profile, meds, language);
  try {
    await fetchTtsAudio(text, langCode);
  } catch (e) {}
}

/**
 * Play MP3 base64 via Audio element
 */
export function playAudioElement(base64Mp3) {
  return new Promise((resolve) => {
    try {
      const src = base64Mp3.startsWith('data:') ? base64Mp3 : `data:audio/mp3;base64,${base64Mp3}`;
      const audio = new Audio(src);
      audio.onended = () => resolve(true);
      audio.onerror = (e) => {
        console.warn('[CareCircle Audio] Audio element playback error:', e);
        resolve(false);
      };
      audio.play().catch((err) => {
        console.warn('[CareCircle Audio] Playback failed/blocked:', err);
        resolve(false);
      });
    } catch (err) {
      resolve(false);
    }
  });
}

/**
 * SpeechSynthesis keep-alive helper (prevents Chrome 15-second speech cutoff bug)
 */
function startKeepAlive() {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

/**
 * Ensure speech voices are loaded
 */
function getSpeechVoices() {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    let voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      resolve(voices);
      return;
    }
    const handler = () => {
      voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(voices || []);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices() || []);
    }, 400);
  });
}

export async function checkVoiceAvailability() {
  const voices = await getSpeechVoices();
  const hasMr = voices.some(v => v.lang.toLowerCase().includes('mr'));
  const hasHi = voices.some(v => v.lang.toLowerCase().includes('hi'));
  const hasEn = voices.some(v => v.lang.toLowerCase().includes('en'));
  return { hasMr, hasHi, hasEn, total: voices.length };
}

async function selectBestVoice(targetLang = 'mr') {
  const voices = await getSpeechVoices();
  let matched = null;
  if (targetLang === 'mr') {
    matched = voices.find(v => v.lang.toLowerCase().includes('mr')) ||
              voices.find(v => v.lang.toLowerCase().includes('hi'));
  } else if (targetLang === 'hi') {
    matched = voices.find(v => v.lang.toLowerCase().includes('hi'));
  }
  if (!matched) {
    matched = voices.find(v => v.lang.includes('IN') || v.lang.toLowerCase().startsWith('en'));
  }
  if (!matched && voices.length > 0) {
    matched = voices[0];
  }
  return matched;
}

/**
 * Resilient Browser SpeechSynthesis fallback with sentence queue and keep-alive
 */
export async function speakWithBrowserTts(text, targetLang = 'mr', rate = 0.86) {
  if (!('speechSynthesis' in window) || !text) return;

  // Always cancel ongoing speech first
  window.speechSynthesis.cancel();
  startKeepAlive();

  const voice = await selectBestVoice(targetLang);
  const langCode = targetLang === 'mr' ? 'mr-IN' : (targetLang === 'hi' ? 'hi-IN' : 'en-IN');

  const rawSentences = text.split(/(?<=[.।!?])\s+/);
  const sentences = rawSentences.map(s => s.trim()).filter(Boolean);

  for (const sentence of sentences) {
    await new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = langCode;
      utterance.rate = rate;
      utterance.pitch = 1.04;
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn('[CareCircle Audio] Utterance error:', e);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  stopKeepAlive();
}

/**
 * Master spoken sentence dispatcher:
 * 1. Attempts Google Cloud TTS / IndexedDB cached audio first
 * 2. Falls back smoothly to browser SpeechSynthesis if unavailable
 */
export async function speakFullSentence(text, targetLang = 'mr') {
  const langCode = targetLang === 'mr' ? 'mr-IN' : (targetLang === 'hi' ? 'hi-IN' : 'en-IN');
  
  // Try high-quality backend TTS (or IndexedDB cache)
  const ttsResult = await fetchTtsAudio(text, langCode);
  if (ttsResult && ttsResult.audioBase64) {
    console.log(`[CareCircle Voice Path]: ${ttsResult.voicePath}`);
    const success = await playAudioElement(ttsResult.audioBase64);
    if (success) return;
  }

  // Fallback to browser Web Speech API
  console.log('[CareCircle Voice Path]: browser-speech-synthesis-fallback');
  await speakWithBrowserTts(text, targetLang);
}

/**
 * Main Reminder Announcement:
 * 1. Plays gentle chime
 * 2. Waits 1 second AFTER chime finishes
 * 3. Family Voice: plays recording, then speaks pill sentence
 * 4. General Voice: speaks full sentence with elder's name
 */
export async function playReminderMoment({ profile = {}, meds = [], voiceConfig = {}, language = 'mr' }) {
  unlockAudio();

  // 1. Play gentle chime
  await playGentleChime();

  // 2. Start speaking 1 second AFTER the chime ends
  await new Promise(r => setTimeout(r, 1000));

  const isFamilyVoice = voiceConfig.type === 'family' && voiceConfig.audioBlobBase64;

  if (isFamilyVoice) {
    console.log('[CareCircle Voice Path]: family-audio-recording');
    await playAudioElement(voiceConfig.audioBlobBase64);
    await new Promise(r => setTimeout(r, 600));

    // Then speak pill descriptions as a full sentence
    const pillsSentence = buildSpokenReminderSentence(profile, meds, language);
    await speakFullSentence(pillsSentence, language);
  } else {
    const fullSentence = buildSpokenReminderSentence(profile, meds, language);
    await speakFullSentence(fullSentence, language);
  }
}

/**
 * Spoken celebration after taking medicines
 */
export async function playCelebrationVoice(profile = {}, language = 'mr') {
  unlockAudio();
  const fullSentence = buildSpokenCelebrationSentence(profile, language);
  await speakFullSentence(fullSentence, language);
}

/**
 * Test voice button helper
 */
export async function testSpokenReminder(profile = {}, meds = [], voiceConfig = {}, language = 'mr') {
  await playReminderMoment({ profile, meds, voiceConfig, language });
}

/**
 * MediaRecorder helper for Family Voice
 */
export class FamilyVoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.timerInterval = null;
    this.secondsRecorded = 0;
  }

  async start(onTick) {
    this.audioChunks = [];
    this.secondsRecorded = 0;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone not supported');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };

    this.mediaRecorder.start();

    this.timerInterval = setInterval(() => {
      this.secondsRecorded += 1;
      if (onTick) onTick(this.secondsRecorded);
      if (this.secondsRecorded >= 10) {
        this.stop();
      }
    }, 1000);
  }

  stop() {
    return new Promise((resolve) => {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        if (this.stream) {
          this.stream.getTracks().forEach(t => t.stop());
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            blob: audioBlob,
            base64: reader.result,
            duration: this.secondsRecorded
          });
        };
        reader.readAsDataURL(audioBlob);
      };
      this.mediaRecorder.stop();
    });
  }

  cancel() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
  }
}
