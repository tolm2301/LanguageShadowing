module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const videoId = req.query?.videoId || 'muCY-KBCJUQ';
  const debug = {};

  // 1. Test InnerTube Android
  try {
    const t0 = Date.now();
    const itResp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            androidSdkVersion: 34,
            hl: 'en',
            gl: 'US',
          },
        },
        videoId,
      }),
    });
    debug.innerTubeStatus = itResp.status;
    debug.innerTubeTimeMs = Date.now() - t0;
    const itData = await itResp.json();
    debug.playabilityStatus = itData?.playabilityStatus;
    debug.hasCaptions = !!itData?.captions;
    debug.captionTracksCount = itData?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length || 0;
    if (itData?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      debug.tracks = itData.captions.playerCaptionsTracklistRenderer.captionTracks.map(t => ({
        lang: t.languageCode,
        name: t.name?.runs?.[0]?.text || t.languageCode
      }));
    }
  } catch (err) {
    debug.innerTubeError = err.message;
  }

  // 2. Test InnerTube Web
  try {
    const itWebResp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240901.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        videoId,
      }),
    });
    const itWebData = await itWebResp.json();
    debug.webPlayabilityStatus = itWebData?.playabilityStatus?.status;
    debug.webCaptionTracksCount = itWebData?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length || 0;
  } catch (err) {
    debug.webError = err.message;
  }

  // 3. Test Web HTML watch page
  try {
    const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg',
      },
    });
    debug.pageStatus = pageResp.status;
    debug.pageUrl = pageResp.url;
    const html = await pageResp.text();
    debug.pageLen = html.length;
    debug.hasYtInitialPlayerResponse = html.includes('ytInitialPlayerResponse');
    debug.hasConsent = html.includes('consent.google.com') || html.includes('consent.youtube.com');
    debug.hasCaptcha = html.includes('recaptcha');
    const m = html.match(/"captionTracks":\s*(\[[^\]]*\])/);
    debug.captionTracksRegexFound = !!m;
  } catch (err) {
    debug.pageError = err.message;
  }

  res.status(200).json(debug);
};
