module.exports = async function handler(req, res) {
  const videoId = req.query?.videoId || 'muCY-KBCJUQ';
  const results = {};

  const clients = [
    {
      name: 'TVHTML5',
      client: {
        clientName: 'TVHTML5',
        clientVersion: '7.20260707.07.00',
        userAgent: 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/25.lts.30.1034943-gold (unlike Gecko), Unknown Device/Unknown Model (Unknown Platform, Large Screen)',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/25.lts.30.1034943-gold (unlike Gecko), Unknown Device/Unknown Model (Unknown Platform, Large Screen)',
      }
    },
    {
      name: 'TVHTML5_SIMPLY_EMBEDDED',
      client: {
        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
        clientVersion: '2.0',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/5.0 TV Safari/538.1',
      }
    },
    {
      name: 'WEB_EMBEDDED_PLAYER',
      client: {
        clientName: 'WEB_EMBEDDED_PLAYER',
        clientVersion: '2.20260708.00.00',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/embed/' + videoId,
      }
    },
    {
      name: 'ANDROID_TESTSUITE',
      client: {
        clientName: 'ANDROID_TESTSUITE',
        clientVersion: '1.9',
        androidSdkVersion: 30,
      },
      headers: {
        'User-Agent': 'com.google.android.youtube/1.9 (Linux; U; Android 11) gzip',
      }
    }
  ];

  for (const c of clients) {
    try {
      const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...c.headers,
        },
        body: JSON.stringify({
          context: {
            client: {
              ...c.client,
              hl: 'en',
              gl: 'US',
            }
          },
          videoId,
        }),
      });

      if (!resp.ok) {
        results[c.name] = { status: resp.status, text: (await resp.text()).slice(0, 100) };
        continue;
      }

      const data = await resp.json();
      const status = data?.playabilityStatus?.status;
      const reason = data?.playabilityStatus?.reason;
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      results[c.name] = {
        playability: status,
        reason: reason || null,
        captionTracksCount: Array.isArray(tracks) ? tracks.length : 0,
        sampleBaseUrl: tracks?.[0]?.baseUrl ? tracks[0].baseUrl.slice(0, 100) + '...' : null,
      };
    } catch (err) {
      results[c.name] = { error: err.message };
    }
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ videoId, results });
};
