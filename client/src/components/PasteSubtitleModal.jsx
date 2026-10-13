import React, { useState, useMemo } from 'react';
import {
  FileText,
  X,
  ExternalLink,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Languages
} from 'lucide-react';
import { parseUniversalSubtitles, translateBatchToVietnamese } from '../utils/subtitleParser';
import { saveCustomTranscript } from '../utils/storage';

export default function PasteSubtitleModal({
  isOpen,
  onClose,
  videoId,
  videoUrl,
  selectedLang,
  onSubtitlesLoaded
}) {
  const [rawText, setRawText] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeGuideTab, setActiveGuideTab] = useState('youtube'); // 'youtube' | 'downsub' | 'format'

  // Live preview parser
  const parsedPreview = useMemo(() => {
    if (!rawText.trim()) return [];
    try {
      return parseUniversalSubtitles(rawText, selectedLang);
    } catch (e) {
      return [];
    }
  }, [rawText, selectedLang]);

  if (!isOpen) return null;

  const fullVideoUrl = videoUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
  const downsubUrl = fullVideoUrl ? `https://downsub.com/?url=${encodeURIComponent(fullVideoUrl)}` : 'https://downsub.com';

  const handleApply = async () => {
    setErrorMsg('');
    if (!rawText.trim()) {
      setErrorMsg('Vui lòng dán nội dung phụ đề hoặc lời thoại vào ô bên dưới');
      return;
    }

    const items = parseUniversalSubtitles(rawText, selectedLang);
    if (!items || items.length === 0) {
      setErrorMsg('Không tìm thấy mốc thời gian hợp lệ trong văn bản. Hãy đảm bảo có dạng "0:05 Lời thoại" hoặc dạng chuẩn SRT "00:00:01,000 --> 00:00:04,000".');
      return;
    }

    let finalItems = [...items];

    // Auto-translate to Vietnamese if requested
    if (autoTranslate) {
      setIsTranslating(true);
      setTranslateProgress(10);
      try {
        const texts = finalItems.map(it => it.text);
        const translatedTexts = await translateBatchToVietnamese(texts, (progress) => {
          setTranslateProgress(progress);
        });
        finalItems = finalItems.map((it, idx) => ({
          ...it,
          textVi: translatedTexts[idx] || it.text
        }));
      } catch (err) {
        console.warn('Lỗi khi tự động dịch:', err);
      } finally {
        setIsTranslating(false);
      }
    }

    // Save to localStorage
    saveCustomTranscript(videoId, selectedLang, {
      videoId,
      lang: selectedLang,
      transcript: finalItems
    });

    onSubtitlesLoaded(finalItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Dán phụ đề & Lời thoại
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {videoId}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Hỗ trợ định dạng SRT, VTT hoặc bản chép lời copy trực tiếp từ YouTube
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-slate-300">

          {/* Guide Tabs */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                Hướng dẫn lấy phụ đề cho video này:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('youtube')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                    activeGuideTab === 'youtube'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  1. Copy từ YouTube
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('downsub')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                    activeGuideTab === 'downsub'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  2. Dùng DownSub (1-Click)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('format')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                    activeGuideTab === 'format'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Cấu trúc mẫu
                </button>
              </div>
            </div>

            {/* Guide Content: YouTube Copy */}
            {activeGuideTab === 'youtube' && (
              <div className="text-xs space-y-1.5 text-slate-300">
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Mở video trên YouTube: 
                    <a
                      href={fullVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 text-sky-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Mở video này ↗
                    </a>
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Nhìn xuống phần dưới video, bấm nút <strong>... (Thêm)</strong> hoặc biểu tượng chữ nhật, chọn <strong>"Hiện bản chép lời"</strong> (Show transcript).</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center shrink-0">3</span>
                  <span>Bôi đen các dòng lời thoại (kèm mốc giờ như <code>0:00 Hello...</code>), bấm <strong>Ctrl + C</strong> rồi dán vào ô bên dưới!</span>
                </p>
              </div>
            )}

            {/* Guide Content: DownSub */}
            {activeGuideTab === 'downsub' && (
              <div className="text-xs space-y-2 text-slate-300">
                <p>
                  Trang web <strong>DownSub</strong> cho phép tải phụ đề mọi video YouTube chỉ với 1 click:
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={downsubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-medium text-xs transition"
                  >
                    <span>Mở DownSub với video này</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-slate-400 text-xs">
                    (Chọn ngôn ngữ, tải file <strong>.SRT</strong> hoặc <strong>.TXT</strong> về, mở lên copy toàn bộ dán vào đây)
                  </span>
                </div>
              </div>
            )}

            {/* Guide Content: Format Explanation */}
            {activeGuideTab === 'format' && (
              <div className="text-xs space-y-2 text-slate-300">
                <p className="text-slate-400">
                  Hệ thống tự động nhận diện cả 2 cấu trúc thông dụng nhất:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-1">Cấu trúc SRT chuẩn:</span>
                    1<br />
                    00:00:01,000 --&gt; 00:00:04,000<br />
                    Hello everyone!<br /><br />
                    2<br />
                    00:00:04,500 --&gt; 00:00:07,000<br />
                    Welcome to the lesson.
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-sky-400 font-bold block mb-1">Copy từ YouTube:</span>
                    0:01 Hello everyone!<br />
                    0:04 Welcome to the lesson.<br />
                    0:08 Let's practice shadowing.<br /><br />
                    (Có mốc phút:giây là được)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-200">
                Dán nội dung phụ đề / lời thoại:
              </label>
              {parsedPreview.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã nhận diện: {parsedPreview.length} câu
                </span>
              ) : rawText.trim() ? (
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Chưa thấy mốc thời gian
                </span>
              ) : null}
            </div>

            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setErrorMsg('');
              }}
              rows={9}
              placeholder="Ví dụ dán vào đây:&#10;1&#10;00:00:01,000 --> 00:00:04,000&#10;Hello everyone, welcome!&#10;&#10;Hoặc:&#10;0:01 Hello everyone&#10;0:04 Let's begin"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 font-mono text-xs focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none transition"
            />
          </div>

          {/* Translation & Pinyin options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-200">
              <input
                type="checkbox"
                checked={autoTranslate}
                onChange={(e) => setAutoTranslate(e.target.checked)}
                className="w-4 h-4 rounded-sm border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-900"
              />
              <span className="flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-sky-400" />
                Tự động dịch sang tiếng Việt (Google Translate miễn phí)
              </span>
            </label>

            {selectedLang === 'zh' && (
              <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                🀄 Tự động tạo Pinyin có dấu thanh
              </span>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Preview Sample */}
          {parsedPreview.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Xem trước 3 câu đầu tiên:
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                {parsedPreview.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-xs flex items-baseline gap-2">
                    <span className="font-mono text-[10px] text-amber-400 shrink-0">
                      [{item.start}s - {item.end}s]
                    </span>
                    <span className="text-slate-200 truncate">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isTranslating}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isTranslating || !rawText.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-400/20 transition flex items-center gap-2"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Đang dịch tiếng Việt ({translateProgress}%)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Áp dụng & Bắt đầu luyện ({parsedPreview.length || 0} câu)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
