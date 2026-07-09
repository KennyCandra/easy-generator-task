import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const ACCESS_TOKEN_KEY = 'accessToken'

let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
let onUnauthorized: (() => void) | undefined

export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

export function getStoredAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token

  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
    return
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const { data } = await axios.post<AuthResponse>(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )

      setAccessToken(data.accessToken)
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`

      return apiClient(originalRequest)
    } catch (refreshError) {
      setAccessToken(null)
      onUnauthorized?.()

      return Promise.reject(refreshError)
    }
  },
)

function isAuthEndpoint(url?: string) {
  return (
    url === '/auth/signup' ||
    url === '/auth/signin' ||
    url === '/auth/refresh' ||
    url === '/auth/logout'
  )
}
