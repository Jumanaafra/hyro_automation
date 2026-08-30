import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { token, user } = res.data.data;
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true, user };
        } catch (err) {
          const message = err.response?.data?.message || 'Login failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      register: async (name, email, password, role = 'operator') => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/register', { name, email, password, role });
          const { token, user } = res.data.data;
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true, user };
        } catch (err) {
          const message = err.response?.data?.message || 'Registration failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.data.user, isAuthenticated: true });
        } catch (err) {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'hyro_auth_store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
