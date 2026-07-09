import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { useAuth } from '../context/useAuth'

interface MeResponse {
  message: string
}

export function AppPage() {
  const { logout, user } = useAuth()
  const [message, setMessage] = useState('Loading...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    apiClient
      .get<MeResponse>('/me')
      .then(({ data }) => {
        if (isMounted) {
          setMessage(data.message)
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Unable to load the protected page')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="app-page">
      <section className="app-panel">
        <div>
          <p className="eyebrow">Application</p>
          <h1>{message}</h1>
          {user && <p className="muted">Signed in as {user.name}</p>}
          {error && <p className="form-error">{error}</p>}
        </div>

        <button type="button" className="secondary-button" onClick={logout}>
          Logout
        </button>
      </section>
    </main>
  )
}
