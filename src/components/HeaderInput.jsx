import React, { useState } from 'react';
import { LANGUAGES } from '../constants';
import { Search, Link as LinkIcon, Sparkles, Clipboard, Check, FileText } from 'lucide-react';

export default function HeaderInput({
  selectedLang,
  onSelectLang,
  inputUrl,
  setInputUrl,
  onLoadVideo,
  isLoading,
  onOpenPasteSubModal,
}) {
  const [copied, setCopied] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch (err) {
      // Clipboard permissions or not supported
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputUrl?.trim()) {
      onLoadVideo(inputUrl.trim());
    }
  };

  const handleSelectSample = (sampleLang) => {
    onSelectLang(sampleLang.code);
    setInputUrl(`https://www.youtube.com/watch?v=${sampleLang.sampleVideoId}`);
    onLoadVideo(`https://www.youtube.com/watch?v=${sampleLang.sampleVideoId}`, sampleLang.code);
  };

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl mb-6">
      {/* Title & Language Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xl">
            S
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Shadowing Language
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Luyện nói & phản xạ ngôn ngữ theo phương pháp Shadowing chuẩn quốc tế
            </p>
          </div>
        </div>

        {/* Action Buttons & Language Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenPasteSubModal}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Dán phụ đề hoặc lời thoại có mốc thời gian"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Dán phụ đề / SRT</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            {LANGUAGES.map((lang) => {
              const isActive = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onSelectLang(lang.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={`${lang.name} (${lang.nativeName})`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  <span className="hidden sm:inline">{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Controls: Input YouTube Link */}
      <div className="mt-5">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Nhập đường link YouTube vào đây (ví dụ: https://www.youtube.com/watch?v=...)"
              className="w-full pl-10 pr-24 py-3 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
            />
            <button
              type="button"
              onClick={handlePaste}
              className="absolute inset-y-1.5 right-1.5 px-3 flex items-center gap-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
              title="Dán từ Clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-xs">Đã dán</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dán</span>
                </>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputUrl?.trim()}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang tải...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Học ngay</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Clips for instant trial */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto py-1 text-xs">
          <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Bài mẫu có sẵn:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelectSample(item)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/50 transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>{item.flag}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
