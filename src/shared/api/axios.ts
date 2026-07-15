import axios from 'axios';

import { store } from '@/src/core/store';
import { supabase } from '@/src/features/auth/supabase';
import { apiBaseUrl } from '@/src/shared/config/env';

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const tokenFromStore = store.getState().auth.accessToken;

  if (tokenFromStore) {
    config.headers.Authorization = `Bearer ${tokenFromStore}`;
    return config;
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        await supabase.auth.signOut();
      }
    }
    return Promise.reject(error);
  },
);
