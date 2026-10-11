import React, { useState, useEffect } from 'react';
import {
  X,
  Cookie,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Trash2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { getSavedYtCookie, saveYtCookie } from '../utils/storage';
import { verifyYtCookie, getBackendUrl } from '../utils/api';

export default function CookieSettingsModal({ isOpen, onClose, onCookieUpdated }) {
  const [cookieInput, setCookieInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // { success: boolean, message: string }
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'guide'

  useEffect(() => {
    if (isOpen) {
      setCookieInput(getSavedYtCookie() || '');
      setVerifyStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = cookieInput.trim();
    saveYtCookie(trimmed);
    setVerifyStatus({
      success: true,
      message: trimmed ? 'Đã lưu Cookie thành công vào trình duyệt!' : 'Đã xóa Cookie.',
    });
    if (onCookieUpdated) onCookieUpdated(trimmed);
  };

  const handleClear = () => {
    saveYtCookie('');
    setCookieInput('');
    setVerifyStatus({
      success: true,
      message: 'Đã xóa Cookie khỏi trình duyệt.',
    });
    if (onCookieUpdated) onCookieUpdated('');
  };

  const handleVerify = async () => {
    const trimmed = cookieInput.trim();
    if (!trimmed) {
      setVerifyStatus({
        success: false,
        message: 'Vui lòng dán Cookie trước khi kiểm tra.',
      });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus(null);

    try {
      const result = await verifyYtCookie(trimmed, getBackendUrl());
      if (result.success) {
        setVerifyStatus({
          success: true,
          message: result.message || 'Cookie hoạt động hoàn hảo! Đã kết nối được với YouTube.',
        });
        saveYtCookie(trimmed);
        if (onCookieUpdated) onCookieUpdated(trimmed);
      } else {
        setVerifyStatus({
          success: false,
          message: result.error || 'Cookie không hợp lệ hoặc YouTube đã từ chối.',
        });
      }
    } catch (err) {
      setVerifyStatus({
        success: false,
        message: err.message || 'Không thể kết nối đến máy chủ kiểm tra.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const hasSavedCookie = !!getSavedYtCookie();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">YouTube Cookie (Vượt chặn BotGuard)</h3>
              <p className="text-xs text-gray-500">
                Cho phép máy chủ Render tải được phụ đề của bất kỳ video YouTube nào
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-100 px-6 pt-3 gap-2 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('input')}
            className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'input'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Nhập Cookie
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Hướng dẫn lấy Cookie (10s)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'input' ? (
            <>
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Tại sao cần Cookie?</strong> YouTube chặn địa chỉ IP máy chủ đám mây (Render / AWS) cào phụ đề.
                  Cookie chỉ được lưu trên máy của bạn và gửi kèm API để xác thực, giúp tải 100% phụ đề tự động.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nội dung Cookie (JSON, Netscape hoặc chuỗi dạng name=value)
                </label>
                <textarea
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder={`Dán chuỗi Cookie từ extension Cookie-Editor vào đây...\nVí dụ dạng JSON: [{"name":"LOGIN_INFO","value":"..."}, ...]\nHoặc dạng chuỗi: LOGIN_INFO=...; VISITOR_INFO1_LIVE=...;`}
                  rows={6}
                  className="w-full text-xs font-mono p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Status feedback */}
              {verifyStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    verifyStatus.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {verifyStatus.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{verifyStatus.message}</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 text-xs text-gray-700">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Cách lấy Cookie YouTube cực kỳ đơn giản:</h4>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>
                    Cài đặt tiện ích mở rộng <strong>Cookie-Editor</strong> trên Chrome/Edge/Firefox:{' '}
                    <a
                      href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-600 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      Cài Cookie-Editor <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </li>
                  <li>
                    Mở trang web{' '}
                    <a
                      href="https://www.youtube.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-600 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      youtube.com <ExternalLink className="w-3 h-3 inline" />
                    </a>{' '}
                    (đã đăng nhập tài khoản Google).
                  </li>
                  <li>
                    Bấm vào biểu tượng <strong>Cookie-Editor</strong> ở góc trên trình duyệt.
                  </li>
                  <li>
                    Bấm vào nút <strong>Export</strong> ở góc dưới, chọn <strong>Export as JSON</strong>.
                  </li>
                  <li>
                    Quay lại đây, chuyển sang tab <strong>"Nhập Cookie"</strong> và <strong>Dán (Ctrl + V)</strong> rồi bấm <strong>Lưu</strong>.
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Mẹo:</strong> Bạn cũng có thể thiết lập biến môi trường <code>YOUTUBE_COOKIE</code> trực tiếp trong phần <strong>Environment Variables</strong> trên Render Dashboard để mọi thiết bị đều được dùng chung mà không cần dán trên web!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasSavedCookie && (
              <button
                onClick={handleClear}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-transparent transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa Cookie
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerify}
              disabled={isVerifying || !cookieInput.trim()}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                'Kiểm tra kết nối'
              )}
            </button>
            <button
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all shadow-amber-600/20"
            >
              Lưu & Sử dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
