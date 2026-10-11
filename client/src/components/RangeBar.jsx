import React, { useState, useEffect } from 'react';
import { formatTime, parseTimeString } from '../constants';
import { Repeat, Play, Pause, RotateCcw, SlidersHorizontal, ArrowRight, CornerDownRight } from 'lucide-react';

export default function RangeBar({
  currentTime,
  duration,
  rangeStart,
  rangeEnd,
  onChangeRange,
  loopRange,
  onToggleLoopRange,
  onSeek
}) {
  const [startInput, setStartInput] = useState(formatTime(rangeStart));
  const [endInput, setEndInput] = useState(formatTime(rangeEnd || duration || 0));

  useEffect(() => {
    setStartInput(formatTime(rangeStart));
  }, [rangeStart]);

  useEffect(() => {
    setEndInput(formatTime(rangeEnd || duration || 0));
  }, [rangeEnd, duration]);

  const handleStartBlur = () => {
    const val = parseTimeString(startInput);
    const validStart = Math.max(0, Math.min(val, (rangeEnd || duration) - 1));
    onChangeRange(validStart, rangeEnd);
    setStartInput(formatTime(validStart));
  };

  const handleEndBlur = () => {
    const val = parseTimeString(endInput);
    const maxDur = duration > 0 ? duration : 3600;
    const validEnd = Math.max(rangeStart + 1, Math.min(val, maxDur));
    onChangeRange(rangeStart, validEnd);
    setEndInput(formatTime(validEnd));
  };

  const handleToggleLoop = () => {
    const sVal = parseTimeString(startInput);
    const eVal = parseTimeString(endInput);
    const maxDur = duration > 0 ? duration : 3600;
    const validStart = Math.max(0, Math.min(sVal, maxDur - 1));
    const validEnd = Math.max(validStart + 1, Math.min(eVal || maxDur, maxDur));
    onChangeRange(validStart, validEnd);

    if (!loopRange) {
      if (currentTime < validStart || currentTime >= validEnd) {
        onSeek(validStart);
      }
    }
    onToggleLoopRange();
  };

  const setStartToCurrent = () => {
    const validStart = Math.max(0, Math.floor(currentTime));
    const currentEndVal = parseTimeString(endInput) || rangeEnd || (duration > 0 ? duration : 60);
    const validEnd = Math.max(validStart + 1, currentEndVal);
    onChangeRange(validStart, validEnd);
    setStartInput(formatTime(validStart));
    setEndInput(formatTime(validEnd));
  };

  const setEndToCurrent = () => {
    const validEnd = Math.ceil(currentTime);
    const currentStartVal = parseTimeString(startInput);
    const validStart = Math.min(currentStartVal, Math.max(0, validEnd - 1));
    onChangeRange(validStart, validEnd);
    setStartInput(formatTime(validStart));
    setEndInput(formatTime(validEnd));
  };

  const segmentLength = Math.max(0, (rangeEnd || duration || 0) - rangeStart);

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Time slice info */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span>Đoạn clip chọn lọc:</span>
          </div>

          {/* Start Time input */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Từ:</span>
            <input
              type="text"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              onBlur={handleStartBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleStartBlur()}
              className="w-14 bg-transparent text-center font-mono font-bold text-xs text-white focus:outline-none focus:text-indigo-400"
              placeholder="00:00"
            />
            <button
              type="button"
              onClick={setStartToCurrent}
              title="Đặt điểm Bắt đầu tại vị trí đang phát"
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition cursor-pointer"
            >
              Lấy hiện tại
            </button>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />

          {/* End Time input */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Đến:</span>
            <input
              type="text"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              onBlur={handleEndBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleEndBlur()}
              className="w-14 bg-transparent text-center font-mono font-bold text-xs text-white focus:outline-none focus:text-indigo-400"
              placeholder="01:00"
            />
            <button
              type="button"
              onClick={setEndToCurrent}
              title="Đặt điểm Kết thúc tại vị trí đang phát"
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition cursor-pointer"
            >
              Lấy hiện tại
            </button>
          </div>

          {/* Segment duration badge */}
          <div className="text-xs text-slate-400 font-medium">
            (Độ dài: <span className="font-mono text-indigo-400 font-bold">{formatTime(segmentLength)}</span>)
          </div>
        </div>

        {/* Action buttons: Replay Range & Loop Range toggle */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => onSeek(rangeStart)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Nhảy về đầu đoạn clip đã chọn"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Về đầu đoạn</span>
          </button>

          <button
            type="button"
            onClick={handleToggleLoop}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              loopRange
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
            }`}
            title="Lặp lại liên tục đoạn clip đã chọn"
          >
            <Repeat className={`w-3.5 h-3.5 ${loopRange ? 'animate-spin-slow' : ''}`} />
            <span>Lặp đoạn clip ({loopRange ? 'BẬT' : 'TẮT'})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
