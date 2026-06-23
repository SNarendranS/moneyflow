import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Convenience wrappers
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

export const accountsAPI = {
  list: () => api.get('/accounts'),
  create: (data: any) => api.post('/accounts', data),
  update: (id: string, data: any) => api.put(`/accounts/${id}`, data),
  archive: (id: string) => api.patch(`/accounts/${id}/archive`),
  history: (id: string, params?: any) => api.get(`/accounts/${id}/history`, { params }),
};

export const categoriesAPI = {
  list: () => api.get('/categories'),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  createSub: (data: any) => api.post('/subcategories', data),
  updateSub: (id: string, data: any) => api.put(`/subcategories/${id}`, data),
  deleteSub: (id: string) => api.delete(`/subcategories/${id}`),
};

export const transactionsAPI = {
  list: (params?: any) => api.get('/transactions', { params }),
  create: (data: any) => api.post('/transactions', data),
  get: (id: string) => api.get(`/transactions/${id}`),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

export const tagsAPI = {
  list: () => api.get('/tags'),
  create: (data: any) => api.post('/tags', data),
  delete: (id: string) => api.delete(`/tags/${id}`),
};

export const goalsAPI = {
  list: () => api.get('/goals'),
  create: (data: any) => api.post('/goals', data),
  update: (id: string, data: any) => api.put(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  contribute: (id: string, data: any) => api.post(`/goals/${id}/contribute`, data),
  contributions: (id: string) => api.get(`/goals/${id}/contributions`),
  deleteContribution: (goalId: string, contributionId: string) => api.delete(`/goals/${goalId}/contributions/${contributionId}`),
};

export const recurringActionAPI = {
  markDone: (id: string) => api.post(`/recurring/${id}/done`),
  snooze: (id: string, days: number) => api.post(`/recurring/${id}/snooze`, { days }),
};

export const recurringAPI = {
  list: () => api.get('/recurring'),
  create: (data: any) => api.post('/recurring', data),
  update: (id: string, data: any) => api.put(`/recurring/${id}`, data),
  delete: (id: string) => api.delete(`/recurring/${id}`),
};

export const analyticsAPI = {
  dashboard: () => api.get('/dashboard'),
  monthly: (months?: number) => api.get('/analytics/monthly', { params: { months } }),
  categories: (params?: any) => api.get('/analytics/categories', { params }),
  savings: (months?: number) => api.get('/analytics/savings', { params: { months } }),
  insights: () => api.get('/analytics/insights'),
  family: () => api.get('/analytics/family'),
};

export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const searchAPI = {
  search: (q: string) => api.get('/search', { params: { q } }),
};
