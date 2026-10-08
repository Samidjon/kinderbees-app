import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'

type Role = 'parent' | 'coach' | 'admin'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    const redirectIfSignedIn = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      const role = profile?.role as Role | undefined
      if (role) nav(`/${role}`, { replace: true })
    }

    void redirectIfSignedIn()
  }, [nav])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (!normalizedEmail || !password) {
        setError('Please enter your email and password.')
        return
      }

      if (mode === 'register') {
        if (!name.trim()) {
          setError('Please enter your full name.')
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          return
        }

        // If email confirmation is disabled, Supabase returns a session immediately.
        if (data.session) {
          nav('/parent', { replace: true })
          return
        }

        setMessage('Account created. Check your email to confirm your account, then sign in.')
        setMode('login')
        return
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (!data.user) {
        setError('Unable to sign in. Please try again.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        setError(profileError.message)
        return
      }

      const role = profile.role as Role
      nav(`/${role}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  return (
    <main className="auth-page">
      <div className="auth-side">
        <Logo />
        <span className="eyebrow">KINDERBEES FOOTBALL ACADEMY</span>
        <h1>One simple place for families and the academy.</h1>
        <p>Parents reserve sessions and manage children, while KinderBees staff manage training from one secure system.</p>
        <div className="auth-quote">“Play. Learn. Grow.”</div>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-mobile-logo"><Logo compact /></div>

          <div className="tab-row">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Login</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Register</button>
          </div>

          <h2>{mode === 'login' ? 'Welcome back 👋' : 'Create your parent account'}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'Sign in with your email and password. Your account role is assigned by KinderBees.'
              : 'New accounts start as Parent accounts. An academy administrator can assign Coach access later.'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <label>
                Full name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" autoComplete="name" />
              </label>
            )}

            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" autoComplete="email" />
            </label>

            <label>
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </label>

            {message && <div className="auth-role-note">{message}</div>}
            {error && <div className="auth-error">{error}</div>}

            <button className="btn btn-primary full-button" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'} <Icon name="arrow" />
            </button>
          </form>

          <div className="auth-role-note">
            <span className="auth-role-dot" />
            Your account role is managed by KinderBees. Parents register themselves; Coaches are assigned by an Admin.
          </div>
        </div>
      </div>
    </main>
  )
}
