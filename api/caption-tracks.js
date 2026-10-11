const { extractVideoId, getVideoCaptionTracks } = require('./_lib/transcript');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let rawInput = req.query?.url || req.query?.videoId;
    if (!rawInput && req.url) {
      try {
        const parsed = new URL(req.url, 'http://localhost');
        rawInput = parsed.searchParams.get('url') || parsed.searchParams.get('videoId');
      } catch (e) {}
    }

    const videoId = extractVideoId(rawInput);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL or Video ID' });
    }
    const tracks = await getVideoCaptionTracks(videoId);

    // Diagnostic on Vercel to inspect why Android VR client returned what it returned
    let vrDebug = null;
    try {
      const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
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

      const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      vrDebug = {
        pageStatus: pageResp.status,
        htmlLen: html.length,
        hasVisitorData: !!visitorData,
        sts,
        playerStatus: resp.status,
        playability: data?.playabilityStatus,
        captionCount: data?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length || 0,
      };
    } catch (e) {
      vrDebug = { error: e.message };
    }

    res.status(200).json({ videoId, tracks, vrDebug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
