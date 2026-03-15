import axios, { AxiosInstance } from 'axios'
import { useAuthStore } from './auth-store'

// Use relative URL so requests go through Next.js rewrite proxy → no CORS
const API_BASE_URL = '/api/v1'

let apiClient: AxiosInstance | null = null

export function initializeApiClient(): AxiosInstance {
  if (apiClient) {
    return apiClient
  }

  apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor to add auth token
  apiClient.interceptors.request.use(
    (config) => {
      const { token, gymSlug } = useAuthStore.getState()
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      
      if (gymSlug) {
        config.headers['X-Gym-Slug'] = gymSlug
      }
      
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor: auto-unwrap { data, meta } envelope + handle 401
  apiClient.interceptors.response.use(
    (response) => {
      // Unwrap the NestJS ResponseInterceptor envelope { data: ..., meta: {...} }
      if (
        response.data &&
        typeof response.data === 'object' &&
        'data' in response.data &&
        'meta' in response.data
      ) {
        response.data = response.data.data
      }
      return response
    },
    (error) => {
      if (error.response?.status === 401) {
        const { logout } = useAuthStore.getState()
        logout()
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }
  )

  return apiClient
}

export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    return initializeApiClient()
  }
  return apiClient
}

export default getApiClient()
