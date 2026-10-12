import { defineStore } from 'pinia';
import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  }),
  getters: {
    estaLogueado: (state) => !!state.token,
    isAuthenticated: (state) => !!state.token,
    rol: (state) => state.usuario?.rol || null,
    isAdmin: (state) => state.usuario?.rol === 'admin',
    username: (state) => state.usuario?.usuario || '',
    label: (state) => (state.usuario?.rol === 'admin' ? 'Administrador' : 'Encargado'),
  },
  actions: {
    async login(usuario, contrasena) {
      try {
        const { data } = await api.post('/auth/login', { usuario, contrasena });
        this.token = data.token;
        this.usuario = data.usuario;
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        return true;
      } catch {
        return false;
      }
    },
    logout() {
      this.token = null;
      this.usuario = null;
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    },
  },
});