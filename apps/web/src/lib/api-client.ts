import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  withCredentials: true,
});

// Attach gym slug header automatically from subdomain or localStorage
apiClient.interceptors.request.use((config) => {
  const gymSlug =
    typeof window !== 'undefined'
      ? localStorage.getItem('gymSlug') ?? extractSlugFromSubdomain()
      : null;

  if (gymSlug) {
    config.headers['x-gym-slug'] = gymSlug;
  }

  return config;
});

function extractSlugFromSubdomain(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length >= 3) return parts[0];
  return null;
}

export default apiClient;