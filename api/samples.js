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

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({ samples: SAMPLE_VIDEOS });
};
