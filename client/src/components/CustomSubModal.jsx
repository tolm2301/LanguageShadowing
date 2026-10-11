import React, { useState } from 'react';
import { X, Upload, FileText, Check } from 'lucide-react';

export default function CustomSubModal({ isOpen, onClose, onImportSubtitles }) {
  const [subText, setSubText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');

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
      setError('Vui lòng nhập nội dung phụ đề SRT hoặc VTT');
      return;
    }

    setIsParsing(true);
    setError('');

    try {
      const response = await fetch('/api/parse-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srtContent: subText })
      });
      const data = await response.json();
      if (data.success && data.transcript?.length > 0) {
        onImportSubtitles(data.transcript);
        onClose();
      } else {
        setError(data.error || 'Không thể đọc được định dạng phụ đề!');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ!');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Thêm phụ đề thủ công (.srt / .vtt)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 flex-1 overflow-y-auto">
          <p className="text-xs text-slate-400 leading-relaxed">
            Nếu video YouTube không có sẵn phụ đề, bạn có thể tải lên tệp <code className="text-indigo-400">.srt</code> hoặc <code className="text-indigo-400">.vtt</code>, hoặc dán trực tiếp nội dung phụ đề vào ô bên dưới:
          </p>

          {/* Upload file button */}
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700/80 hover:border-indigo-500 rounded-2xl bg-slate-950/40 hover:bg-slate-950/80 transition cursor-pointer group">
            <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mb-2 transition" />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
              Bấm để chọn file .srt hoặc .vtt từ máy tính
            </span>
            <span className="text-[11px] text-slate-500 mt-1">Hỗ trợ phụ đề đa ngôn ngữ UTF-8</span>
            <input
              type="file"
              accept=".srt,.vtt,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Text Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Hoặc dán nội dung văn bản phụ đề:
            </label>
            <textarea
              value={subText}
              onChange={(e) => {
                setSubText(e.target.value);
                setError('');
              }}
              rows={6}
              placeholder={`1\n00:00:01,000 --> 00:00:04,000\nHello everyone, welcome back!\n\n2\n00:00:04,500 --> 00:00:08,000\nToday we will practice shadowing together.`}
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
              <span>Đang xử lý...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Áp dụng phụ đề</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
