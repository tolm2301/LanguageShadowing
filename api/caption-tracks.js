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
    res.status(200).json({ videoId, tracks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
