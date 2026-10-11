import React from 'react';
import { X, Keyboard } from 'lucide-react';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Phát / Tạm dừng video' },
    { key: 'R', desc: 'Lặp lại ngay lập tức câu hiện tại' },
    { key: '←', desc: 'Nhảy về câu thoại trước' },
    { key: '→', desc: 'Nhảy tới câu thoại kế tiếp' },
    { key: '1 / 2 / 3', desc: 'Tua lùi 5s / 10s / 15s' },
    { key: 'L', desc: 'Bật / Tắt lặp vô tận câu hiện tại' },
    { key: 'P', desc: 'Bật / Tắt chế độ Echo (tự dừng sau mỗi câu)' },
    { key: 'B', desc: 'Bật / Tắt chế độ nghe mù (Blind Shadowing)' },
    { key: '[ / ]', desc: 'Giảm / Tăng tốc độ phát âm (0.5x - 1.25x)' },
    { key: 'T', desc: 'Mở / Đóng toàn bộ kịch bản kịch bản' },
    { key: '?', desc: 'Mở bảng phím tắt này' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Phím tắt công thái học (Ergonomic Shortcuts)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
            >
              <span className="text-xs text-slate-300">{item.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700 font-mono text-xs font-bold shadow-sm">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
          >
            Đã hiểu, bắt đầu luyện tập!
          </button>
        </div>
      </div>
    </div>
  );
}
