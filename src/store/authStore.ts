'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: (username: string, password: string) => {
        console.log('🔐 AuthStore - Login intentado:', { username, password });
        if (username === 'admin' && password === 'admin') {
          console.log('🔐 AuthStore - Login exitoso, actualizando estado');
          set({ isAuthenticated: true, user: username });
          return true;
        }
        console.log('🔐 AuthStore - Login fallido');
        return false;
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
      },
    }),
    {
      name: 'nutrihome-auth',
    }
  )
);