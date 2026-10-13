import { getSavedYtCookie } from './storage';

export const BACKEND_URL_STORAGE_KEY = 'shadowing_backend_url';

// Get active backend URL
export function getBackendUrl() {
  try {
    const saved = localStorage.getItem(BACKEND_URL_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch (e) {}

  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) {
    return import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
  }

  return ''; // Relative path for local development proxy (/api/...)
}

// Save or clear custom backend URL
export function saveBackendUrl(url) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(BACKEND_URL_STORAGE_KEY);
    } else {
      localStorage.setItem(BACKEND_URL_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
    }
  } catch (e) {}
}

// Format API endpoint
export function getApiEndpoint(path) {
  const base = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

// Get standard API headers with optional YouTube cookie
export function getApiHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  const cookie = getSavedYtCookie();
  if (cookie) {
    headers['x-yt-cookie'] = cookie;
  }
  return headers;
}

// Test connectivity to a backend URL
export async function testBackendConnection(url) {
  const target = (url || getBackendUrl() || '').trim().replace(/\/+$/, '');
  const endpoint = target ? `${target}/api/health` : '/api/health';
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }
    return { success: false, error: `HTTP ${res.status} ${res.statusText}` };
  } catch (err) {
    return { success: false, error: err.message || 'Không thể kết nối đến máy chủ' };
  }
}

// Verify YouTube cookie functionality against backend
export async function verifyYtCookie(cookie, backendUrl) {
  const target = (backendUrl || getBackendUrl() || '').trim().replace(/\/+$/, '');
  const endpoint = target ? `${target}/api/verify-cookie` : '/api/verify-cookie';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cookie }),
      signal: AbortSignal.timeout(45000), // 45s to allow Render free tier to wake up
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message || 'Lỗi kết nối tới máy chủ khi kiểm tra cookie' };
  }
}
