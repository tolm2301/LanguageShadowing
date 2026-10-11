const { YouTubeTranscriptApi, AutoPoTokenProvider } = require('youtube-transcript-nodejs');

module.exports = async function handler(req, res) {
  const videoId = req.query.videoId || 'muCY-KBCJUQ';
  try {
    const poProvider = new AutoPoTokenProvider();
    const api = new YouTubeTranscriptApi({ poTokenProvider: poProvider });
    const transList = await api.list(videoId);
    const tracks = [...transList].map(t => ({
      languageCode: t.languageCode,
      language: t.language,
      isGenerated: t.isGenerated
    }));
    const trans = await api.fetch(videoId, { languages: ['en'] });
    return res.status(200).json({
      success: true,
      videoId,
      tracks,
      snippetCount: trans.snippets?.length || 0,
      firstSnippet: trans.snippets?.[0] || null,
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      videoId,
      error: err.message,
      stack: err.stack,
    });
  }
};
