const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  extractVideoId,
  fetchTranscript,
  getVideoInfo,
  getVideoCaptionTracks,
  translateToVietnamese,
} = require('./transcript');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins (allows Vercel frontend to communicate with Render backend)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-yt-cookie', 'x-youtube-cookie']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Curated sample videos for each language verified to have working transcripts
const SAMPLE_VIDEOS = {
  en: {
    title: 'Steve Jobs 2005 Stanford Commencement Speech',
    url: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc',
    lang: 'en',
    description: 'Bài phát biểu kinh điển tại Stanford, phát âm chuẩn, nhịp điệu truyền cảm hứng.',
  },
  zh: {
    title: 'Luyện giao tiếp tiếng Trung cơ bản (Bính âm & Chữ Hán)',
    url: 'https://www.youtube.com/watch?v=ctR1jrI42uc',
    lang: 'zh',
    description: 'Hội thoại tiếng Trung phổ thông chuẩn giọng Bắc Kinh, câu ngắn dễ nhại.',
  },
  ja: {
    title: 'Hội thoại tiếng Nhật hàng ngày & Shadowing',
    url: 'https://www.youtube.com/watch?v=R3m2J3WKTGA',
    lang: 'ja',
    description: 'Hội thoại tiếng Nhật tự nhiên, rõ từng âm tiết, thích hợp luyện phản xạ.',
  },
  ko: {
    title: 'Luyện phát âm & Hội thoại tiếng Hàn chuẩn Seoul',
    url: 'https://www.youtube.com/watch?v=rNclAN43VQ0',
    lang: 'ko',
    description: 'Mẫu câu giao tiếp tiếng Hàn thực tế, ngữ điệu tự nhiên, từ vựng thông dụng.',
  },
  th: {
    title: 'Luyện nghe & Nhại giọng tiếng Thái chuẩn Bangkok',
    url: 'https://www.youtube.com/watch?v=BblzhcaRQWs',
    lang: 'th',
    description: 'Giọng đọc tiếng Thái chậm, phát âm rõ từng thanh điệu, cực kỳ dễ học.',
  },
};

// Health check endpoints for Render
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'YouTube Shadowing Backend API',
    platform: 'Render',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug-python', async (req, res) => {
  const { exec } = require('child_process');
  const videoId = req.query.videoId || 'muCY-KBCJUQ';
  exec(`which python3; which pip3; which pip; python3 --version; pip3 --version; pip install -U youtube-transcript-api; python3 -m youtube_transcript_api ${videoId}`, { timeout: 30000 }, (err, stdout, stderr) => {
    res.json({ ok: !err, err: err ? err.message : null, stdout, stderr });
  });
});

