import React, { useState, useEffect, useRef } from 'react';
import { formatTime } from '../constants';
import { X, Search, Play, Volume2, Bookmark, Check } from 'lucide-react';

export default function TranscriptDrawer({
  isOpen,
  onClose,
  transcript = [],
  activeSubtitleIndex = -1,
  onSeek
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const activeItemRef = useRef(null);

  // Auto-scroll to active sentence when transcript drawer is open
  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [isOpen, activeSubtitleIndex]);

  if (!isOpen) return null;

  const filteredTranscript = transcript.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.text && item.text.toLowerCase().includes(q)) ||
      (item.textVi && item.textVi.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Toàn bộ kịch bản ({transcript.length})</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm từ vựng hoặc câu thoại..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Subtitle List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTranscript.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Không tìm thấy câu nào phù hợp với "{searchQuery}"
            </div>
          ) : (
            filteredTranscript.map((item, idx) => {
              const originalIndex = transcript.indexOf(item);
              const isActive = originalIndex === activeSubtitleIndex;

              return (
                <div
                  key={item.id || idx}
                  ref={isActive ? activeItemRef : null}
                  onClick={() => {
                    onSeek(item.start);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer text-left group ${
                    isActive
                      ? 'bg-indigo-600/20 border-indigo-500/80 ring-1 ring-indigo-500/40'
                      : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                        isActive
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {formatTime(item.start)} - {formatTime(item.end)}
                    </span>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 text-xs text-indigo-400 flex items-center gap-1 transition"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Phát
                    </button>
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      isActive ? 'text-white font-bold' : 'text-slate-300 group-hover:text-white'
                    }`}
                  >
                    {item.text}
                  </p>
                  {item.pinyin && (
                    <p className="text-[11px] text-indigo-300 font-sans tracking-wide mt-1">
                      🀄 Pinyin: {item.pinyin}
                    </p>
                  )}
                  {item.textVi && (
                    <p className="text-xs text-amber-300/80 mt-0.5 font-medium leading-relaxed">
                      🇻🇳 {item.textVi}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Nhấp vào bất kỳ câu nào để chuyển video đến đó</span>
          <span className="font-mono text-indigo-400 font-semibold">{transcript.length} câu</span>
        </div>
      </div>
    </div>
  );
}
