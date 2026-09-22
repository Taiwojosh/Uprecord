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
      // Session invalid or expired — clear user cache and redirect if not already on auth/landing pages
      localStorage.removeItem('scholarSync_user');
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      if (pathname !== '/login' && pathname !== '/register' && pathname !== '/' && pathname !== '/admin' && pathname !== '/setup-password') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
