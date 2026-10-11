import React, { useState } from 'react';
import { X, Upload, FileText, Check, Sparkles, Video, HelpCircle } from 'lucide-react';

// Fallback client-side parser
function parseClientSubtitles(rawText) {
  if (!rawText || !rawText.trim()) return [];
  const text = rawText.trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  let idx = 0;

  function parseTime(str) {
    if (!str) return null;
    const parts = str.trim().split(':').map((p) => parseFloat(p));
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  // Check SRT / VTT
  if (text.includes('-->')) {
    const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})/;
    let curStart = null;
    let curEnd = null;
    let curTexts = [];

    const toSec = (h, m, s, ms) => {
      const hours = h ? parseInt(h, 10) : 0;
      return parseFloat((hours * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000).toFixed(2));
    };

    for (const line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        if (curStart !== null && curTexts.length > 0) {
          items.push({
            id: `sub_${idx++}`,
            start: curStart,
            end: curEnd,
            duration: parseFloat((curEnd - curStart).toFixed(2)),
            text: curTexts.join(' '),
            textVi: curTexts.join(' '),
          });
          curTexts = [];
        }
        curStart = toSec(match[1], match[2], match[3], match[4]);
        curEnd = toSec(match[5], match[6], match[7], match[8]);
      } else if (line && !/^\d+$/.test(line) && !line.startsWith('WEBVTT')) {
        if (curStart !== null) curTexts.push(line);
      }
    }
    if (curStart !== null && curTexts.length > 0) {
      items.push({
        id: `sub_${idx++}`,
        start: curStart,
        end: curEnd,
        duration: parseFloat((curEnd - curStart).toFixed(2)),
        text: curTexts.join(' '),
        textVi: curTexts.join(' '),
      });
    }
    return items;
  }

  // Alternating YouTube format (0:00 \n text \n 0:05 \n text)
  const standaloneTime = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/;
  let curStart = null;
  let curTexts = [];

  for (const line of lines) {
    if (standaloneTime.test(line)) {
      const t = parseTime(line);
      if (curStart !== null && curTexts.length > 0) {
        const end = t > curStart ? t : curStart + 3.0;
        items.push({
          id: `sub_${idx++}`,
          start: parseFloat(curStart.toFixed(2)),
          end: parseFloat(end.toFixed(2)),
          duration: parseFloat((end - curStart).toFixed(2)),
          text: curTexts.join(' '),
          textVi: curTexts.join(' '),
        });
        curTexts = [];
      }
      curStart = t;
    } else {
      if (curStart !== null) curTexts.push(line);
    }
  }

  if (curStart !== null && curTexts.length > 0) {
    items.push({
      id: `sub_${idx++}`,
      start: parseFloat(curStart.toFixed(2)),
      end: parseFloat((curStart + 3.0).toFixed(2)),
      duration: 3.0,
      text: curTexts.join(' '),
      textVi: curTexts.join(' '),
    });
  }

  return items;
}

export default function CustomSubModal({ isOpen, onClose, onImportSubtitles }) {
  const [subText, setSubText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('youtube'); // 'youtube' | 'file'

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSubText(event.target?.result || '');
      setError('');
    };
    reader.onerror = () => {
      setError('Lỗi khi đọc file!');
    };
    reader.readAsText(file);
  };

  const handleParseAndApply = async () => {
    if (!subText.trim()) {
      setError('Vui lòng nhập hoặc dán nội dung phụ đề');
      return;
    }

    setIsParsing(true);
    setError('');

    try {
      const response = await fetch('/api/parse-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: subText,
          srtContent: subText,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.transcript?.length > 0) {
          onImportSubtitles(data.transcript);
          onClose();
          return;
        }
      }

      // Fallback: parse client-side if API fails
      const clientParsed = parseClientSubtitles(subText);
      if (clientParsed.length > 0) {
        onImportSubtitles(clientParsed);
        onClose();
        return;
      }

      setError('Không thể nhận diện định dạng phụ đề. Vui lòng kiểm tra lại mốc thời gian.');
    } catch (err) {
      // Fallback client-side
      const clientParsed = parseClientSubtitles(subText);
      if (clientParsed.length > 0) {
        onImportSubtitles(clientParsed);
        onClose();
        return;
      }
      setError('Lỗi kết nối máy chủ và không thể phân tích nội dung!');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Thêm phụ đề & Lời thoại</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 pt-4 pb-2">
          <button
            type="button"
            onClick={() => setTab('youtube')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'youtube'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4 text-red-400" />
            Copy từ YouTube (Nhanh nhất)
          </button>
          <button
            type="button"
            onClick={() => setTab('file')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'file'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            Tải file .SRT / .VTT
          </button>
        </div>

        <div className="py-2 space-y-4 flex-1 overflow-y-auto">
          {tab === 'youtube' ? (
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 space-y-1.5">
              <p className="font-bold flex items-center gap-1 text-indigo-300">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Cách lấy lời thoại từ bất kỳ video YouTube (trong 5 giây):
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px] leading-relaxed">
                <li>Mở video trên YouTube, nhìn xuống góc dưới mô tả video.</li>
                <li>Bấm dấu <strong>... (Xem thêm)</strong> ➔ chọn <strong>"Hiện bản ghi lời thoại"</strong> (Show transcript).</li>
                <li>Bôi đen toàn bộ lời thoại và bấm Copy (Ctrl+C).</li>
                <li>Dán vào ô bên dưới, hệ thống sẽ tự động bắt mốc thời gian và <strong>dịch sang Tiếng Việt</strong>!</li>
              </ol>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700/80 hover:border-indigo-500 rounded-2xl bg-slate-950/40 hover:bg-slate-950/80 transition cursor-pointer group">
              <Upload className="w-7 h-7 text-slate-500 group-hover:text-indigo-400 mb-2 transition" />
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                Bấm để chọn file .srt, .vtt hoặc .txt từ máy tính
              </span>
              <span className="text-[11px] text-slate-500 mt-1">Hỗ trợ đầy đủ UTF-8 đa ngôn ngữ</span>
              <input type="file" accept=".srt,.vtt,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          )}

          {/* Text Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {tab === 'youtube' ? 'Dán lời thoại đã copy từ YouTube vào đây:' : 'Hoặc dán nội dung văn bản phụ đề:'}
            </label>
            <textarea
              value={subText}
              onChange={(e) => {
                setSubText(e.target.value);
                setError('');
              }}
              rows={6}
              placeholder={
                tab === 'youtube'
                  ? `0:00\nHello everyone, welcome back!\n0:05\nToday we practice shadowing together.`
                  : `1\n00:00:01,000 --> 00:00:04,000\nHello everyone!\n\n2\n00:00:04,500 --> 00:00:08,000\nToday we learn shadowing.`
              }
              className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleParseAndApply}
            disabled={isParsing || !subText.trim()}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            {isParsing ? (
              <span>Đang dịch & xử lý...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Áp dụng & Tự dịch sang Tiếng Việt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
