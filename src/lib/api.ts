import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Automatically sends and receives HttpOnly cookies
});

// Helper to extract a cookie value by name in browser context
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

// Request interceptor: Attach CSRF token on outgoing state-modifying requests
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('uprecord_csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session invalidation / expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear cached user context
      localStorage.removeItem('scholarSync_user');

      // Exclude auth-recovery requests and public auth pages so in-page error banners render properly
      const reqUrl = error.config?.url || '';
      const isRecoveryEndpoint =
        reqUrl.includes('/verify-reset-token') ||
        reqUrl.includes('/verify-setup-token') ||
        reqUrl.includes('/reset-password') ||
        reqUrl.includes('/setup-password') ||
        reqUrl.includes('/forgot-password') ||
        reqUrl.includes('/login');

      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const isExemptPage =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/' ||
        pathname === '/admin' ||
        pathname === '/setup-password' ||
        pathname === '/forgot-password' ||
        pathname === '/reset-password';

      if (!isRecoveryEndpoint && !isExemptPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
