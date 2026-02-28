import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  const gymSlug = await SecureStore.getItemAsync('gymSlug');

  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (gymSlug) config.headers['x-gym-slug'] = gymSlug;

  return config;
});

export default apiClient;