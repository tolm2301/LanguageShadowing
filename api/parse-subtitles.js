const { parseUniversalSubtitles, translateToVietnamese } = require('./_lib/transcript');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const text = body.text || body.srtContent || body.content || '';
    if (!text.trim()) {
      return res.status(400).json({ error: 'Nội dung phụ đề không được để trống' });
    }

    let transcript = parseUniversalSubtitles(text);
    if (!transcript || transcript.length === 0) {
      return res.status(400).json({
        error: 'Không thể nhận diện định dạng phụ đề. Vui lòng kiểm tra lại file SRT/VTT hoặc nội dung sao chép từ YouTube.',
      });
    }

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

    res.status(200).json({
      success: true,
      transcript,
      count: transcript.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
