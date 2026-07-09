import { zodResolver } from '@hookform/resolvers/zod'
import { AxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import {
  signInSchema,
  type SignInFormValues,
} from '../schemas/auth.schema'
import { getFieldErrorMessages } from '../utils/formErrors'

export function SignInPage() {
  const { signin } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignInFormValues>({
    criteriaMode: 'all',
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(signInSchema),
  })

  useEffect(() => {
    const subscription = watch(() => {
      setServerError(null)
    })

    return () => subscription.unsubscribe()
  }, [watch])

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      await signin(values)
      navigate('/app', { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error, 'Unable to sign in'))
    }
  })

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-header">
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in</h1>
        </div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <label>
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby="signin-email-error"
              {...register('email')}
            />
            <FieldErrors id="signin-email-error" messages={getFieldErrorMessages(errors.email)} />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="signin-password-error"
              {...register('password')}
            />
            <FieldErrors
              id="signin-password-error"
              messages={getFieldErrorMessages(errors.password)}
            />
          </label>

          {serverError && <p className="form-error">{serverError}</p>}

          <button type="submit" disabled={isSubmitting || !isValid}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </section>
    </main>
  )
}

function FieldErrors({ id, messages }: { id: string; messages: string[] }) {
  if (messages.length === 0) {
    return null
  }

  return (
    <ul className="field-errors" id={id}>
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message

    if (Array.isArray(message)) {
      return message[0] ?? fallback
    }

    if (typeof message === 'string') {
      return message
    }
  }

  return fallback
}
