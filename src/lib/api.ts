import axios from 'axios';

const api = axios.create({
  // Use same-origin API path; Next.js rewrites proxy this to Laravel.
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Voeg token automatisch toe aan elke request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sportmatch_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// Bij 401: stuur naar login pagina
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const requestUrl = String(error.config?.url ?? '');
      const isAuthRequest = requestUrl.includes('/login') || requestUrl.includes('/register');
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';

      if (isAuthRequest || isAuthPage) {
        return Promise.reject(error);
      }

      localStorage.removeItem('sportmatch_token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