app.get('/api/debug-ytdlp', async (req, res) => {
  const { exec } = require('child_process');
  const { getWorkingCommand } = require('./lib/ytdlp');
  const videoId = req.query.videoId || 'muCY-KBCJUQ';
  try {
    const cmd = await getWorkingCommand();
    const tests = [
      `${cmd} --dump-json --skip-download --no-warnings --extractor-args "youtube:player_client=android;player_skip=webpage,configs" "https://www.youtube.com/watch?v=${videoId}"`,
      `${cmd} --dump-json --skip-download --no-warnings --extractor-args "youtube:player_client=android" "https://www.youtube.com/watch?v=${videoId}"`,
      `${cmd} --dump-json --skip-download --no-warnings "https://www.youtube.com/watch?v=${videoId}"`,
    ];

    const results = [];
    for (const t of tests) {
      const r = await new Promise(resolve => {
        exec(t, { maxBuffer: 15 * 1024 * 1024, timeout: 20000 }, (err, stdout, stderr) => {
          if (err) {
            resolve({ cmd: t, ok: false, error: err.message, stderr: stderr ? stderr.slice(0, 300) : '' });
          } else {
            try {
              const j = JSON.parse(stdout);
              resolve({ cmd: t, ok: true, autos: Object.keys(j.automatic_captions || {}), manuals: Object.keys(j.subtitles || {}) });
            } catch (pe) {
              resolve({ cmd: t, ok: false, parseError: pe.message, stdout: stdout.slice(0, 200) });
            }
          }
        });
      });
      results.push(r);
    }
    res.json({ videoId, results });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// API: Get sample videos
app.get('/api/samples', (req, res) => {
  res.json({ samples: SAMPLE_VIDEOS });
});

// API: Get video info (title, author, thumbnail)
app.get('/api/video-info', async (req, res) => {
  try {
    const rawInput = req.query.url || req.query.videoId;
    if (!rawInput) {
      return res.status(400).json({ error: 'url or videoId parameter is required' });
    }
    const videoId = extractVideoId(rawInput);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL or Video ID' });
    }

    const info = await getVideoInfo(videoId);
    res.json(info);
  } catch (err) {
    console.error('Error fetching video info:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch video information' });
  }
});

// API: Get transcript/subtitles for a video
app.get('/api/transcript', async (req, res) => {
  try {
    const rawInput = req.query.url || req.query.videoId;
    const targetLang = req.query.lang || 'en';
    const userCookie =
      req.headers['x-yt-cookie'] ||
      req.headers['x-youtube-cookie'] ||
      req.query.cookie ||
      process.env.YOUTUBE_COOKIE ||
      null;

    if (!rawInput) {
      return res.status(400).json({ error: 'url or videoId parameter is required' });
    }

    const videoId = extractVideoId(rawInput);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL or Video ID' });
    }

    const [videoInfo, transcriptData] = await Promise.all([
      getVideoInfo(videoId),
      fetchTranscript(videoId, targetLang, userCookie),
    ]);

    res.json({
      success: true,
      ...videoInfo,
      ...transcriptData,
    });
  } catch (err) {
    console.error('Error in /api/transcript:', err);
    res.status(500).json({
      error: err.message || 'Failed to fetch transcript from YouTube',
    });
  }
});

// API: Get list of caption tracks only
app.get('/api/caption-tracks', async (req, res) => {
  try {
    const rawInput = req.query.url || req.query.videoId;
    const userCookie =
      req.headers['x-yt-cookie'] ||
      req.headers['x-youtube-cookie'] ||
      req.query.cookie ||
      process.env.YOUTUBE_COOKIE ||
      null;

    const videoId = extractVideoId(rawInput);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL or Video ID' });
    }
    const tracks = await getVideoCaptionTracks(videoId, userCookie);
    res.json({ videoId, tracks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Verify YouTube cookie functionality
app.post('/api/verify-cookie', async (req, res) => {
  try {
    const cookie = req.body?.cookie || req.headers['x-yt-cookie'] || process.env.YOUTUBE_COOKIE;
    if (!cookie) {
      return res.status(400).json({ success: false, error: 'Chưa có cookie để kiểm tra' });
    }
    // Test with sample video
    const testVideoId = 'muCY-KBCJUQ';
    const result = await fetchTranscript(testVideoId, 'en', cookie);
    if (result && result.transcript && result.transcript.length > 0) {
      return res.json({
        success: true,
        message: 'Cookie hoạt động hoàn hảo! Đã lấy thành công phụ đề từ YouTube.',
        count: result.transcript.length,
        language: result.selectedTrack?.languageCode || 'en'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Cookie không hợp lệ hoặc đã hết hạn.'
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi khi kiểm tra cookie' });
  }
});

// API: Translate on-demand to Vietnamese
app.post('/api/translate', async (req, res) => {
  try {
    const { texts } = req.body;
    if (!Array.isArray(texts)) {
      return res.status(400).json({ error: 'texts must be an array of strings' });
    }
    const translations = await translateToVietnamese(texts);
    res.json({ translations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend if running locally as a combined monolithic app
const fs = require('fs');
const rootDistPath = path.join(__dirname, '..', 'dist');
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const distPath = fs.existsSync(rootDistPath) ? rootDistPath : clientDistPath;
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Shadowing Server] Backend listening on port ${PORT}`);
  });
}

module.exports = app;
