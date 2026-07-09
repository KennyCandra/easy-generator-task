import { createContext } from 'react'
import type { AuthUser } from '../api/client'
import type { SignInFormValues, SignUpFormValues } from '../schemas/auth.schema'

export interface AuthContextValue {
  accessToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signin: (values: SignInFormValues) => Promise<void>
  signup: (values: SignUpFormValues) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
