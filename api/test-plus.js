const { fetchTranscript, listLanguages } = require('youtube-transcript-plus');

module.exports = async function handler(req, res) {
  const videoId = req.query.videoId || 'muCY-KBCJUQ';
  try {
    const langs = await listLanguages(videoId);
    let items = [];
    try {
      items = await fetchTranscript(videoId, { lang: 'en' });
    } catch (e2) {
      items = { error: e2.message, stack: e2.stack };
    }
    return res.status(200).json({
      success: true,
      langs,
      itemCount: Array.isArray(items) ? items.length : null,
      itemsSample: Array.isArray(items) ? items.slice(0, 2) : items,
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
};
