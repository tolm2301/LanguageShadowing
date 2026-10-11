const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const INNERTUBE_CLIENT_VERSION = '20.10.38';
const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'ANDROID',
    clientVersion: INNERTUBE_CLIENT_VERSION,
  },
};
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

let pinyinPro = null;
try {
  pinyinPro = require('pinyin-pro');
} catch (e) {}

let ytPlus = null;
try {
  ytPlus = require('youtube-transcript-plus');
} catch (e) {}

let ytNodeApi = null;
try {
  const { YouTubeTranscriptApi, AutoPoTokenProvider } = require('youtube-transcript-nodejs');
  ytNodeApi = new YouTubeTranscriptApi({ poTokenProvider: new AutoPoTokenProvider() });
} catch (e) {}

function parseCookieInput(cookieInput) {
  if (!cookieInput) return { cookieString: '', cookieArray: [] };

  if (Array.isArray(cookieInput)) {
    const valid = cookieInput.filter(c => c && c.name && c.value);
    const cookieString = valid.map(c => `${c.name}=${c.value}`).join('; ');
    const cookieArray = valid.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain || '.youtube.com',
      path: c.path || '/'
    }));
    return { cookieString, cookieArray };
  }

  if (typeof cookieInput === 'string') {
    const trimmed = cookieInput.trim();
    if (!trimmed) return { cookieString: '', cookieArray: [] };

    // Check if JSON string
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parseCookieInput(parsed);
        }
      } catch (e) {}
    }

    // Check Netscape format (tab-separated lines)
    if (trimmed.includes('\t')) {
      const lines = trimmed.split('\n');
      const cookieArray = [];
      const parts = [];
      for (const line of lines) {
        const clean = line.trim();
        if (!clean || clean.startsWith('#')) continue;
        const tokens = clean.split('\t');
        if (tokens.length >= 7) {
          const name = tokens[5].trim();
          const value = tokens[6].trim();
          cookieArray.push({ name, value, domain: tokens[0].trim(), path: tokens[2].trim() });
          parts.push(`${name}=${value}`);
        }
      }
      if (cookieArray.length > 0) {
        return { cookieString: parts.join('; '), cookieArray };
      }
    }

    // Standard header string: "key1=val1; key2=val2"
    const pairs = trimmed.split(';').map(p => p.trim()).filter(Boolean);
    const cookieArray = [];
    const parts = [];
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        cookieArray.push({ name, value, domain: '.youtube.com', path: '/' });
        parts.push(`${name}=${value}`);
      }
    }
    return { cookieString: parts.join('; '), cookieArray };
  }

  return { cookieString: '', cookieArray: [] };
}

function getYtNodeApi(cookieInput = null) {
  const { cookieArray } = parseCookieInput(cookieInput || process.env.YOUTUBE_COOKIE);
  try {
    const { YouTubeTranscriptApi, AutoPoTokenProvider } = require('youtube-transcript-nodejs');
    return new YouTubeTranscriptApi({
      cookies: cookieArray.length > 0 ? cookieArray : undefined,
      poTokenProvider: new AutoPoTokenProvider()
    });
  } catch (e) {
    return ytNodeApi;
  }
}

let sampleCache = null;
try {
  sampleCache = require('./sampleCache.json');
} catch (e) {}

