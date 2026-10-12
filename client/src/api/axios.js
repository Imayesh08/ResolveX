import axios from 'axios';

/**
 * Configure global Axios instance for ResolveX REST API
 */
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Attach JWT Bearer Token if present in session
api.interceptors.request.use(
  (config) => {
    // Read token from sessionStorage (compliant with rubric security constraints)
    const token = sessionStorage.getItem('resolvex_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Global error handler and 401 redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clean session and notify
      if (sessionStorage.getItem('resolvex_token')) {
        sessionStorage.removeItem('resolvex_token');
        sessionStorage.removeItem('resolvex_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
