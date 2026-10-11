import React, { useState, useEffect, useRef, useCallback } from 'react';
import HeaderInput from './components/HeaderInput';
import YouTubePlayer from './components/YouTubePlayer';
import RangeBar from './components/RangeBar';
import SubtitleSection from './components/SubtitleSection';
import TranscriptDrawer from './components/TranscriptDrawer';
import ShortcutsModal from './components/ShortcutsModal';
import BackendSettingsModal from './components/BackendSettingsModal';
import CookieSettingsModal from './components/CookieSettingsModal';
import { LANGUAGES, formatTime, PLAYBACK_SPEEDS } from './constants';
import { getApiEndpoint, getBackendUrl, getApiHeaders } from './utils/api';
import {
  getSavedCurrentLang,
  saveCurrentLang,
  getSavedLanguageVideos,
  saveVideoForLanguage,
  getSavedConfig,
  saveConfig,
  getSavedYtCookie,
} from './utils/storage';
import {
  Keyboard,
  FileText,
  AlertCircle,
  HelpCircle,
  Volume2,
  ExternalLink,
  Info,
  Server,
  Cookie,
} from 'lucide-react';

function App() {
  // Read saved state or defaults from localStorage
  const savedConfig = getSavedConfig();
  const savedLang = getSavedCurrentLang();
  const savedLangVideos = getSavedLanguageVideos();
  const currentLangVideo = savedLangVideos[savedLang] || {
    url: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc',
    videoId: 'UF8uR6Z6KLc',
    title: 'Steve Jobs - Stanford Speech (Full HD)',
    author_name: 'Stanford University',
    rangeStart: 0,
    rangeEnd: 60,
  };

  // Current selection state
  const [selectedLang, setSelectedLang] = useState(savedLang);
  const [inputUrl, setInputUrl] = useState(currentLangVideo.url);
  const [videoId, setVideoId] = useState(currentLangVideo.videoId);
  const [videoInfo, setVideoInfo] = useState({
    title: currentLangVideo.title || '',
    author_name: currentLangVideo.author_name || ''
  });

  // Transcript state
  const [transcript, setTranscript] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Duration & Range state
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [rangeStart, setRangeStart] = useState(currentLangVideo.rangeStart || 0);
  const [rangeEnd, setRangeEnd] = useState(currentLangVideo.rangeEnd || 60);
  const [loopRange, setLoopRange] = useState(!!savedConfig.loopRange);

  // Playback & Shadowing state
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(savedConfig.playbackSpeed || 1.0);
  const [loopSentence, setLoopSentence] = useState(false);
  const [lockedSentence, setLockedSentence] = useState(null);
  const [autoPauseMode, setAutoPauseMode] = useState(!!savedConfig.autoPauseMode);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [playerState, setPlayerState] = useState(-1);

  // Ergonomic preferences from localStorage
  const [isBlindMode, setIsBlindMode] = useState(!!savedConfig.isBlindMode);
  const [showPinyin, setShowPinyin] = useState(savedConfig.showPinyin !== false);
  const [activeTab, setActiveTab] = useState(savedConfig.activeTab || 'bilingual');

  // Modals state
  const [isTranscriptDrawerOpen, setIsTranscriptDrawerOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [hasCookie, setHasCookie] = useState(!!getSavedYtCookie());

  const playerRef = useRef(null);

  // Helper to extract video ID
  const extractId = (urlOrId) => {
    if (!urlOrId) return '';
    const clean = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : '';
  };

  // Load Transcript and Video Info
  const loadVideoData = useCallback(async (vId, langCode) => {
    if (!vId) return;
    setIsLoading(true);
    setErrorMsg('');
    setTranscript([]);
    setLockedSentence(null);
    setLoopSentence(false);
    playerRef.current?.pause();

    try {
      // 1. Fetch Video Info (with browser oEmbed fallback)
      fetch(getApiEndpoint(`/api/video-info?videoId=${vId}`))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.title) {
            setVideoInfo(data);
            saveVideoForLanguage(langCode || selectedLang, {
              title: data.title,
              author_name: data.author_name || data.author,
            });
          } else {
            // Direct client fallback to YouTube oEmbed
            fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vId}&format=json`)
              .then((r) => (r.ok ? r.json() : null))
              .then((oembed) => {
                if (oembed && oembed.title) {
                  const fallbackInfo = {
                    videoId: vId,
                    title: oembed.title,
                    author: oembed.author_name || '',
                    thumbnail: oembed.thumbnail_url || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
                  };
                  setVideoInfo(fallbackInfo);
                  saveVideoForLanguage(langCode || selectedLang, {
                    title: fallbackInfo.title,
                    author_name: fallbackInfo.author,
                  });
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});

      // 2. Fetch Transcript
      const resp = await fetch(getApiEndpoint(`/api/transcript?videoId=${vId}&lang=${langCode || selectedLang}`), {
        headers: getApiHeaders(),
      });
      
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Máy chủ API trả về mã HTTP ${resp.status} (không phải JSON). Vui lòng kiểm tra lại dịch vụ Backend trên Render.`
        );
      }

      const data = await resp.json();

      if (!resp.ok && data?.error) {
        throw new Error(data.error);
      }

      if (data.transcript && data.transcript.length > 0) {
        setTranscript(data.transcript);
        setErrorMsg('');
        if (data.transcript[0]?.start !== undefined) {
          playerRef.current?.seekTo(data.transcript[0].start, true);
        }
      } else {
        setTranscript([]);
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setErrorMsg('Không tìm thấy phụ đề tự động trên YouTube cho ngôn ngữ này. Vui lòng chọn video khác có phụ đề.');
        }
      }
    } catch (err) {
      console.error('Error fetching transcript:', err);
      const backend = getBackendUrl();
      const rawError = err.message || '';
      let displayError = rawError;

      if (/IP-blocked|BotGuard|bot|Sign in|PoToken/i.test(rawError)) {
        displayError = 'YouTube chặn máy chủ đám mây lấy phụ đề video này (BotGuard). Vui lòng bấm "Thêm Cookie YouTube" bên dưới để vượt chặn tự động.';
      } else if (!rawError) {
        displayError = backend
          ? `Không thể kết nối đến Backend Render (${backend}). Máy chủ miễn phí có thể đang khởi động lại (mất ~30s).`
          : `Chưa kết nối Backend Render hoặc máy chủ chưa sẵn sàng. Bạn có thể bấm "Backend Render" ở góc trên để cài đặt link.`;
      }

      setErrorMsg(displayError);
      setTranscript([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLang]);

  // Initial load on startup
  useEffect(() => {
    loadVideoData(videoId, selectedLang);
  }, []);

  // Handle URL submit
  const handleLoadVideo = (url, langOverride) => {
    const id = extractId(url);
    if (!id) {
      setErrorMsg('Đường dẫn YouTube không hợp lệ!');
      return;
    }
    const targetLang = langOverride || selectedLang;
    setVideoId(id);
    saveVideoForLanguage(targetLang, {
      url,
      videoId: id,
    });
    loadVideoData(id, targetLang);
  };

  // Handle Language switch - restore saved video for that language
  const handleSelectLang = (langCode) => {
    setSelectedLang(langCode);
    saveCurrentLang(langCode);

    const savedVideos = getSavedLanguageVideos();
    const langVideo = savedVideos[langCode];

    if (langVideo) {
      setInputUrl(langVideo.url);
      setVideoId(langVideo.videoId);
      setVideoInfo({
        title: langVideo.title || '',
        author_name: langVideo.author_name || '',
      });
      setRangeStart(langVideo.rangeStart || 0);
      setRangeEnd(langVideo.rangeEnd || 60);
      loadVideoData(langVideo.videoId, langCode);
    } else {
      loadVideoData(videoId, langCode);
    }
  };

  // Handle Duration preset change (30s, 1m, 2m, All)
  const handleSelectDuration = (seconds) => {
    setSelectedDuration(seconds);
    let s = 0;
    let e = 60;
    if (seconds === 0) {
      s = 0;
      e = videoDuration || 3600;
    } else {
      s = Math.floor(currentTime);
      e = s + seconds;
    }
    setRangeStart(s);
    setRangeEnd(e);
    saveVideoForLanguage(selectedLang, { rangeStart: s, rangeEnd: e });
  };

  const handleChangeRange = (start, end) => {
    setRangeStart(start);
    setRangeEnd(end);
    saveVideoForLanguage(selectedLang, { rangeStart: start, rangeEnd: end });
  };

  const handleChangeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    saveConfig({ playbackSpeed: speed });
  };

  const handleToggleAutoPause = () => {
    const next = !autoPauseMode;
    setAutoPauseMode(next);
    saveConfig({ autoPauseMode: next });
  };

  const handleToggleLoopRange = () => {
    const next = !loopRange;
    setLoopRange(next);
    saveConfig({ loopRange: next });
  };

  const handleToggleBlindMode = () => {
    const next = !isBlindMode;
    setIsBlindMode(next);
    saveConfig({ isBlindMode: next });
  };

  const handleToggleShowPinyin = () => {
    const next = !showPinyin;
    setShowPinyin(next);
    saveConfig({ showPinyin: next });
  };

  const handleChangeActiveTab = (tab) => {
    setActiveTab(tab);
    saveConfig({ activeTab: tab });
  };

  // Calculate Active Subtitle
  let activeSubtitleIndex = -1;
  let activeSubtitle = null;

  if (loopSentence && lockedSentence) {
    activeSubtitle = lockedSentence;
    activeSubtitleIndex = transcript.findIndex((s) => s.id === lockedSentence.id);
    if (activeSubtitleIndex === -1 && transcript.length > 0) {
      activeSubtitleIndex = 0;
    }
  } else if (transcript && transcript.length > 0) {
    // 1. Exact match within timestamp
    for (let i = 0; i < transcript.length; i++) {
      const sub = transcript[i];
      if (currentTime >= sub.start && currentTime <= sub.end) {
        activeSubtitleIndex = i;
        activeSubtitle = sub;
        break;
      }
    }
    // 2. Bridge gaps between sentences so subtitle stays visible
    if (activeSubtitleIndex === -1) {
      for (let i = 0; i < transcript.length; i++) {
        const sub = transcript[i];
        if (currentTime < sub.start) {
          if (i > 0) {
            activeSubtitleIndex = i - 1;
            activeSubtitle = transcript[i - 1];
          } else {
            activeSubtitleIndex = 0;
            activeSubtitle = transcript[0];
          }
          break;
        }
      }
      if (activeSubtitleIndex === -1 && transcript.length > 0) {
        activeSubtitleIndex = transcript.length - 1;
        activeSubtitle = transcript[transcript.length - 1];
      }
    }
  }

  // Seek helper
  const handleSeek = (seconds) => {
    setIsAutoPaused(false);
    playerRef.current?.seekTo(seconds, true);
    playerRef.current?.play();
  };

  // Toggle sentence loop
  const handleToggleLoopSentence = () => {
    if (!loopSentence) {
      let target = activeSubtitle;
      if (!target && transcript && transcript.length > 0) {
        target =
          transcript.find((s) => currentTime >= s.start && currentTime <= s.end) ||
          transcript.find((s) => s.start >= currentTime) ||
          transcript[0];
      }
      if (target) {
        setLockedSentence(target);
        setLoopSentence(true);
        if (currentTime < target.start || currentTime >= target.end - 0.1) {
          handleSeek(target.start);
        }
      }
    } else {
      setLoopSentence(false);
      setLockedSentence(null);
    }
  };

  // Sentence navigation
  const handleNextSentence = () => {
    if (activeSubtitleIndex >= 0 && activeSubtitleIndex < transcript.length - 1) {
      const nextSub = transcript[activeSubtitleIndex + 1];
      if (loopSentence) {
        setLockedSentence(nextSub);
      }
      handleSeek(nextSub.start);
    }
  };

  const handlePrevSentence = () => {
    if (activeSubtitleIndex > 0) {
      const prevSub = transcript[activeSubtitleIndex - 1];
      if (loopSentence) {
        setLockedSentence(prevSub);
      }
      handleSeek(prevSub.start);
    } else if (activeSubtitle) {
      handleSeek(activeSubtitle.start);
    }
  };

  // Relative jump (-5s, -10s, -15s)
  const handleJumpRelative = (delta) => {
    setIsAutoPaused(false);
    const target = Math.max(0, currentTime + delta);
    handleSeek(target);
  };

  // Replay current sentence
  const handleReplaySentence = () => {
    const target = lockedSentence || activeSubtitle;
    if (target) {
      setIsAutoPaused(false);
      handleSeek(target.start);
    }
  };

  // Auto-paused trigger callback from YouTubePlayer
  const handleAutoPaused = (sub) => {
    setIsAutoPaused(true);
  };

  const handleResumeAfterAutoPause = () => {
    setIsAutoPaused(false);
    playerRef.current?.play();
  };

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isAutoPaused) {
            handleResumeAfterAutoPause();
          } else if (playerState === 1) {
            playerRef.current?.pause();
          } else {
            playerRef.current?.play();
          }
          break;

        case 'KeyR':
          e.preventDefault();
          handleReplaySentence();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          handlePrevSentence();
          break;

        case 'ArrowRight':
          e.preventDefault();
          handleNextSentence();
          break;

        case 'Digit1':
          e.preventDefault();
          handleJumpRelative(-5);
          break;

        case 'Digit2':
          e.preventDefault();
          handleJumpRelative(-10);
          break;

        case 'Digit3':
          e.preventDefault();
          handleJumpRelative(-15);
          break;

        case 'KeyL':
          e.preventDefault();
          handleToggleLoopSentence();
          break;

        case 'KeyP':
          e.preventDefault();
          setAutoPauseMode((prev) => !prev);
          break;

        case 'KeyT':
          e.preventDefault();
          setIsTranscriptDrawerOpen((prev) => !prev);
          break;

        case 'Slash':
          if (e.shiftKey) {
            e.preventDefault();
            setIsShortcutsModalOpen((prev) => !prev);
          }
          break;

        case 'BracketLeft': {
          e.preventDefault();
          const speeds = PLAYBACK_SPEEDS.map((s) => s.value);
          const idx = speeds.indexOf(playbackSpeed);
          if (idx > 0) setPlaybackSpeed(speeds[idx - 1]);
          break;
        }

        case 'BracketRight': {
          e.preventDefault();
          const speeds = PLAYBACK_SPEEDS.map((s) => s.value);
          const idx = speeds.indexOf(playbackSpeed);
          if (idx < speeds.length - 1) setPlaybackSpeed(speeds[idx + 1]);
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAutoPaused,
    playerState,
    activeSubtitle,
    activeSubtitleIndex,
    transcript,
    currentTime,
    playbackSpeed
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-6 px-4 md:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-5xl">
        {/* TOP: Header, Link Input, Language Selector */}
        <HeaderInput
          selectedLang={selectedLang}
          onSelectLang={handleSelectLang}
          inputUrl={inputUrl}
          setInputUrl={setInputUrl}
          onLoadVideo={handleLoadVideo}
          isLoading={isLoading}
          onOpenBackendSettings={() => setIsBackendModalOpen(true)}
          onOpenCookieSettings={() => setIsCookieModalOpen(true)}
          hasCookie={hasCookie}
        />

        {/* Video Info Title Banner */}
        {videoInfo.title && (
          <div className="flex items-center justify-between px-3 mb-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-200 truncate max-w-lg">
              {videoInfo.title}
            </span>
            <span className="font-mono text-slate-500 hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </span>
          </div>
        )}

        {/* MIDDLE: YouTube Video Player (matching wireframe) */}
        <div className="relative mb-5">
          <YouTubePlayer
            videoId={videoId}
            startTime={rangeStart}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            loopRange={loopRange}
            loopSentence={loopSentence}
            lockedSentence={lockedSentence}
            activeSentence={activeSubtitle}
            autoPauseMode={autoPauseMode}
            playbackSpeed={playbackSpeed}
            isTranscriptLoading={isLoading}
            onTimeUpdate={setCurrentTime}
            onDurationChange={setVideoDuration}
            onPlayerStateChange={setPlayerState}
            onAutoPaused={handleAutoPaused}
            playerRef={playerRef}
          />
        </div>

        {/* Clip Duration Slicing Bar (From mm:ss To mm:ss) */}
        <RangeBar
          currentTime={currentTime}
          duration={videoDuration}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onChangeRange={handleChangeRange}
          loopRange={loopRange}
          onToggleLoopRange={handleToggleLoopRange}
          onSeek={handleSeek}
        />

        {/* Subtitle Warning Banner if no auto-captions */}
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{errorMsg}</p>
                <p className="text-amber-400/80 mt-0.5">
                  Bạn có thể chọn bài học mẫu ở trên, hoặc thêm YouTube Cookie để mở khóa 100% video.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsCookieModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5"
              >
                <Cookie className="w-3.5 h-3.5 text-amber-400" />
                <span>Thêm Cookie</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBackendModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 font-semibold whitespace-nowrap transition cursor-pointer"
              >
                Cấu hình Backend
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM: Bilingual Subtitle Section (Left: Phụ đề, Right: Dịch sang tiếng Việt) */}
        <SubtitleSection
          transcript={transcript}
          activeSubtitle={activeSubtitle}
          activeSubtitleIndex={activeSubtitleIndex}
          currentTime={currentTime}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={handleChangeSpeed}
          onSeek={handleSeek}
          onPrevSentence={handlePrevSentence}
          onNextSentence={handleNextSentence}
          onReplayCurrentSentence={handleReplaySentence}
          loopSentence={loopSentence}
          onToggleLoopSentence={handleToggleLoopSentence}
          autoPauseMode={autoPauseMode}
          onToggleAutoPause={handleToggleAutoPause}
          isAutoPaused={isAutoPaused}
          onResumeAfterAutoPause={handleResumeAfterAutoPause}
          onOpenTranscriptDrawer={() => setIsTranscriptDrawerOpen(true)}
          selectedLang={selectedLang}
          isBlindMode={isBlindMode}
          onToggleBlindMode={handleToggleBlindMode}
          showPinyin={showPinyin}
          onToggleShowPinyin={handleToggleShowPinyin}
          activeTab={activeTab}
          onChangeActiveTab={handleChangeActiveTab}
        />

        {/* Ergonomic Quick Footer Toolbar */}
        <footer className="mt-8 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsShortcutsModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-slate-300 transition cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Phím tắt (Bấm <strong>?</strong>)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBackendModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-purple-300 text-slate-400 transition cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>Cấu hình Backend (Render)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-amber-300 text-slate-400 transition cursor-pointer"
            >
              <Cookie className="w-3.5 h-3.5 text-amber-400" />
              <span>YouTube Cookie {hasCookie ? '(Đã lưu)' : ''}</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-600">
            Hỗ trợ 5 ngôn ngữ: Tiếng Anh, Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Thái
          </p>
        </footer>
      </div>

      {/* Slide-out Full Transcript Drawer */}
      <TranscriptDrawer
        isOpen={isTranscriptDrawerOpen}
        onClose={() => setIsTranscriptDrawerOpen(false)}
        transcript={transcript}
        activeSubtitleIndex={activeSubtitleIndex}
        onSeek={(seconds) => {
          if (loopSentence) {
            const sub = transcript.find((s) => Math.abs(s.start - seconds) < 0.1);
            if (sub) setLockedSentence(sub);
          }
          handleSeek(seconds);
        }}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Backend Settings Modal */}
      <BackendSettingsModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
        onBackendSaved={() => loadVideoData(videoId)}
      />

      {/* Cookie Settings Modal */}
      <CookieSettingsModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
        onCookieUpdated={(val) => {
          setHasCookie(!!val);
          if (val) loadVideoData(videoId, selectedLang);
        }}
      />
    </div>
  );
}

export default App;
