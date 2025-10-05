import axios from 'axios';

const API_BASE_URL = 'https://smart-attend-backend-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { api };

export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (userData) => api.post('/auth/login', userData),
};

export const sessionService = {
  getSessions: () => api.get('/sessions'),
  createSession: (sessionData) => api.post('/sessions', sessionData),
  startSession: (sessionId) => api.post(`/sessions/${sessionId}/start`),
  endSession: (sessionId) => api.post(`/sessions/${sessionId}/end`),
};

export const attendanceService = {
  requestOTP: (data) => api.post('/attendance/request-otp', data),
  verifyOTP: (data) => api.post('/attendance/verify', data),
  getHistory: () => api.get('/attendance/history'),
  getSessionAttendance: (sessionId) => api.get(`/attendance/session/${sessionId}`)
};