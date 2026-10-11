module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const videoId = req.query?.videoId || 'muCY-KBCJUQ';
  const results = {};

  // 1. Test WEB_EMBEDDED_PLAYER
  try {
    const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_EMBEDDED_PLAYER',
            clientVersion: '1.20240901.01.00',
            originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
            hl: 'en',
          },
          thirdParty: {
            embedUrl: 'https://www.youtube.com',
          },
        },
        videoId,
      }),
    });
    const d = await resp.json();
    results.webEmbeddedStatus = d?.playabilityStatus?.status;
    results.webEmbeddedReason = d?.playabilityStatus?.reason;
    results.webEmbeddedTracks = d?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length || 0;
  } catch (e) {
    results.webEmbeddedError = e.message;
  }

  // 2. Test ANDROID with clientVersion 17.31.35 or 19.29.37
  try {
    const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/17.31.35 (Linux; U; Android 11)',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '17.31.35',
            androidSdkVersion: 30,
            hl: 'en',
            gl: 'US',
          },
        },
        videoId,
      }),
    });
    const d = await resp.json();
    results.androidOldStatus = d?.playabilityStatus?.status;
    results.androidOldTracks = d?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length || 0;
  } catch (e) {
    results.androidOldError = e.message;
  }

  // 3. Test Invidious public instance for captions
  const invidiousInstances = [
    'https://vid.puffyan.us',
    'https://inv.nadeko.net',
    'https://yewtu.be',
    'https://invidious.nerdvpn.de',
  ];
  results.invidious = {};
  for (const inst of invidiousInstances) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 3500);
      const r = await fetch(`${inst}/api/v1/captions/${videoId}`, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (r.ok) {
        const caps = await r.json();
        results.invidious[inst] = { count: caps?.captions?.length || 0, ok: true };
        break;
      } else {
        results.invidious[inst] = { status: r.status };
      }
    } catch (e) {
      results.invidious[inst] = { error: e.message };
    }
  }

  // 4. Test Piped instances
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.private.coffee',
    'https://piped-api.lunar.icu',
  ];
  results.piped = {};
  for (const inst of pipedInstances) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 3500);
      const r = await fetch(`${inst}/streams/${videoId}`, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (r.ok) {
        const d = await r.json();
        results.piped[inst] = { subtitlesCount: d?.subtitles?.length || 0, ok: true };
        break;
      } else {
        results.piped[inst] = { status: r.status };
      }
    } catch (e) {
      results.piped[inst] = { error: e.message };
    }
  }

  res.status(200).json(results);
};
