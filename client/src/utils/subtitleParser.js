import { pinyin } from 'pinyin-pro';

/**
 * Parses time format HH:MM:SS.mmm, MM:SS.mmm, or seconds into float seconds
 */
export function parseTimeString(timeStr) {
  if (!timeStr) return 0;
  const cleaned = String(timeStr).trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(cleaned) || 0;
}

/**
 * Extracts 11-character YouTube video ID from any YouTube URL format or raw ID
 */
export function extractVideoId(urlOrId) {
  if (!urlOrId) return '';
  const str = String(urlOrId).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

/**
 * Fetches video metadata (title, author, thumbnail) using CORS-friendly noembed.com
 */
export async function fetchVideoMeta(videoId) {
  if (!videoId) return null;
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(ytUrl)}`);
    if (res.ok) {
      const data = await res.json();
      return {
        videoId,
        title: data.title || `YouTube Video (${videoId})`,
        author: data.author_name || 'YouTube Channel',
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  } catch (e) {
    // ignore network errors
  }
  return {
    videoId,
    title: `YouTube Video (${videoId})`,
    author: 'YouTube',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  };
}

/**
 * Parses universal subtitle inputs:
 * 1. Standard SRT (1 \n 00:00:01,000 --> 00:00:04,000 \n text)
 * 2. WebVTT (00:01.000 --> 00:04.000 \n text)
 * 3. YouTube copy-paste format (0:01 \n text \n 0:04 \n text)
 * 4. Inline timestamp format (0:01 Hello or [00:01] Hello)
 */
export function parseUniversalSubtitles(rawText, lang = 'en') {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const items = [];

  // 1. Try SRT / VTT regex (timestamp --> timestamp)
  const srtRegex = /(?:(\d+)\n)?(?:(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?))\n([\s\S]*?)(?=\n\s*(?:\d+\n)?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?\s*-->|\n*$)/g;
  let match;
  while ((match = srtRegex.exec(text)) !== null) {
    const start = parseTimeString(match[2]);
    const end = parseTimeString(match[3]);
    const content = match[4].trim().replace(/\n+/g, ' ');
    if (content) {
      items.push({
        id: items.length + 1,
        start: parseFloat(start.toFixed(2)),
        end: parseFloat(end.toFixed(2)),
        duration: parseFloat(Math.max(0.5, end - start).toFixed(2)),
        text: content
      });
    }
  }

  if (items.length === 0) {
    // 2. Try YouTube Transcript / Line-by-line format
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const timeLineRegex = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?$/;
    const inlineTimeRegex = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.+)$/;

    let pendingTime = null;
    let pendingText = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip lines that are just numbers (like SRT indices that didn't match arrow)
      if (/^\d+$/.test(line) && pendingTime === null) continue;

      // Case 2a: line is timestamp only: e.g. "0:05" or "[00:05]"
      const timeMatch = line.match(timeLineRegex);
      if (timeMatch) {
        if (pendingTime !== null && pendingText.length > 0) {
          items.push({
            id: items.length + 1,
            start: parseTimeString(pendingTime),
            text: pendingText.join(' ')
          });
          pendingText = [];
        }
        pendingTime = timeMatch[1];
        continue;
      }

      // Case 2b: line has timestamp + text: e.g. "0:05 Hello world"
      const inlineMatch = line.match(inlineTimeRegex);
      if (inlineMatch) {
        if (pendingTime !== null && pendingText.length > 0) {
          items.push({
            id: items.length + 1,
            start: parseTimeString(pendingTime),
            text: pendingText.join(' ')
          });
          pendingText = [];
        }
        pendingTime = inlineMatch[1];
        pendingText.push(inlineMatch[2]);
        continue;
      }

      // Regular text line
      if (pendingTime !== null) {
        pendingText.push(line);
      }
    }

    if (pendingTime !== null && pendingText.length > 0) {
      items.push({
        id: items.length + 1,
        start: parseTimeString(pendingTime),
        text: pendingText.join(' ')
      });
    }

    // Auto-calculate durations and end timestamps
    for (let i = 0; i < items.length; i++) {
      if (items[i].end === undefined) {
        if (i < items.length - 1) {
          const nextStart = items[i + 1].start;
          items[i].end = parseFloat(Math.max(items[i].start + 1, nextStart).toFixed(2));
        } else {
          items[i].end = parseFloat((items[i].start + 4.0).toFixed(2));
        }
        items[i].duration = parseFloat((items[i].end - items[i].start).toFixed(2));
      }
    }
  }

  // If Chinese, attach Pinyin
  if (lang === 'zh' || lang?.startsWith('zh')) {
    items.forEach(item => {
      try {
        item.pinyin = pinyin(item.text, { toneType: 'symbol' });
      } catch (e) {
        item.pinyin = '';
      }
    });
  }

  return items;
}

/**
 * Translates texts to Vietnamese in batch chunks using Google Translate GTX (Client CORS enabled)
 */
export async function translateBatchToVietnamese(texts, onProgress = null) {
  if (!texts || texts.length === 0) return [];

  const chunkSize = 15;
  const delimiter = ' \n---\n ';
  const result = [];
  const totalChunks = Math.ceil(texts.length / chunkSize);

  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunkIndex = Math.floor(i / chunkSize);
    if (onProgress) {
      onProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
    }

    const chunk = texts.slice(i, i + chunkSize);
    const joined = chunk.join(delimiter);

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(joined)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const fullTranslation = data[0].map(item => item[0]).join('');
        const splitTrans = fullTranslation.split(/---|\n---\n/).map(s => s.trim());
        for (let j = 0; j < chunk.length; j++) {
          result.push(splitTrans[j] || chunk[j]);
        }
      } else {
        chunk.forEach(t => result.push(t));
      }
    } catch (e) {
      chunk.forEach(t => result.push(t));
    }
  }

  return result;
}
