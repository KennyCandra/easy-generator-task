import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  apiClient,
  type AuthResponse,
  type AuthUser,
  getStoredAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '../api/client'
import type { SignInFormValues, SignUpFormValues } from '../schemas/auth.schema'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const initialAccessToken = useRef(getStoredAccessToken())
  const [accessTokenState, setAccessTokenState] = useState<string | null>(
    initialAccessToken.current,
  )
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(initialAccessToken.current))

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setAccessTokenState(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(clearSession)
  }, [clearSession])

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    setAccessToken(response.accessToken)
    setAccessTokenState(response.accessToken)
    setUser(response.user)
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!initialAccessToken.current) {
      return () => {
        isMounted = false
      }
    }

    apiClient
      .post<AuthResponse>('/auth/refresh')
      .then(({ data }) => {
        if (isMounted) {
          applyAuthResponse(data)
        }
      })
      .catch(() => {
        if (isMounted) {
          clearSession()
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [applyAuthResponse, clearSession])

  const signup = useCallback(
    async (values: SignUpFormValues) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/signup', values)
      applyAuthResponse(data)
    },
    [applyAuthResponse],
  )

  const signin = useCallback(
    async (values: SignInFormValues) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/signin', values)
      applyAuthResponse(data)
    },
    [applyAuthResponse],
  )

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: accessTokenState,
      user,
      isAuthenticated: Boolean(accessTokenState),
      isLoading,
      signin,
      signup,
      logout,
    }),
    [accessTokenState, isLoading, logout, signin, signup, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
