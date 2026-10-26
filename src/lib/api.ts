export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('kasirpro_api_url');
    if (saved && saved.trim()) {
      const clean = saved.trim().replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
  }
  if (import.meta.env.VITE_API_URL) {
    const clean = (import.meta.env.VITE_API_URL as string).trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  return '/api';
}

export function setCustomApiUrl(url: string) {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('kasirpro_api_url');
    } else {
      let clean = url.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `http://${clean}`;
      }
      localStorage.setItem('kasirpro_api_url', clean);
    }
  }
}

export function getRawServerUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('kasirpro_api_url');
    if (saved && saved.trim()) return saved.trim();
  }
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).trim();
  }
  return '';
}

export async function testServerConnection(customUrl?: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  let target = customUrl && customUrl.trim() ? customUrl.trim().replace(/\/+$/, '') : getRawServerUrl();
  if (!target) {
    target = window.location.origin;
  } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
    target = `http://${target}`;
  }
  const endpoint = target.endsWith('/api') ? `${target}/health` : `${target}/api/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        message: `Server merespon dengan status ${res.status}: ${res.statusText}`,
      };
    }
    const data = await res.json();
    return {
      success: true,
      message: 'Berhasil terhubung ke server KasirPro!',
      data,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Koneksi timeout (6 detik). Pastikan HP & PC Server terhubung ke Wi-Fi yang sama.',
      };
    }
    return {
      success: false,
      message: err.message || 'Gagal menghubungi server.',
    };
  }
}

export function getToken(): string | null {
  return localStorage.getItem('kasirpro_token');
}

export function setToken(token: string) {
  localStorage.setItem('kasirpro_token', token);
}

export function removeToken() {
  localStorage.removeItem('kasirpro_token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; message?: string; [key: string]: any }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const apiBase = getApiBaseUrl();

  try {
    const res = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        // Token expired or invalid
        removeToken();
        if (window.location.pathname !== '/login') {
          // Notify app
        }
      }
      throw new Error(data.message || 'Terjadi kesalahan pada server.');
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal menghubungi server.',
    };
  }
}

export const formatRupiah = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
  return `Rp ${Number(val).toLocaleString('id-ID')}`;
};

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};
