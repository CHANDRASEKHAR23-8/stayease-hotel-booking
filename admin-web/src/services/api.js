import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stayease_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('stayease_admin_token');
      localStorage.removeItem('stayease_admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authService = {
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data.data;
  },
  async getMe() {
    const res = await api.get('/auth/me');
    return res.data.data;
  },
};

export const adminService = {
  async getDashboard() {
    const res = await api.get('/admin/dashboard');
    return res.data.data;
  },
  async getPendingHotels() {
    const res = await api.get('/admin/hotels/pending');
    return res.data.data;
  },
  async approveHotel(hotelId) {
    const res = await api.post(`/admin/hotels/${hotelId}/approve`);
    return res.data.data;
  },
  async rejectHotel(hotelId, reason) {
    const res = await api.post(`/admin/hotels/${hotelId}/reject`, { reason });
    return res.data.data;
  },
  async getUsers(params = {}) {
    const res = await api.get('/admin/users', { params });
    return res.data.data;
  },
  async updateUserStatus(userId, status) {
    const res = await api.patch(`/admin/users/${userId}/status`, { status });
    return res.data.data;
  },
  async getBookings(params = {}) {
    const res = await api.get('/admin/bookings', { params });
    return res.data.data;
  },
  async getReports() {
    const res = await api.get('/admin/reports');
    return res.data.data;
  },
};

export default api;
