import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'

import { auth } from './auth'

type AuthScreenProps = {
  onSuccess?: () => void
}

export default function AuthScreen({
  onSuccess,
}: AuthScreenProps) {
  const [mode, setMode] =
    useState<'login' | 'register'>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault()

    setError('')

    if (!email.trim()) {
      setError('Email wajib diisi.')
      return
    }

    if (password.length < 6) {
      setError(
        'Password minimal 6 karakter.',
      )
      return
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        )
      } else {
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        )
      }

      onSuccess?.()
    } catch (error) {
      console.error(
        'Auth error:',
        error,
      )

      const code =
        error &&
        typeof error === 'object' &&
        'code' in error
          ? String(
              (error as { code: unknown })
                .code,
            )
          : ''

      const message =
        error &&
        typeof error === 'object' &&
        'message' in error
          ? String(
              (error as { message: unknown })
                .message,
            )
          : ''

      /*
       * DIAGNOSIS SEMENTARA
       * Tampilkan kode error Firebase
       * supaya kita tahu penyebab sebenarnya.
       */
      if (code) {
        setError(
          `Firebase Error: ${code}\n\n${message}`,
        )
      } else {
        setError(
          'Firebase Error tidak diketahui.\n\n' +
            String(error),
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="welcome">
      <div className="top-bar">
        <strong>Bantu_In</strong>
      </div>

      <section className="detail-card">
        <h1>
          {mode === 'login'
            ? 'Selamat Datang'
            : 'Buat Akun'}
        </h1>

        <p className="description">
          {mode === 'login'
            ? 'Masuk untuk menggunakan Bantu_In.'
            : 'Daftar untuk mulai menggunakan Bantu_In.'}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: '14px',
          }}
        >
          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Masukkan email"
            autoComplete="email"
          />

          <label
            htmlFor="password"
            style={{
              marginTop: '8px',
            }}
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            placeholder="Minimal 6 karakter"
            autoComplete={
              mode === 'login'
                ? 'current-password'
                : 'new-password'
            }
          />

          {error && (
            <div
              className="error-message"
              style={{
                whiteSpace: 'pre-wrap',
                marginTop: '10px',
              }}
            >
              {error}
            </div>
          )}

          <div className="actions">
            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Memproses...'
                : mode === 'login'
                  ? 'Masuk'
                  : 'Daftar'}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('')
                setMode(
                  mode === 'login'
                    ? 'register'
                    : 'login',
                )
              }}
              disabled={loading}
            >
              {mode === 'login'
                ? 'Belum punya akun? Daftar'
                : 'Sudah punya akun? Masuk'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}