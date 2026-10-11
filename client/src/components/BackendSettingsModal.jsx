import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw, X, ExternalLink } from 'lucide-react';
import { getBackendUrl, saveBackendUrl, testBackendConnection } from '../utils/api';

export default function BackendSettingsModal({ isOpen, onClose, onBackendSaved }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(getBackendUrl());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testBackendConnection(url);
    setTesting(false);
    setTestResult(res);
  };

  const handleSave = () => {
    saveBackendUrl(url);
    if (onBackendSaved) onBackendSaved(url);
    onClose();
  };

  const handleReset = () => {
    setUrl('');
    saveBackendUrl('');
    if (onBackendSaved) onBackendSaved('');
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100">Cấu hình Backend (Render)</h3>
              <p className="text-xs text-slate-400">Kết nối máy chủ xử lý phụ đề YouTube & dịch thuật</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              URL Backend Render:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://shadowing-backend.onrender.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestResult(null);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Dán URL dịch vụ Render của bạn vào đây. Để trống sẽ dùng mặc định cổng cục bộ hoặc biến môi trường Vercel (<code className="text-purple-300">VITE_API_URL</code>).
            </p>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">
                  {testResult.success ? 'Kết nối máy chủ thành công!' : 'Kết nối thất bại'}
                </p>
                <p className="mt-0.5 opacity-90">
                  {testResult.success
                    ? 'Máy chủ Render đang hoạt động bình thường, sẵn sàng cào phụ đề.'
                    : `${testResult.error}. Lưu ý: Render bản miễn phí có thể mất ~30-50s để khởi động lại khi đang ngủ.`}
                </p>
              </div>
            </div>
          )}

          {/* Quick instructions */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 space-y-1.5">
            <p className="font-medium text-slate-300 flex items-center gap-1.5">
              <span>💡 Cách lấy link Render:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
              <li>Lên dashboard của Render, tạo <span className="text-slate-200">Web Service</span> từ repo GitHub.</li>
              <li>Sau khi Render deploy xong, copy link có đuôi <code className="text-purple-300">.onrender.com</code>.</li>
              <li>Dán link vào ô trên và bấm <span className="text-slate-200">Kiểm tra kết nối</span>.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Đặt lại mặc định
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm"
            >
              Lưu & Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
