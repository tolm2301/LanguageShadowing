module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const videoId = req.query?.videoId || 'muCY-KBCJUQ';
  const debug = { timestamp: Date.now(), videoId };

  // 1. Get visitorData
  try {
    const vRes = await fetch('https://www.youtube.com/youtubei/v1/visitor_id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240901.01.00' } }
      })
    });
    debug.visitorStatus = vRes.status;
    const vData = await vRes.json();
    debug.visitorData = vData?.responseContext?.visitorData;
  } catch (e) {
    debug.visitorError = e.message;
  }

  // 2. Query InnerTube with visitorData
  if (debug.visitorData) {
    try {
      const itResp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
          'X-Goog-Visitor-Id': debug.visitorData,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '20.10.38',
              androidSdkVersion: 34,
              visitorData: debug.visitorData,
              hl: 'en',
              gl: 'US',
            },
          },
          videoId,
        }),
      });
      debug.itWithVisitorStatus = itResp.status;
      const d = await itResp.json();
      debug.playabilityWithVisitor = d?.playabilityStatus?.status;
      debug.playabilityReason = d?.playabilityStatus?.reason;
      debug.tracksCount = d?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length || 0;
      if (debug.tracksCount > 0) {
        debug.tracks = d.captions.playerCaptionsTracklistRenderer.captionTracks.map(t => ({
          lang: t.languageCode,
          name: t.name?.runs?.[0]?.text || t.languageCode
        }));
      }
    } catch (e) {
      debug.itWithVisitorError = e.message;
    }
  }

  // 3. Also test TVHTML5_SIMPLY_EMBEDDED_PLAYER with visitorData
  try {
    const itTvResp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        ...(debug.visitorData ? { 'X-Goog-Visitor-Id': debug.visitorData } : {}),
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
            clientVersion: '2.0',
            ...(debug.visitorData ? { visitorData: debug.visitorData } : {}),
          },
          thirdParty: {
            embedUrl: 'https://www.youtube.com',
          },
        },
        videoId,
      }),
    });
    const dTv = await itTvResp.json();
    debug.tvStatus = dTv?.playabilityStatus?.status;
    debug.tvTracksCount = dTv?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length || 0;
  } catch (e) {
    debug.tvError = e.message;
  }

  res.status(200).json(debug);
};
