module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    message: 'Shadowing API is operational',
    endpoints: [
      '/api/transcript',
      '/api/video-info',
      '/api/samples',
      '/api/caption-tracks',
      '/api/parse-subtitles',
      '/api/translate'
    ]
  });
};
