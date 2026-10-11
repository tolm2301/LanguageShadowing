const { translateToVietnamese } = require('../server/transcript');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { texts } = body;
    if (!Array.isArray(texts)) {
      return res.status(400).json({ error: 'texts must be an array of strings' });
    }
    const translations = await translateToVietnamese(texts);
    res.status(200).json({ translations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
