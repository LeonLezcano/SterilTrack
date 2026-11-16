/**
 * SterilTrack — Cache & Offline Storage Service
 * Soporte Offline-First para Quirófanos y Centrales de Esterilización en subsuelos
 */

const STORAGE_PREFIX = 'steriltrack_';
const memoryFallback = new Map();

export const SterilTrackCache = {
  get(key) {
    if (typeof localStorage === 'undefined') {
      return memoryFallback.get(STORAGE_PREFIX + key) ?? null;
    }
    try {
      const data = localStorage.getItem(STORAGE_PREFIX + key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    if (typeof localStorage === 'undefined') {
      memoryFallback.set(STORAGE_PREFIX + key, value);
      return;
    }
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {}
  },

  remove(key) {
    if (typeof localStorage === 'undefined') {
      memoryFallback.delete(STORAGE_PREFIX + key);
      return;
    }
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {}
  },

  clear() {
    if (typeof localStorage === 'undefined') {
      memoryFallback.clear();
      return;
    }
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  }
};
