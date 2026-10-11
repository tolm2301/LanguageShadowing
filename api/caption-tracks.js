const { extractVideoId, getVideoCaptionTracks } = require('../server/transcript');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawInput = req.query?.url || req.query?.videoId;
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
