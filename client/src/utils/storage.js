import { LANGUAGES } from '../constants';

export const STORAGE_KEYS = {
  CURRENT_LANG: 'shadowing_current_lang',
  LANG_VIDEOS: 'shadowing_lang_videos',
  CONFIG: 'shadowing_learning_config',
};

// Default initial videos mapping for all 5 languages
export function getDefaultLanguageVideos() {
  const initial = {};
  LANGUAGES.forEach((lang) => {
    initial[lang.code] = {
      url: `https://www.youtube.com/watch?v=${lang.sampleVideoId}`,
      videoId: lang.sampleVideoId,
      title: lang.sampleTitle,
      author_name: '',
      rangeStart: 0,
      rangeEnd: 60,
    };
  });
  return initial;
}

// Default learning config
export const DEFAULT_CONFIG = {
  playbackSpeed: 1.0,
  autoPauseMode: false,
  isBlindMode: false,
  showPinyin: true,
  activeTab: 'bilingual',
  loopRange: false,
};

// Read current active language
export function getSavedCurrentLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_LANG);
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Cannot read current_lang from localStorage', e);
  }
  return 'en';
}

// Save current active language
export function saveCurrentLang(langCode) {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_LANG, langCode);
  } catch (e) {
    console.warn('Cannot save current_lang to localStorage', e);
  }
}

// Read map of videos per language
export function getSavedLanguageVideos() {
  const defaults = getDefaultLanguageVideos();
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LANG_VIDEOS);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.warn('Cannot read lang_videos from localStorage', e);
  }
  return defaults;
}

// Save video settings for a language
export function saveVideoForLanguage(langCode, videoData) {
  try {
    const allVideos = getSavedLanguageVideos();
    allVideos[langCode] = {
      ...(allVideos[langCode] || {}),
      ...videoData,
    };
    localStorage.setItem(STORAGE_KEYS.LANG_VIDEOS, JSON.stringify(allVideos));
  } catch (e) {
    console.warn('Cannot save video for language to localStorage', e);
  }
}

// Read user learning config
export function getSavedConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Cannot read config from localStorage', e);
  }
  return DEFAULT_CONFIG;
}

// Save partial or complete config
export function saveConfig(updates) {
  try {
    const current = getSavedConfig();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.warn('Cannot save config to localStorage', e);
  }
}

// Clear all and reset
export function clearAllSavedData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_LANG);
    localStorage.removeItem(STORAGE_KEYS.LANG_VIDEOS);
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
  } catch (e) {
    console.warn('Cannot clear localStorage', e);
  }
}
