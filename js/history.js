/**
 * history.js
 * ------------------------------------------------------------------
 * Recent scans saved in localStorage on this device only.
 * Storage can be unavailable (private windows, blocked site data),
 * so every read and write is wrapped in try/catch.
 */

const KEY = 'medivoice.history.v1';
const MAX_ITEMS = 10;

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
    return true;
  } catch {
    // Probably full: try again without thumbnails.
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ITEMS).map((e) => ({ ...e, thumb: '' }))));
      return true;
    } catch {
      return false;
    }
  }
}

/** Add or update a scan (matched by id). Newest first. */
export function upsertScan(entry) {
  const list = loadHistory().filter((e) => e.id !== entry.id);
  list.unshift(entry);
  save(list);
  return list;
}

export function getScan(id) {
  return loadHistory().find((e) => e.id === id) || null;
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Small settings store (text size, theme, speed, language). */
const SETTINGS_KEY = 'medivoice.settings.v1';

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
