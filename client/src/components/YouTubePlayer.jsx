import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Single loader promise for YouTube IFrame API script
let ytScriptPromise = null;
function loadYouTubeIframeApi() {
  if (ytScriptPromise) return ytScriptPromise;
  ytScriptPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      resolve(window.YT);
    };
  });
  return ytScriptPromise;
}

export default function YouTubePlayer({
  videoId,
  startTime = 0,
  rangeStart = 0,
  rangeEnd = null,
  loopRange = false,
  loopSentence = false,
  lockedSentence = null,
  activeSentence = null,
  autoPauseMode = false,
  playbackSpeed = 1.0,
  isTranscriptLoading = false,
  onTimeUpdate,
  onDurationChange,
  onPlayerStateChange,
  onAutoPaused,
  playerRef
}) {
  const containerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Keep refs for callbacks and reactive props to avoid closure stale state
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onPlayerStateChangeRef = useRef(onPlayerStateChange);
  const onDurationChangeRef = useRef(onDurationChange);
  const onAutoPausedRef = useRef(onAutoPaused);

  const loopRangeRef = useRef(loopRange);
  const loopSentenceRef = useRef(loopSentence);
  const lockedSentenceRef = useRef(lockedSentence);
  const rangeStartRef = useRef(rangeStart);
  const rangeEndRef = useRef(rangeEnd);
  const activeSentenceRef = useRef(activeSentence);
  const autoPauseModeRef = useRef(autoPauseMode);
  const playbackSpeedRef = useRef(playbackSpeed);
  const isTranscriptLoadingRef = useRef(isTranscriptLoading);
  const pausedSentenceIdRef = useRef(null);

  // Update refs on every render
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onPlayerStateChangeRef.current = onPlayerStateChange;
    onDurationChangeRef.current = onDurationChange;
    onAutoPausedRef.current = onAutoPaused;
  });

  useEffect(() => {
    loopRangeRef.current = loopRange;
  }, [loopRange]);

  useEffect(() => {
    loopSentenceRef.current = loopSentence;
  }, [loopSentence]);

  useEffect(() => {
    lockedSentenceRef.current = lockedSentence;
  }, [lockedSentence]);

  useEffect(() => {
    rangeStartRef.current = rangeStart;
  }, [rangeStart]);

  useEffect(() => {
    rangeEndRef.current = rangeEnd;
  }, [rangeEnd]);

  useEffect(() => {
    if (activeSentence?.id !== activeSentenceRef.current?.id) {
      pausedSentenceIdRef.current = null;
    }
    activeSentenceRef.current = activeSentence;
  }, [activeSentence]);

  useEffect(() => {
    autoPauseModeRef.current = autoPauseMode;
  }, [autoPauseMode]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (playerInstanceRef.current && isPlayerReady) {
      try {
        playerInstanceRef.current.setPlaybackRate(playbackSpeed);
      } catch (err) {}
    }
  }, [playbackSpeed, isPlayerReady]);

  useEffect(() => {
    isTranscriptLoadingRef.current = isTranscriptLoading;
    if (isTranscriptLoading && playerInstanceRef.current && isPlayerReady) {
      try {
        playerInstanceRef.current.pauseVideo();
      } catch (err) {}
    }
  }, [isTranscriptLoading, isPlayerReady]);

  // Expose player methods via playerRef
  useEffect(() => {
    if (!playerRef) return;
    playerRef.current = {
      play: () => {
        try {
          playerInstanceRef.current?.playVideo();
        } catch (e) {}
      },
      pause: () => {
        try {
          playerInstanceRef.current?.pauseVideo();
        } catch (e) {}
      },
      seekTo: (seconds, allowSeekAhead = true) => {
        try {
          playerInstanceRef.current?.seekTo(seconds, allowSeekAhead);
          if (onTimeUpdateRef.current) onTimeUpdateRef.current(seconds);
        } catch (e) {}
      },
      getCurrentTime: () => {
        try {
          return playerInstanceRef.current?.getCurrentTime() || 0;
        } catch (e) {
          return 0;
        }
      },
      getDuration: () => {
        try {
          return playerInstanceRef.current?.getDuration() || 0;
        } catch (e) {
          return 0;
        }
      },
      setSpeed: (speed) => {
        try {
          playerInstanceRef.current?.setPlaybackRate(speed);
        } catch (e) {}
      },
      isReady: isPlayerReady
    };
  }, [playerRef, isPlayerReady]);

  // 1. Initialize YT.Player on videoId change
  useEffect(() => {
    let isCancelled = false;
    setIsVideoLoading(true);
    setIsPlayerReady(false);

    loadYouTubeIframeApi().then((YT) => {
      if (isCancelled || !containerRef.current) return;

      // Clean up previous player
      if (playerInstanceRef.current && typeof playerInstanceRef.current.destroy === 'function') {
        try {
          playerInstanceRef.current.destroy();
        } catch (e) {}
        playerInstanceRef.current = null;
      }

      containerRef.current.innerHTML = '';
      const playerDiv = document.createElement('div');
      playerDiv.id = `yt-player-${Math.random().toString(36).substring(7)}`;
      playerDiv.className = 'w-full h-full';
      containerRef.current.appendChild(playerDiv);

      const player = new YT.Player(playerDiv.id, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(startTime || 0),
          fs: 1,
          iv_load_policy: 3,
          cc_load_policy: 0
        },
        events: {
          onReady: () => {
            if (isCancelled) return;
            playerInstanceRef.current = player;
            setIsPlayerReady(true);
            setIsVideoLoading(false);
            try {
              player.setPlaybackRate(playbackSpeedRef.current);
              const dur = player.getDuration();
              if (dur && onDurationChangeRef.current) onDurationChangeRef.current(dur);
            } catch (e) {}
          },
          onStateChange: (event) => {
            if (isCancelled) return;
            if (onPlayerStateChangeRef.current) {
              onPlayerStateChangeRef.current(event.data);
            }

            // If video is still loading transcript and somehow starts playing, pause it!
            if (isTranscriptLoadingRef.current && event.data === 1) {
              try {
                player.pauseVideo();
              } catch (e) {}
              return;
            }

            // event.data === 0 (ENDED)
            if (event.data === 0) {
              if (loopRangeRef.current) {
                player.seekTo(rangeStartRef.current || 0, true);
                player.playVideo();
                return;
              }
              if (loopSentenceRef.current && lockedSentenceRef.current) {
                player.seekTo(lockedSentenceRef.current.start, true);
                player.playVideo();
                return;
              }
            }
          },
          onError: () => {
            setIsVideoLoading(false);
          }
        }
      });
    });

    return () => {
      isCancelled = true;
      if (playerInstanceRef.current && typeof playerInstanceRef.current.destroy === 'function') {
        try {
          playerInstanceRef.current.destroy();
        } catch (e) {}
        playerInstanceRef.current = null;
      }
      setIsPlayerReady(false);
    };
  }, [videoId]);

  // 2. High-Frequency Real-time Sync Engine (runs every 40ms, indestructible)
  useEffect(() => {
    if (!isPlayerReady) return;

    const interval = setInterval(() => {
      const player = playerInstanceRef.current;
      if (!player || typeof player.getPlayerState !== 'function' || typeof player.getCurrentTime !== 'function') {
        return;
      }

      try {
        const state = player.getPlayerState();

        // If transcript is loading, pause immediately
        if (isTranscriptLoadingRef.current && state === 1) {
          player.pauseVideo();
          return;
        }

        // 1 = PLAYING, 3 = BUFFERING
        if (state === 1 || state === 3) {
          const currentTime = player.getCurrentTime();
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(currentTime);
          }

          // A. LOOP SENTENCE PRIORITY (Flawless precision)
          if (loopSentenceRef.current && lockedSentenceRef.current) {
            const sentence = lockedSentenceRef.current;
            // When currentTime reaches sentence end
            if (currentTime >= sentence.end - 0.06) {
              player.seekTo(sentence.start, true);
              player.playVideo();
              return;
            }
            // If currentTime drifted too far before sentence start
            if (currentTime < sentence.start - 0.5) {
              player.seekTo(sentence.start, true);
              player.playVideo();
              return;
            }
          }

          // B. LOOP RANGE (A-B Loop)
          if (
            loopRangeRef.current &&
            rangeEndRef.current &&
            rangeEndRef.current > rangeStartRef.current
          ) {
            if (currentTime >= rangeEndRef.current - 0.08 || currentTime < rangeStartRef.current - 0.4) {
              player.seekTo(rangeStartRef.current, true);
              player.playVideo();
              return;
            }
          }

          // C. AUTO-PAUSE ECHO MODE
          if (autoPauseModeRef.current && activeSentenceRef.current) {
            const sub = activeSentenceRef.current;
            if (
              currentTime >= sub.end - 0.12 &&
              pausedSentenceIdRef.current !== sub.id
            ) {
              pausedSentenceIdRef.current = sub.id;
              player.pauseVideo();
              if (onAutoPausedRef.current) onAutoPausedRef.current(sub);
              return;
            }
          }
        }
      } catch (err) {}
    }, 40);

    return () => clearInterval(interval);
  }, [isPlayerReady]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-800/80 group">
      {/* Overlay: Video Loading */}
      {isVideoLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm transition-opacity">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-200">Đang tải video YouTube...</p>
        </div>
      )}

      {/* Overlay: Transcript Loading (Prevents video running ahead) */}
      {!isVideoLoading && isTranscriptLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl flex flex-col items-center max-w-sm text-center">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2.5" />
            <p className="text-sm font-bold text-white mb-1">Đang tải phụ đề & bản dịch song ngữ...</p>
            <p className="text-xs text-slate-400">
              Video sẽ tự động sẵn sàng ngay khi phụ đề được nạp xong.
            </p>
          </div>
        </div>
      )}

      {/* Container where YT.Player mounts */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}