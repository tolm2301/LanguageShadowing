const { extractVideoId, getVideoInfo } = require('./_lib/transcript');

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

    if (!rawInput) {
      return res.status(400).json({ error: 'url or videoId parameter is required' });
    }
    const videoId = extractVideoId(rawInput);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL or Video ID' });
    }

    const info = await getVideoInfo(videoId);
    res.status(200).json(info);
  } catch (err) {
    console.error('Error fetching video info:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch video information' });
  }
};
