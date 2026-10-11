import React, { useState, useEffect, useRef, useCallback } from 'react';
import HeaderInput from './components/HeaderInput';
import YouTubePlayer from './components/YouTubePlayer';
import RangeBar from './components/RangeBar';
import SubtitleSection from './components/SubtitleSection';
import TranscriptDrawer from './components/TranscriptDrawer';
import CustomSubModal from './components/CustomSubModal';
import ShortcutsModal from './components/ShortcutsModal';
import { LANGUAGES, formatTime, PLAYBACK_SPEEDS } from './constants';
import {
  Keyboard,
  FileText,
  AlertCircle,
  HelpCircle,
  Volume2,
  ExternalLink,
  Info
} from 'lucide-react';

function App() {
  // Current selection state
  const [selectedLang, setSelectedLang] = useState('en');
  const [inputUrl, setInputUrl] = useState('https://www.youtube.com/watch?v=UF8uR6Z6KLc');
  const [videoId, setVideoId] = useState('UF8uR6Z6KLc');
  const [videoInfo, setVideoInfo] = useState({
    title: 'Steve Jobs - Stanford Speech (Full HD)',
    author_name: 'Stanford University'
  });

  // Transcript state
  const [transcript, setTranscript] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Duration & Range state
  const [selectedDuration, setSelectedDuration] = useState(60); // 60 seconds (1 min) by default
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(60);
  const [loopRange, setLoopRange] = useState(false);

  // Playback & Shadowing state
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [loopSentence, setLoopSentence] = useState(false);
  const [lockedSentence, setLockedSentence] = useState(null);
  const [autoPauseMode, setAutoPauseMode] = useState(false);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [playerState, setPlayerState] = useState(-1);

  // Modals state
  const [isTranscriptDrawerOpen, setIsTranscriptDrawerOpen] = useState(false);
  const [isCustomSubModalOpen, setIsCustomSubModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

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
      // 1. Fetch Video Info
      fetch(`/api/video-info?videoId=${vId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.title) {
            setVideoInfo(data);
          }
        })
        .catch(() => {});

      // 2. Fetch Transcript
      const resp = await fetch(`/api/transcript?videoId=${vId}&lang=${langCode || selectedLang}`);
      const data = await resp.json();

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
          setErrorMsg('Không tìm thấy phụ đề tự động trên YouTube cho ngôn ngữ này. Bạn có thể tự thêm phụ đề bên dưới.');
        }
      }
    } catch (err) {
      console.error('Error fetching transcript:', err);
      setErrorMsg('Không thể kết nối đến máy chủ lấy phụ đề.');
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
    setVideoId(id);
    const targetLang = langOverride || selectedLang;
    loadVideoData(id, targetLang);
  };

  // Handle Language switch
  const handleSelectLang = (langCode) => {
    setSelectedLang(langCode);
    const langObj = LANGUAGES.find((l) => l.code === langCode);
    if (langObj) {
      const sampleIds = LANGUAGES.map((l) => l.sampleVideoId);
      if (!inputUrl || sampleIds.includes(videoId)) {
        const newUrl = `https://www.youtube.com/watch?v=${langObj.sampleVideoId}`;
        setInputUrl(newUrl);
        setVideoId(langObj.sampleVideoId);
        loadVideoData(langObj.sampleVideoId, langCode);
        return;
      }
    }
    loadVideoData(videoId, langCode);
  };

  // Handle Duration preset change (30s, 1m, 2m, All)
  const handleSelectDuration = (seconds) => {
    setSelectedDuration(seconds);
    if (seconds === 0) {
      setRangeStart(0);
      setRangeEnd(videoDuration || 3600);
    } else {
      const start = Math.floor(currentTime);
      setRangeStart(start);
      setRangeEnd(start + seconds);
    }
  };

  const handleChangeRange = (start, end) => {
    setRangeStart(start);
    setRangeEnd(end);
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
        {/* TOP: Header, Link Input, Language Selector, Choose Long */}
        <HeaderInput
          selectedLang={selectedLang}
          onSelectLang={handleSelectLang}
          inputUrl={inputUrl}
          setInputUrl={setInputUrl}
          onLoadVideo={handleLoadVideo}
          isLoading={isLoading}
          selectedDuration={selectedDuration}
          onSelectDuration={handleSelectDuration}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          videoDuration={videoDuration}
          onSetCustomRange={handleChangeRange}
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
          onToggleLoopRange={() => setLoopRange(!loopRange)}
          onSeek={handleSeek}
        />

        {/* Subtitle Warning Banner if no auto-captions */}
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{errorMsg}</p>
                <p className="text-amber-400/80 mt-1">
                  Mẹo: Bạn có thể nhập phụ đề thủ công (.srt/.vtt) hoặc bấm chọn một video mẫu bên trên để trải nghiệm ngay.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomSubModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition shrink-0 cursor-pointer"
            >
              + Nhập SRT/VTT
            </button>
          </div>
        )}

        {/* BOTTOM: Bilingual Subtitle Section (Left: Phụ đề, Right: Dịch sang tiếng Việt) */}
        <SubtitleSection
          transcript={transcript}
          activeSubtitle={activeSubtitle}
          activeSubtitleIndex={activeSubtitleIndex}
          currentTime={currentTime}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={setPlaybackSpeed}
          onSeek={handleSeek}
          onPrevSentence={handlePrevSentence}
          onNextSentence={handleNextSentence}
          onReplayCurrentSentence={handleReplaySentence}
          loopSentence={loopSentence}
          onToggleLoopSentence={handleToggleLoopSentence}
          autoPauseMode={autoPauseMode}
          onToggleAutoPause={() => setAutoPauseMode(!autoPauseMode)}
          isAutoPaused={isAutoPaused}
          onResumeAfterAutoPause={handleResumeAfterAutoPause}
          onOpenTranscriptDrawer={() => setIsTranscriptDrawerOpen(true)}
          onOpenCustomSubModal={() => setIsCustomSubModalOpen(true)}
          selectedLang={selectedLang}
        />

        {/* Ergonomic Quick Footer Toolbar */}
        <footer className="mt-8 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsShortcutsModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-slate-300 transition cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Phím tắt (Bấm <strong>?</strong>)</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsCustomSubModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-slate-300 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Tải phụ đề ngoài (.srt / .vtt)</span>
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

      {/* Custom Subtitle SRT/VTT Modal */}
      <CustomSubModal
        isOpen={isCustomSubModalOpen}
        onClose={() => setIsCustomSubModalOpen(false)}
        onImportSubtitles={(customTrans) => {
          setTranscript(customTrans);
          setErrorMsg('');
        }}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}

export default App;
