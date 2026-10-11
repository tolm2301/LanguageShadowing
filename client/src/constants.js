export const LANGUAGES = [
  {
    code: 'en',
    name: 'Tiếng Anh',
    nativeName: 'English',
    flag: '🇬🇧',
    sampleVideoId: 'UF8uR6Z6KLc',
    sampleTitle: 'Steve Jobs - 2005 Stanford Commencement Speech',
  },
  {
    code: 'zh',
    name: 'Tiếng Trung',
    nativeName: '中文',
    flag: '🇨🇳',
    sampleVideoId: 'ctR1jrI42uc',
    sampleTitle: 'Luyện giao tiếp tiếng Trung cơ bản (Bính âm & Chữ Hán)',
  },
  {
    code: 'ja',
    name: 'Tiếng Nhật',
    nativeName: '日本語',
    flag: '🇯🇵',
    sampleVideoId: 'R3m2J3WKTGA',
    sampleTitle: 'Hội thoại tiếng Nhật hàng ngày & Shadowing',
  },
  {
    code: 'ko',
    name: 'Tiếng Hàn',
    nativeName: '한국어',
    flag: '🇰🇷',
    sampleVideoId: 'rNclAN43VQ0',
    sampleTitle: 'Luyện phát âm & Hội thoại tiếng Hàn chuẩn Seoul',
  },
  {
    code: 'th',
    name: 'Tiếng Thái',
    nativeName: 'ไทย',
    flag: '🇹🇭',
    sampleVideoId: 'BblzhcaRQWs',
    sampleTitle: 'Luyện nghe & Nhại giọng tiếng Thái chuẩn Bangkok',
  },
];

export const PLAYBACK_SPEEDS = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '0.85x', value: 0.85 },
  { label: '1.0x', value: 1.0 },
  { label: '1.25x', value: 1.25 },
];

// Helper to format seconds to mm:ss or hh:mm:ss
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// Helper to parse mm:ss or seconds to float
export function parseTimeString(str) {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  const parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}
