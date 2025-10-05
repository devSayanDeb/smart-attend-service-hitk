import { create } from 'zustand';
import { authService } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(credentials);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      set({ user, token, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      set({ user, token, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
