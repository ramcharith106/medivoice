/**
 * speech.js
 * ------------------------------------------------------------------
 * Small wrapper around the Web Speech API (speechSynthesis).
 * - Speaks a list of sentences one after another (more reliable than
 *   one long utterance, which some browsers cut off after ~15 s).
 * - Play / Pause / Resume / Stop / Repeat, speed and language.
 * - Picks the best available English (prefers Indian English), Hindi or Telugu voice.
 * - Fails gracefully when the browser has no speech support.
 */

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

export const SPEECH_SUPPORTED = !!(synth && typeof window.SpeechSynthesisUtterance === 'function');

/** Preferred voice language codes, best first. */
const LANG_PREFS = {
  en: ['en-IN', 'en-GB', 'en-US', 'en'],
  hi: ['hi-IN', 'hi'],
  te: ['te-IN', 'te'],
};

export class Speaker {
  constructor() {
    this.supported = SPEECH_SUPPORTED;
    this.rate = 0.9; // slightly slower than normal is easier to follow
    this.lang = 'en';
    this.sentences = [];
    this.index = 0;
    this.state = 'idle'; // 'idle' | 'speaking' | 'paused'
    this.voices = [];
    this.onstatechange = () => {};
    this.onvoiceschange = () => {};
    this._token = 0; // increments on every stop, so stale callbacks are ignored

    if (this.supported) {
      this._loadVoices();
      // Chrome loads voices asynchronously.
      synth.addEventListener?.('voiceschanged', () => this._loadVoices());
    }
  }

  _loadVoices() {
    this.voices = synth.getVoices() || [];
    this.onvoiceschange(this.voices);
  }

  /** Best voice for a language code ('en' or 'hi'), or null. */
  voiceFor(lang) {
    const prefs = LANG_PREFS[lang] || [lang];
    for (const pref of prefs) {
      const p = pref.toLowerCase();
      const matches = this.voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(p));
      if (matches.length) {
        // Prefer voices that work offline, then the browser default.
        return matches.find((v) => v.localService) || matches.find((v) => v.default) || matches[0];
      }
    }
    return null;
  }

  hasVoiceFor(lang) {
    return !!this.voiceFor(lang);
  }

  _setState(state) {
    this.state = state;
    this.onstatechange(state);
  }

  /** Start speaking a fresh list of sentences from the beginning. */
  speak(sentences) {
    if (!this.supported) return false;
    this.stop();
    this.sentences = sentences.slice();
    this.index = 0;
    this._setState('speaking');
    this._speakNext(this._token);
    return true;
  }

  _speakNext(token) {
    if (token !== this._token) return; // a stop happened meanwhile
    if (this.index >= this.sentences.length) {
      this._setState('idle');
      return;
    }
    const u = new SpeechSynthesisUtterance(this.sentences[this.index]);
    const voice = this.voiceFor(this.lang);
    if (voice) u.voice = voice;
    // No matching voice: still tag the language so the device can pick one.
    u.lang = voice ? voice.lang : LANG_PREFS[this.lang]?.[0] || 'en-IN';
    u.rate = this.rate;
    u.pitch = 1;
    u.onend = () => {
      if (token !== this._token) return;
      this.index++;
      this._speakNext(token);
    };
    u.onerror = (e) => {
      // "interrupted"/"canceled" happen on stop; anything else: skip the sentence.
      if (token !== this._token || e.error === 'interrupted' || e.error === 'canceled') return;
      this.index++;
      this._speakNext(token);
    };
    synth.speak(u);
  }

  pause() {
    if (!this.supported || this.state !== 'speaking') return;
    synth.pause();
    this._setState('paused');
  }

  resume() {
    if (!this.supported || this.state !== 'paused') return;
    synth.resume();
    this._setState('speaking');
  }

  stop() {
    if (!this.supported) return;
    this._token++;
    synth.cancel();
    this.index = 0;
    if (this.state !== 'idle') this._setState('idle');
  }

  /** Play from the start again with the same sentences. */
  repeat() {
    if (this.sentences.length) this.speak(this.sentences);
  }

  setRate(rate) {
    this.rate = rate;
  }

  setLang(lang) {
    this.lang = lang;
  }
}