function extractVideoId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const patterns = [
    /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/)([^#&?]*)/,
    /[?&]v=([^&#]*)/,
    /[?&]vi=([^&#]*)/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }
  return null;
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTranscriptXml(xml) {
  const items = [];
  const pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  let idx = 0;

  while ((match = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(match[1], 10);
    const durationMs = match[2] ? parseInt(match[2], 10) : 2000;
    let rawText = match[3].replace(/<[^>]+>/g, ' ');
    let text = decodeHtmlEntities(rawText);

    if (text) {
      const start = parseFloat((startMs / 1000).toFixed(2));
      const duration = parseFloat((durationMs / 1000).toFixed(2));
      const end = parseFloat((start + duration).toFixed(2));
      items.push({
        id: `sub_${idx++}`,
        start,
        end,
        duration,
        text,
      });
    }
  }

  if (items.length === 0) {
    const textRegex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
    let tMatch;
    while ((tMatch = textRegex.exec(xml)) !== null) {
      const start = parseFloat(parseFloat(tMatch[1]).toFixed(2));
      const duration = tMatch[2] ? parseFloat(parseFloat(tMatch[2]).toFixed(2)) : 2.0;
      const end = parseFloat((start + duration).toFixed(2));
      const text = decodeHtmlEntities(tMatch[3].replace(/<[^>]+>/g, ' '));

      if (text) {
        items.push({
          id: `sub_${idx++}`,
          start,
          end,
          duration,
          text,
        });
      }
    }
  }

  return items;
}

async function getCaptionTracksAndroidVr(videoId, cookieString = '') {
  try {
    const pageHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    if (cookieString) {
      pageHeaders['Cookie'] = cookieString;
    }
    const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: pageHeaders,
    });
    if (!pageResp.ok) return [];
    const html = await pageResp.text();

    const m1 = html.match(/"VISITOR_DATA":"([^"]+)"/);
    const m2 = html.match(/"visitorData":"([^"]+)"/);
    const visitorData = m1 ? m1[1] : (m2 ? m2[1] : '');

    const sts1 = html.match(/"sts":(\d+)/);
    const sts2 = html.match(/"signatureTimestamp":(\d+)/);
    const sts = sts1 ? parseInt(sts1[1], 10) : (sts2 ? parseInt(sts2[1], 10) : 20732);

    const payload = {
      context: {
        client: {
          clientName: 'ANDROID_VR',
          clientVersion: '1.65.10',
          deviceMake: 'Oculus',
          deviceModel: 'Quest 3',
          androidSdkVersion: 32,
          userAgent: 'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
          osName: 'Android',
          osVersion: '12L',
          hl: 'en',
          timeZone: 'UTC',
          utcOffsetMinutes: 0,
        },
      },
      videoId,
      playbackContext: {
        contentPlaybackContext: {
          html5Preference: 'HTML5_PREF_WANTS',
          signatureTimestamp: sts,
        },
      },
      contentCheckOk: true,
      racyCheckOk: true,
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-YouTube-Client-Name': '28',
      'X-YouTube-Client-Version': '1.65.10',
      'Origin': 'https://www.youtube.com',
      'User-Agent': 'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
    };
    if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData;
    if (cookieString) headers['Cookie'] = cookieString;

    const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      const data = await resp.json();
      const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        return captionTracks.map(t => ({
          languageCode: t.languageCode,
          name: t.name?.runs?.[0]?.text || t.name?.simpleText || t.languageCode,
          baseUrl: t.baseUrl,
          isAutoGenerated: t.kind === 'asr' || (t.name?.runs?.[0]?.text || '').toLowerCase().includes('auto'),
        }));
      }
    }
  } catch (err) {
    console.warn('getCaptionTracksAndroidVr warning:', err.message);
  }
  return [];
}

async function getVideoCaptionTracks(videoId, cookieInput = null) {
  const { cookieString } = parseCookieInput(cookieInput || process.env.YOUTUBE_COOKIE);

  // Method 1 (Direct Android VR client - bypasses cloud datacenter bot protection):
  try {
    const vrTracks = await getCaptionTracksAndroidVr(videoId, cookieString);
    if (Array.isArray(vrTracks) && vrTracks.length > 0) {
      return vrTracks;
    }
  } catch (err) {
    console.warn('Android VR caption tracks extraction warning:', err.message);
  }

  // Method 2: Use youtube-transcript-nodejs with Cookie & AutoPoTokenProvider
  const nodeApi = getYtNodeApi(cookieInput);
  if (nodeApi) {
    try {
      const list = await nodeApi.list(videoId);
      const all = [...(list.manuallyCreatedTranscripts || []), ...(list.generatedTranscripts || [])];
      if (all.length > 0) {
        return all.map(t => ({
          languageCode: t.languageCode,
          name: t.languageName || t.languageCode,
          isAutoGenerated: !!t.isGenerated,
          baseUrl: t._baseUrl,
        }));
      }
    } catch (err) {
      console.warn('ytNodeApi.list warning:', err.message);
    }
  }

  // Method 3: Use youtube-transcript-plus listLanguages
  if (ytPlus && ytPlus.listLanguages) {
    try {
      const langs = await ytPlus.listLanguages(videoId);
      if (Array.isArray(langs) && langs.length > 0) {
        return langs.map(l => ({
          languageCode: l.languageCode,
          name: l.languageName || l.languageCode,
          isAutoGenerated: !!l.isAutoGenerated,
        }));
      }
    } catch (err) {
      console.warn('ytPlus.listLanguages warning:', err.message);
    }
  }

  // Method 4: InnerTube API
  try {
    const itHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': INNERTUBE_USER_AGENT,
    };
    if (cookieString) itHeaders['Cookie'] = cookieString;

    const resp = await fetch(INNERTUBE_API_URL, {
      method: 'POST',
      headers: itHeaders,
      body: JSON.stringify({
        context: INNERTUBE_CONTEXT,
        videoId: videoId,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        return captionTracks.map(t => ({
          languageCode: t.languageCode,
          name: t.name?.runs?.[0]?.text || t.name?.simpleText || t.languageCode,
          baseUrl: t.baseUrl,
          isAutoGenerated: t.kind === 'asr' || (t.name?.runs?.[0]?.text || '').toLowerCase().includes('auto'),
        }));
      }
    }
  } catch (err) {
    console.warn('InnerTube error:', err.message);
  }

  // Method 5: Fallback parse web page HTML
  try {
    const pageHeaders = {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    };
    if (cookieString) pageHeaders['Cookie'] = cookieString;

    const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: pageHeaders,
    });
    const html = await pageResp.text();
    const token = 'var ytInitialPlayerResponse = ';
    const startIdx = html.indexOf(token);
    if (startIdx !== -1) {
      const jsonStart = startIdx + token.length;
      let depth = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < html.length; i++) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') {
          depth--;
          if (depth === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
      if (jsonEnd !== -1) {
        const playerResponse = JSON.parse(html.slice(jsonStart, jsonEnd));
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(captionTracks) && captionTracks.length > 0) {
          return captionTracks.map(t => ({
            languageCode: t.languageCode,
            name: t.name?.runs?.[0]?.text || t.name?.simpleText || t.languageCode,
            baseUrl: t.baseUrl,
            isAutoGenerated: t.kind === 'asr' || (t.name?.runs?.[0]?.text || '').toLowerCase().includes('auto'),
          }));
        }
      }
    }
  } catch (err) {
    console.warn('HTML fallback error:', err.message);
  }

  return [];
}

