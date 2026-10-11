import React, { useState } from 'react';
import { formatTime, PLAYBACK_SPEEDS, LANGUAGES } from '../constants';
import {
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Eye,
  EyeOff,
  List,
  Volume2,
  Gauge,
  Mic,
  Copy,
  Check,
  Languages,
  BookOpen,
  Sparkles,
  Columns,
  MessageSquare
} from 'lucide-react';

export default function SubtitleSection({
  transcript = [],
  activeSubtitle = null,
  activeSubtitleIndex = -1,
  currentTime = 0,
  playbackSpeed = 1.0,
  onChangeSpeed,
  onSeek,
  onPrevSentence,
  onNextSentence,
  onReplayCurrentSentence,
  loopSentence,
  onToggleLoopSentence,
  autoPauseMode,
  onToggleAutoPause,
  isAutoPaused = false,
  onResumeAfterAutoPause,
  onOpenTranscriptDrawer,
  onOpenCustomSubModal,
  selectedLang = 'en',
  isBlindMode: propBlindMode,
  onToggleBlindMode,
  showPinyin: propShowPinyin,
  onToggleShowPinyin,
  activeTab: propActiveTab,
  onChangeActiveTab,
}) {
  const [internalBlindMode, setInternalBlindMode] = useState(false);
  const isBlindMode = propBlindMode !== undefined ? propBlindMode : internalBlindMode;
  const toggleBlindMode = onToggleBlindMode || (() => setInternalBlindMode(!internalBlindMode));

  const [internalActiveTab, setInternalActiveTab] = useState('bilingual');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const changeActiveTab = onChangeActiveTab || setInternalActiveTab;

  const [internalShowPinyin, setInternalShowPinyin] = useState(true);
  const showPinyin = propShowPinyin !== undefined ? propShowPinyin : internalShowPinyin;
  const toggleShowPinyin = onToggleShowPinyin || (() => setInternalShowPinyin(!internalShowPinyin));

  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedVi, setCopiedVi] = useState(false);

  const hasPinyinInTranscript =
    selectedLang === 'zh' || transcript.some((t) => !!t.pinyin);

  const prevSubtitle = activeSubtitleIndex > 0 ? transcript[activeSubtitleIndex - 1] : null;
  const nextSubtitle =
    activeSubtitleIndex >= 0 && activeSubtitleIndex < transcript.length - 1
      ? transcript[activeSubtitleIndex + 1]
      : null;

  const currentLangObj = LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[0];

  const handlePrevSentence = () => {
    if (onPrevSentence) {
      onPrevSentence();
    } else if (prevSubtitle) {
      onSeek(prevSubtitle.start);
    } else if (activeSubtitle) {
      onSeek(activeSubtitle.start);
    }
  };

  const handleNextSentence = () => {
    if (onNextSentence) {
      onNextSentence();
    } else if (nextSubtitle) {
      onSeek(nextSubtitle.start);
    }
  };

  const handleCopy = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'original') {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 1500);
    } else {
      setCopiedVi(true);
      setTimeout(() => setCopiedVi(false), 1500);
    }
  };

  const handleSpeak = (text, langCode) => {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const codeMap = {
        en: 'en-US',
        zh: 'zh-CN',
        ja: 'ja-JP',
        ko: 'ko-KR',
        th: 'th-TH',
        vi: 'vi-VN',
      };
      utterance.lang = codeMap[langCode] || 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-md">
      {/* Top Header: View Tabs & Utilities */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
        {/* Tabs: Song song 2 bên | Phụ đề gốc | Dịch tiếng Việt */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => changeActiveTab('bilingual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bilingual'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Song song 2 bên</span>
          </button>

          <button
            type="button"
            onClick={() => changeActiveTab('original')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'original'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>{currentLangObj.flag} Phụ đề gốc</span>
          </button>

          <button
            type="button"
            onClick={() => changeActiveTab('vietnamese')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'vietnamese'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>🇻🇳 Dịch tiếng Việt</span>
          </button>
        </div>

        {/* Right Utilities: Luyện nghe mù & Toàn bộ kịch bản */}
        <div className="flex items-center gap-2">
          {/* Blind Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              toggleBlindMode();
              setIsRevealed(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isBlindMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Che phụ đề để luyện nghe phản xạ thuần túy (Blind Shadowing)"
          >
            {isBlindMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isBlindMode ? 'Đang che phụ đề' : 'Luyện nghe mù'}
            </span>
          </button>

          {/* View Full Transcript button */}
          <button
            type="button"
            onClick={onOpenTranscriptDrawer}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Xem toàn bộ danh sách phụ đề"
          >
            <List className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Toàn bộ kịch bản ({transcript.length})</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div
        className={`grid gap-4 lg:gap-6 ${
          activeTab === 'bilingual'
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1'
        }`}
      >
        {/* LEFT CARD: PHỤ ĐỀ (Bỏ chữ Shadowing theo yêu cầu người dùng, KHÔNG có Pinyin) */}
        {(activeTab === 'bilingual' || activeTab === 'original') && (
          <div className="flex flex-col bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            {/* Header: PHỤ ĐỀ */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black tracking-wider uppercase text-slate-100 flex items-center gap-1.5">
                  <span className="text-base">{currentLangObj.flag}</span>
                  Phụ đề
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {currentLangObj.name}
                </span>
              </div>

              {activeSubtitle && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                    {formatTime(activeSubtitle.start)} - {formatTime(activeSubtitle.end)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSpeak(activeSubtitle.text, selectedLang)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Nghe máy đọc câu gốc"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeSubtitle.text, 'original')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Sao chép phụ đề gốc"
                  >
                    {copiedOriginal ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Subtitle Content Box */}
            <div
              className={`relative min-h-[140px] md:min-h-[160px] rounded-xl p-4 transition-all flex flex-col justify-center border ${
                isAutoPaused
                  ? 'bg-amber-950/20 border-amber-500/40 ring-2 ring-amber-500/20'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              {/* Auto-pause prompt banner */}
              {isAutoPaused && (
                <div className="absolute top-2 inset-x-3 flex items-center justify-between bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs text-amber-300 animate-pulse">
                  <span className="flex items-center gap-1 font-bold">
                    <Mic className="w-3 h-3 text-amber-400" />
                    Đang dừng để bạn nhại lại!
                  </span>
                  <button
                    type="button"
                    onClick={onResumeAfterAutoPause}
                    className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition cursor-pointer"
                  >
                    Tiếp tục (Space)
                  </button>
                </div>
              )}

              {/* Previous Sentence */}
              {prevSubtitle && !isBlindMode && (
                <p
                  onClick={() => onSeek(prevSubtitle.start)}
                  className="text-xs text-slate-500 hover:text-slate-400 cursor-pointer truncate mb-2 transition"
                  title="Nhấn để nghe câu trước"
                >
                  ↑ {prevSubtitle.text}
                </p>
              )}

              {/* Active Sentence (High contrast hero font) */}
              {activeSubtitle ? (
                <div className="my-1">
                  {isBlindMode && !isRevealed ? (
                    <div
                      onClick={() => setIsRevealed(true)}
                      className="py-4 text-center cursor-pointer select-none group"
                    >
                      <p className="text-xs md:text-sm text-slate-400 group-hover:text-amber-300 transition flex items-center justify-center gap-2">
                        <EyeOff className="w-4 h-4 text-amber-400" />
                        Phụ đề đang ẩn để luyện tai nghe. Nhấp để xem đáp án!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg md:text-2xl font-bold text-white tracking-normal leading-relaxed text-balance">
                        {activeSubtitle.text}
                      </p>
                      {isBlindMode && isRevealed && (
                        <button
                          type="button"
                          onClick={() => setIsRevealed(false)}
                          className="text-[11px] text-amber-400 underline mt-1 hover:text-amber-300"
                        >
                          Ẩn lại phụ đề
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">
                  {transcript.length > 0 ? (
                    <span>Đang chờ câu thoại tiếp theo...</span>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <p className="text-slate-400">Chưa có phụ đề tự động cho video này.</p>
                      <button
                        type="button"
                        onClick={onOpenCustomSubModal}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      >
                        + Nhập phụ đề SRT/VTT thủ công
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Next Sentence */}
              {nextSubtitle && !isBlindMode && (
                <p
                  onClick={() => onSeek(nextSubtitle.start)}
                  className="text-xs text-slate-500 hover:text-slate-400 cursor-pointer truncate mt-2 transition"
                  title="Nhấn để chuyển câu sau"
                >
                  ↓ {nextSubtitle.text}
                </p>
              )}
            </div>

            {/* Sentence navigation buttons */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/60 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevSentence}
                  disabled={!activeSubtitle && activeSubtitleIndex <= 0}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Câu trước (Phím ←)"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                  <span>Câu trước</span>
                </button>

                <button
                  type="button"
                  onClick={onReplayCurrentSentence}
                  disabled={!activeSubtitle}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                  title="Lặp lại câu này (Phím R)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Lặp lại câu</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextSentence}
                  disabled={activeSubtitleIndex >= transcript.length - 1}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Câu sau (Phím →)"
                >
                  <span>Câu sau</span>
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Loop Current Sentence Toggle */}
              <button
                type="button"
                onClick={onToggleLoopSentence}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  loopSentence
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Tự động lặp lại câu này mãi mãi đến khi bạn nói trôi chảy"
              >
                <Repeat className={`w-3.5 h-3.5 ${loopSentence ? 'animate-spin-slow' : ''}`} />
                <span>Lặp câu: {loopSentence ? 'BẬT' : 'TẮT'}</span>
              </button>
            </div>
          </div>
        )}

        {/* RIGHT CARD: DỊCH SANG TIẾNG VIỆT & PINYIN (Pinyin đặt tại phần dịch hỗ trợ) */}
        {(activeTab === 'bilingual' || activeTab === 'vietnamese') && (
          <div className="flex flex-col bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            {/* Header: DỊCH SANG TIẾNG VIỆT */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black tracking-wider uppercase text-amber-300 flex items-center gap-1.5">
                  <span className="text-base">🇻🇳</span>
                  Dịch sang tiếng Việt
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Tự động đồng bộ
                </span>
                {hasPinyinInTranscript && (
                  <button
                    type="button"
                    onClick={toggleShowPinyin}
                    className={`text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-md transition cursor-pointer border ${
                      showPinyin
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title="Bật/Tắt hiển thị dòng phiên âm Pinyin ở phần dịch"
                  >
                    Pinyin: {showPinyin ? 'BẬT' : 'TẮT'}
                  </button>
                )}
              </div>

              {activeSubtitle && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSpeak(activeSubtitle.textVi || activeSubtitle.text, 'vi')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Nghe đọc tiếng Việt"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeSubtitle.textVi, 'vi')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Sao chép bản dịch tiếng Việt"
                  >
                    {copiedVi ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Translation Content Box */}
            <div className="relative min-h-[140px] md:min-h-[160px] rounded-xl p-4 bg-slate-900/60 border border-slate-800/80 flex flex-col justify-center">
              {/* Previous Translation */}
              {prevSubtitle && (
                <div
                  onClick={() => onSeek(prevSubtitle.start)}
                  className="text-xs text-slate-500 hover:text-slate-400 cursor-pointer truncate mb-2 transition"
                  title="Bản dịch câu trước"
                >
                  ↑ {prevSubtitle.pinyin && showPinyin ? `[${prevSubtitle.pinyin}] ` : ''}{prevSubtitle.textVi || '...'}
                </div>
              )}

              {/* Active Translation & Pinyin */}
              {activeSubtitle ? (
                <div className="my-1">
                  {/* Pinyin phiên âm nằm trang trọng ở phần dịch */}
                  {activeSubtitle.pinyin && showPinyin && (
                    <div className="mb-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Pinyin:</span>
                        <span className="text-xs md:text-sm font-medium font-sans select-text tracking-wide text-indigo-200">
                          {activeSubtitle.pinyin}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bản dịch tiếng Việt */}
                  <p className="text-lg md:text-2xl font-bold text-amber-200/90 tracking-normal leading-relaxed text-balance">
                    {activeSubtitle.textVi || activeSubtitle.text}
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">
                  {transcript.length > 0 ? (
                    <span>Bản dịch tiếng Việt sẽ tự động hiển thị theo câu thoại...</span>
                  ) : (
                    <span>Chưa có dữ liệu bản dịch.</span>
                  )}
                </div>
              )}

              {/* Next Translation */}
              {nextSubtitle && (
                <div
                  onClick={() => onSeek(nextSubtitle.start)}
                  className="text-xs text-slate-500 hover:text-slate-400 cursor-pointer truncate mt-2 transition"
                  title="Bản dịch câu sau"
                >
                  ↓ {nextSubtitle.pinyin && showPinyin ? `[${nextSubtitle.pinyin}] ` : ''}{nextSubtitle.textVi || '...'}
                </div>
              )}
            </div>

            {/* Translation footer note */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Phiên âm Pinyin & Bản dịch ngữ cảnh
              </span>
              <span className="font-mono text-slate-500">
                {activeSubtitleIndex >= 0 ? `Câu ${activeSubtitleIndex + 1} / ${transcript.length}` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ergonomic Control Bar: Speed & Echo Mode (Replacing the old repeat 5s|10s|15s) */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60">
        {/* Playback Speed Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Gauge className="w-4 h-4 text-indigo-400" />
            <span>Tốc độ phát âm:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {PLAYBACK_SPEEDS.map((sp) => {
              const isSelected = playbackSpeed === sp.value;
              return (
                <button
                  key={sp.label}
                  type="button"
                  onClick={() => onChangeSpeed(sp.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {sp.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Echo / Auto-Pause mode switch */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              Chế độ Echo (Dừng sau mỗi câu)
            </span>
            <span className="text-[10px] text-slate-400">
              Tự dừng video để bạn nhại lại câu trước khi sang câu kế
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleAutoPause}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoPauseMode ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                autoPauseMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}