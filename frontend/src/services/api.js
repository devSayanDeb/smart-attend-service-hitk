import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth services
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/users/profile'),
};

// Session services
export const sessionService = {
  getSessions: () => api.get('/sessions'),
  createSession: (sessionData) => api.post('/sessions', sessionData),
  startSession: (sessionId) => api.post(`/sessions/${sessionId}/start`),
  endSession: (sessionId) => api.post(`/sessions/${sessionId}/end`),
};

// Add this to attendanceService object:
export const attendanceService = {
  requestOTP: (data) => api.post('/attendance/request-otp', data),
  verifyOTP: (data) => api.post('/attendance/verify', data),
  getHistory: () => api.get('/attendance/history'),
  getSessionAttendance: (sessionId) => api.get(`/attendance/session/${sessionId}`) // Add this line
};

export default api;