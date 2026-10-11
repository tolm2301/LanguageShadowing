const { parseSrtOrVtt, translateToVietnamese } = require('../server/transcript');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { text } = body;
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }
    let transcript = parseSrtOrVtt(text);
    if (transcript.length > 0) {
      try {
        const rawTexts = transcript.map(t => t.text);
        const viTranslations = await translateToVietnamese(rawTexts);
        transcript = transcript.map((item, idx) => ({
          ...item,
          textVi: viTranslations[idx] || item.text,
        }));
      } catch (err) {
        console.warn('Translate custom sub error:', err.message);
      }
    }
    res.status(200).json({ transcript, count: transcript.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