async function translateChunk(chunk) {
  try {
    const combined = chunk.join('\n');
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=' +
      encodeURIComponent(combined);

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (res.ok) {
      const json = await res.json();
      const full = json[0].map(item => item[0]).join('');
      const split = full.split('\n');
      const chunkRes = [];
      for (let j = 0; j < chunk.length; j++) {
        chunkRes.push(split[j]?.trim() || chunk[j]);
      }
      return chunkRes;
    }
  } catch (e) {}
  return chunk;
}

async function translateToVietnamese(texts) {
  if (!texts || texts.length === 0) return [];
  const chunkSize = 30;
  const chunks = [];
  for (let i = 0; i < texts.length; i += chunkSize) {
    chunks.push(texts.slice(i, i + chunkSize));
  }

  // Process up to 5 concurrent chunk requests for speed
  const poolSize = 5;
  const allResults = [];
  for (let i = 0; i < chunks.length; i += poolSize) {
    const batch = chunks.slice(i, i + poolSize);
    const batchResults = await Promise.all(batch.map(translateChunk));
    for (const res of batchResults) {
      allResults.push(...res);
    }
  }
  return allResults;
}

function getRankedCandidateTracks(tracks, targetLang) {
  if (!tracks || tracks.length === 0) return [];
  if (!targetLang) return tracks;

  const targetLower = targetLang.toLowerCase();
  const exactManual = [];
  const exactAuto = [];
  const prefixManual = [];
  const prefixAuto = [];
  const relatedManual = [];
  const relatedAuto = [];
  const others = [];

  for (const t of tracks) {
    const lCode = (t.languageCode || '').toLowerCase();
    const isAuto = !!t.isAutoGenerated;

    if (lCode === targetLower) {
      if (isAuto) exactAuto.push(t);
      else exactManual.push(t);
    } else if (lCode.startsWith(targetLower)) {
      if (isAuto) prefixAuto.push(t);
      else prefixManual.push(t);
    } else if (
      (targetLower === 'zh' && (lCode.includes('zh') || lCode.includes('cmn'))) ||
      (targetLower === 'ja' && lCode.includes('ja')) ||
      (targetLower === 'ko' && lCode.includes('ko')) ||
      (targetLower === 'th' && lCode.includes('th')) ||
      (targetLower === 'en' && lCode.includes('en'))
    ) {
      if (isAuto) relatedAuto.push(t);
      else relatedManual.push(t);
    } else {
      others.push(t);
    }
  }

  return [
    ...exactManual,
    ...exactAuto,
    ...prefixManual,
    ...prefixAuto,
    ...relatedManual,
    ...relatedAuto,
    ...others,
  ];
}

function cleanAndExtractChinese(rawText) {
  if (!rawText) return { text: '', pinyin: '' };
  let str = rawText.trim();

  // Case 1: Parentheses or brackets: 大家好 (Dàjiā hǎo)
  const parenMatch = str.match(/^(.*?)[（(\[]\s*([a-zA-ZāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜüĀÁǍÀŌÓǑÒĒÉĚÈĪÍǏÌŪÚǓÙǕǗǙǛÜ\s,.'?!-]+)\s*[）)\]]$/);
  if (parenMatch && /[\u4e00-\u9fa5]/.test(parenMatch[1])) {
    return {
      text: parenMatch[1].trim(),
      pinyin: parenMatch[2].trim()
    };
  }

  // Case 2: Newlines
  if (str.includes('\n')) {
    const lines = str.split('\n').map(l => l.trim()).filter(Boolean);
    const hanziLine = lines.find(l => /[\u4e00-\u9fa5]/.test(l));
    const pinyinLine = lines.find(l => !/[\u4e00-\u9fa5]/.test(l) && /[a-zA-Zāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜü]/i.test(l));
    if (hanziLine) {
      return {
        text: hanziLine,
        pinyin: pinyinLine || ''
      };
    }
  }

  // Case 3: Pinyin prefix: 'Dàjiā hǎo wǒ shì Wén 大家好 我是雯'
  const firstHanziIdx = str.search(/[\u4e00-\u9fa5]/);
  if (firstHanziIdx > 0) {
    const prefix = str.slice(0, firstHanziIdx).trim();
    const rest = str.slice(firstHanziIdx).trim();
    if (/[a-zA-Zāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜü]/.test(prefix)) {
      return {
        text: rest,
        pinyin: prefix
      };
    }
  }

  // Case 4: Hanzi before Pinyin: '大家好 我是雯 Dàjiā hǎo wǒ shì Wén'
  const lastHanziIdx = str.search(/[\u4e00-\u9fa5](?![\s\S]*[\u4e00-\u9fa5])/);
  if (lastHanziIdx !== -1 && lastHanziIdx < str.length - 1) {
    const hanziPart = str.slice(0, lastHanziIdx + 1).trim();
    const suffix = str.slice(lastHanziIdx + 1).trim();
    if (/[a-zA-Zāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜü]/.test(suffix)) {
      return {
        text: hanziPart,
        pinyin: suffix
      };
    }
  }

  return { text: str, pinyin: '' };
}

function processSubtitleItem(item, isChinese = false) {
  let { text, pinyin } = cleanAndExtractChinese(item.text);

  if ((isChinese || /[\u4e00-\u9fa5]/.test(text)) && !pinyin && pinyinPro && /[\u4e00-\u9fa5]/.test(text)) {
    try {
      pinyin = pinyinPro.pinyin(text);
    } catch (e) {}
  }

  return {
    ...item,
    text,
    pinyin: pinyin || undefined,
  };
}

function cleanVietnameseTranslation(viText, pinyin) {
  if (!viText) return '';
  let cleaned = viText.trim();
  if (pinyin && pinyin.length > 2) {
    const pinyinRegex = new RegExp('^' + pinyin.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*', 'i');
    cleaned = cleaned.replace(pinyinRegex, '').trim();
  }
  return cleaned || viText;
}

async function fetchTranscript(videoId, targetLang = null, cookieInput = null) {
  const { cookieString } = parseCookieInput(cookieInput || process.env.YOUTUBE_COOKIE);

  // Check instant sample cache first (only when no custom cookie is forcing a fresh fetch)
  if (!cookieString && sampleCache && sampleCache[videoId]) {
    const cached = sampleCache[videoId];
    const trackCode = cached.selectedTrack?.languageCode?.toLowerCase() || '';
    const reqCode = (targetLang || 'en').toLowerCase().slice(0, 2);
    if (!targetLang || trackCode.startsWith(reqCode)) {
      return {
        videoId,
        tracks: cached.tracks,
        selectedTrack: cached.selectedTrack,
        transcript: cached.transcript,
        error: null,
      };
    }
  }

  const tracks = await getVideoCaptionTracks(videoId, cookieInput);
  let selectedTrack = null;
  let transcript = [];

  let lastErrors = [];

  // Method 1 (Primary & Fastest): Direct baseUrl XML download from caption tracks
  if (tracks && tracks.length > 0) {
    const candidateTracks = getRankedCandidateTracks(tracks, targetLang);

    for (const track of candidateTracks) {
      if (!track.baseUrl) continue;
      try {
        const fetchHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': track.languageCode,
        };
        if (cookieString) {
          fetchHeaders['Cookie'] = cookieString;
        }

        const resp = await fetch(track.baseUrl, {
          headers: fetchHeaders,
        });

        if (resp.ok) {
          const xml = await resp.text();
          const parsed = parseTranscriptXml(xml);
          if (parsed && parsed.length > 0) {
            selectedTrack = track;
            transcript = parsed;
            break;
          }
        }
      } catch (err) {
        lastErrors.push(`baseUrl fetch failed for ${track.languageCode}: ${err.message}`);
        console.warn(`Failed to fetch/parse track ${track.languageCode}:`, err.message);
      }
    }
  }

  // Method 2: youtube-transcript-nodejs with Cookie & AutoPoTokenProvider
  const nodeApi = getYtNodeApi(cookieInput);
  if (transcript.length === 0 && nodeApi) {
    try {
      const list = await nodeApi.list(videoId);
      const all = [...(list.manuallyCreatedTranscripts || []), ...(list.generatedTranscripts || [])];
      if (all.length > 0) {
        const targetLower = (targetLang || 'en').toLowerCase();
        let candidate =
          all.find(t => (t.languageCode || '').toLowerCase() === targetLower) ||
          all.find(t => (t.languageCode || '').toLowerCase().startsWith(targetLower)) ||
          all.find(t => {
            const lc = (t.languageCode || '').toLowerCase();
            return (
              (targetLower === 'zh' && (lc.includes('zh') || lc.includes('cmn'))) ||
              (targetLower === 'ja' && lc.includes('ja')) ||
              (targetLower === 'ko' && lc.includes('ko')) ||
              (targetLower === 'th' && lc.includes('th')) ||
              (targetLower === 'en' && lc.includes('en'))
            );
          }) ||
          all[0];

        if (candidate) {
          const fetched = await candidate.fetch();
          if (fetched && fetched.snippets && fetched.snippets.length > 0) {
            transcript = fetched.snippets.map((snip, idx) => ({
              id: `sub_${idx}`,
              start: parseFloat(snip.start.toFixed(2)),
              duration: parseFloat(snip.duration.toFixed(2)),
              end: parseFloat((snip.start + snip.duration).toFixed(2)),
              text: decodeHtmlEntities(snip.text),
            }));
            selectedTrack = {
              languageCode: candidate.languageCode,
              name: candidate.languageName || candidate.languageCode,
              isAutoGenerated: !!candidate.isGenerated,
            };
          }
        }
      } else {
        lastErrors.push('ytNodeApi: list returned 0 transcripts');
      }
    } catch (nodeErr) {
      lastErrors.push(`ytNodeApi error: ${nodeErr.message} (${nodeErr.name})`);
      console.warn('ytNodeApi.fetch error:', nodeErr.message);
    }
  } else if (transcript.length === 0) {
    lastErrors.push('ytNodeApi: not initialized');
  }

  // Method 3: High-reliability modern youtube-transcript-plus engine
  if (transcript.length === 0 && ytPlus && ytPlus.fetchTranscript) {
    try {
      let langToFetch = targetLang;
      if (tracks && tracks.length > 0 && targetLang) {
        const targetLower = targetLang.toLowerCase();
        const matched =
          tracks.find(t => (t.languageCode || '').toLowerCase() === targetLower) ||
          tracks.find(t => (t.languageCode || '').toLowerCase().startsWith(targetLower)) ||
          tracks.find(t => {
            const lc = (t.languageCode || '').toLowerCase();
            return (
              (targetLower === 'zh' && (lc.includes('zh') || lc.includes('cmn'))) ||
              (targetLower === 'ja' && lc.includes('ja')) ||
              (targetLower === 'ko' && lc.includes('ko')) ||
              (targetLower === 'th' && lc.includes('th')) ||
              (targetLower === 'en' && lc.includes('en'))
            );
          });
        if (matched) {
          langToFetch = matched.languageCode;
          selectedTrack = matched;
        }
      }

      let ytItems = [];
      try {
        ytItems = await ytPlus.fetchTranscript(videoId, langToFetch ? { lang: langToFetch } : undefined);
      } catch (langErr) {
        // If requested language is not available, fallback to the video's default track
        if (tracks && tracks.length > 0) {
          const fallbackTrack = tracks[0];
          ytItems = await ytPlus.fetchTranscript(videoId, { lang: fallbackTrack.languageCode });
          selectedTrack = fallbackTrack;
        } else {
          ytItems = await ytPlus.fetchTranscript(videoId);
        }
      }

      if (Array.isArray(ytItems) && ytItems.length > 0) {
        transcript = ytItems.map((item, idx) => {
          const offsetSec = typeof item.offset === 'number' ? (item.offset > 1000 ? item.offset / 1000 : item.offset) : 0;
          const durSec = typeof item.duration === 'number' ? (item.duration > 1000 ? item.duration / 1000 : item.duration) : 2.0;
          const start = parseFloat(offsetSec.toFixed(2));
          const duration = parseFloat(durSec.toFixed(2));
          const end = parseFloat((start + duration).toFixed(2));
          return {
            id: `sub_${idx}`,
            start,
            duration,
            end,
            text: decodeHtmlEntities(item.text),
          };
        });

        if (!selectedTrack) {
          selectedTrack = tracks?.[0] || { languageCode: targetLang || 'auto', name: targetLang || 'Auto', isAutoGenerated: true };
        }
      }
    } catch (err) {
      lastErrors.push(`ytPlus error: ${err.message}`);
      console.warn('ytPlus.fetchTranscript error:', err.message);
    }
  }

  // Method 4: Fallback try legacy youtube-transcript package
  if (transcript.length === 0) {
    try {
      const { YoutubeTranscript } = require('youtube-transcript');
      const ytItems = await YoutubeTranscript.fetchTranscript(videoId, targetLang ? { lang: targetLang } : undefined);
      if (Array.isArray(ytItems) && ytItems.length > 0) {
        transcript = ytItems.map((item, idx) => ({
          id: `sub_${idx}`,
          start: parseFloat((item.offset / 1000).toFixed(2)),
          duration: parseFloat((item.duration / 1000).toFixed(2)),
          end: parseFloat(((item.offset + item.duration) / 1000).toFixed(2)),
          text: decodeHtmlEntities(item.text),
        }));
        selectedTrack = { languageCode: targetLang || 'auto', name: targetLang || 'Auto', isAutoGenerated: true };
      }
    } catch (err) {
      console.warn('youtube-transcript library fallback failed:', err.message);
    }
  }

  if (transcript.length === 0) {
    return {
      videoId,
      tracks: tracks || [],
      selectedTrack: null,
      transcript: [],
      debugErrors: lastErrors,
      error: 'Không tìm thấy phụ đề tự động trên YouTube cho video này. Bạn có thể tự thêm file phụ đề SRT/VTT bên dưới để học.',
    };
  }

  const isChinese =
    (targetLang && targetLang.startsWith('zh')) ||
    (selectedTrack?.languageCode && selectedTrack.languageCode.startsWith('zh'));

  // Separate Pinyin from Chinese characters or generate Pinyin if missing
  transcript = transcript.map((item) => processSubtitleItem(item, isChinese));

  // Translate clean sentences to Vietnamese in fast concurrent batches
  try {
    const cleanTexts = transcript.map((t) => t.text);
    const viTranslations = await translateToVietnamese(cleanTexts);
    transcript = transcript.map((item, idx) => ({
      ...item,
      textVi: cleanVietnameseTranslation(viTranslations[idx] || item.text, item.pinyin),
    }));
  } catch (err) {
    console.warn('Auto translation to Vietnamese failed:', err.message);
  }

  return {
    videoId,
    tracks: tracks || [],
    selectedTrack,
    transcript,
    error: null,
  };
}

async function getVideoInfo(videoId) {
  // Check instant sample cache first
  if (sampleCache && sampleCache[videoId]) {
    const cached = sampleCache[videoId];
    return {
      videoId,
      title: cached.title,
      author: cached.author,
      thumbnail: cached.thumbnail,
    };
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const resp = await fetch(oembedUrl);
    if (resp.ok) {
      const data = await resp.json();
      return {
        videoId,
        title: data.title || 'YouTube Video',
        author: data.author_name || '',
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
  } catch (err) {
    console.warn('oEmbed fetch error:', err.message);
  }

  return {
    videoId,
    title: 'YouTube Video',
    author: '',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

// Custom subtitle parser for SRT/VTT format
function parseSrtOrVtt(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const items = [];
  let idx = 0;

  const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})/;

  let currentStart = null;
  let currentEnd = null;
  let currentTextLines = [];

  function toSeconds(h, m, s, ms) {
    const hours = h ? parseInt(h, 10) : 0;
    const minutes = parseInt(m, 10);
    const seconds = parseInt(s, 10);
    const millis = parseInt(ms, 10);
    return parseFloat((hours * 3600 + minutes * 60 + seconds + millis / 1000).toFixed(2));
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const timeMatch = line.match(timeRegex);

    if (timeMatch) {
      if (currentStart !== null && currentTextLines.length > 0) {
        items.push({
          id: `custom_${idx++}`,
          start: currentStart,
          end: currentEnd,
          duration: parseFloat((currentEnd - currentStart).toFixed(2)),
          text: currentTextLines.join(' '),
        });
        currentTextLines = [];
      }
      currentStart = toSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
      currentEnd = toSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
    } else if (line && !/^\d+$/.test(line) && !line.startsWith('WEBVTT')) {
      if (currentStart !== null) {
        currentTextLines.push(line);
      }
    } else if (!line && currentStart !== null && currentTextLines.length > 0) {
      items.push({
        id: `custom_${idx++}`,
        start: currentStart,
        end: currentEnd,
        duration: parseFloat((currentEnd - currentStart).toFixed(2)),
        text: currentTextLines.join(' '),
      });
      currentStart = null;
      currentEnd = null;
      currentTextLines = [];
    }
  }

  if (currentStart !== null && currentTextLines.length > 0) {
    items.push({
      id: `custom_${idx++}`,
      start: currentStart,
      end: currentEnd,
      duration: parseFloat((currentEnd - currentStart).toFixed(2)),
      text: currentTextLines.join(' '),
    });
  }

  return items.map((item) => processSubtitleItem(item));
}

// Universal subtitle parser supporting SRT, VTT, YouTube copied transcripts, and timestamped lines
function parseUniversalSubtitles(rawText) {
  if (!rawText || !rawText.trim()) return [];
  const text = rawText.trim();

  // 1. Check if standard SRT or VTT (contains '-->')
  if (text.includes('-->')) {
    return parseSrtOrVtt(text);
  }

  // 2. Parse line by line
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  let idx = 0;

  function parseTimestamp(str) {
    if (!str) return null;
    const parts = str.trim().split(':').map(p => parseFloat(p));
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }

  const standaloneTimeRegex = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/;
  const inlineTimeRegex = /^\[?\(?((?:\d{1,2}:)?\d{1,2}:\d{2})\]?\)?\s+(.+)$/;

  // Check if YouTube copied format: alternating standalone time and text
  let timeCount = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (standaloneTimeRegex.test(lines[i])) timeCount++;
  }
  const isAlternating = timeCount >= 2;

  if (isAlternating) {
    let currentStart = null;
    let currentText = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (standaloneTimeRegex.test(line)) {
        const timeSec = parseTimestamp(line);
        if (currentStart !== null && currentText.length > 0) {
          const endSec = timeSec > currentStart ? timeSec : currentStart + 3.0;
          items.push({
            id: `copied_${idx++}`,
            start: parseFloat(currentStart.toFixed(2)),
            end: parseFloat(endSec.toFixed(2)),
            duration: parseFloat((endSec - currentStart).toFixed(2)),
            text: currentText.join(' '),
          });
          currentText = [];
        }
        currentStart = timeSec;
      } else {
        if (currentStart !== null) {
          currentText.push(line);
        }
      }
    }

    if (currentStart !== null && currentText.length > 0) {
      items.push({
        id: `copied_${idx++}`,
        start: parseFloat(currentStart.toFixed(2)),
        end: parseFloat((currentStart + 3.0).toFixed(2)),
        duration: 3.0,
        text: currentText.join(' '),
      });
    }

    if (items.length > 0) {
      for (let i = 0; i < items.length - 1; i++) {
        const nextStart = items[i + 1].start;
        if (nextStart > items[i].start && nextStart - items[i].start < 15) {
          items[i].end = nextStart;
          items[i].duration = parseFloat((nextStart - items[i].start).toFixed(2));
        }
      }
      return items.map(item => processSubtitleItem(item));
    }
  }

  // Check if inline timestamps: "0:05 text" or "[00:05] text"
  let inlineEntries = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(inlineTimeRegex);
    if (match) {
      const t = parseTimestamp(match[1]);
      if (t !== null) {
        inlineEntries.push({ time: t, text: match[2].trim() });
      }
    }
  }

  if (inlineEntries.length > 0) {
    for (let i = 0; i < inlineEntries.length; i++) {
      const start = inlineEntries[i].time;
      let end = start + 3.0;
      if (i < inlineEntries.length - 1) {
        const nextTime = inlineEntries[i + 1].time;
        if (nextTime > start) {
          end = nextTime;
        }
      }
      items.push({
        id: `inline_${idx++}`,
        start: parseFloat(start.toFixed(2)),
        end: parseFloat(end.toFixed(2)),
        duration: parseFloat((end - start).toFixed(2)),
        text: inlineEntries[i].text,
      });
    }
    return items.map(item => processSubtitleItem(item));
  }

  // Fallback to SRT/VTT
  return parseSrtOrVtt(text);
}

module.exports = {
  extractVideoId,
  getVideoCaptionTracks,
  fetchTranscript,
  getVideoInfo,
  parseSrtOrVtt,
  parseUniversalSubtitles,
  translateToVietnamese,
  parseCookieInput,
  getYtNodeApi,
};
