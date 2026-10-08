import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'

type Role = 'parent' | 'coach' | 'admin'

type ProfileData = {
  id: string
  full_name: string
  phone: string | null
  role: Role
  created_at: string
}

type Child = {
  id: string
  full_name: string
  date_of_birth: string | null
  gender: string | null
}

function roleLabel(role: Role) {
  if (role === 'admin') return 'Administrator'
  if (role === 'coach') return 'Coach'
  return 'Parent'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Profile() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [email, setEmail] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [coachSessions, setCoachSessions] = useState(0)
  const [adminUsers, setAdminUsers] = useState(0)
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, role, created_at')
        .eq('id', user.id)
        .single()

      if (!active) return

      if (profileError || !profileData) {
        setError(profileError?.message ?? 'Profile could not be loaded.')
        setLoading(false)
        return
      }

      setEmail(user.email ?? '')
      setProfile(profileData as ProfileData)

      if (profileData.role === 'parent') {
        const { data: childRows } = await supabase
          .from('children')
          .select('id, full_name, date_of_birth, gender')
          .eq('parent_id', user.id)
          .order('created_at', { ascending: true })
        if (active) setChildren((childRows ?? []) as Child[])
      }

      if (profileData.role === 'coach') {
        const { count } = await supabase
          .from('training_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', user.id)
          .gte('training_date', new Date().toISOString().slice(0, 10))
        if (active) setCoachSessions(count ?? 0)
      }

      if (profileData.role === 'admin') {
        const { data: userRows } = await supabase.rpc('admin_list_users')
        if (active) setAdminUsers((userRows ?? []).length)
      }

      if (active) setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [navigate])

  const initials = useMemo(() => {
    if (!profile?.full_name) return 'KB'
    return profile.full_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  }, [profile?.full_name])

  const signOut = async () => {
    setSigningOut(true)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(signOutError.message)
      setSigningOut(false)
      return
    }
    navigate('/login', { replace: true })
  }

  if (loading) {
    return <div className="profile-loading">Loading your profile...</div>
  }

  if (!profile) {
    return <div className="profile-loading">{error || 'Profile unavailable.'}</div>
  }

  return (
    <div>
      <Header />
      <main className="dashboard-shell">
        <div className="container narrow-profile">
          <div className="profile-hero panel">
            <div className="profile-avatar-large">{initials}</div>
            <div className="profile-hero-copy">
              <span className="eyebrow">MY PROFILE</span>
              <h1>{profile.full_name}</h1>
              <div className="profile-meta-row">
                <span className={`role-badge role-${profile.role}`}>{roleLabel(profile.role)}</span>
                <span>{email}</span>
              </div>
              <p>Manage the information and KinderBees activity connected to your account.</p>
            </div>
          </div>

          {error && <div className="auth-error profile-error">{error}</div>}

          <div className="profile-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Account details</h2>
                  <p>Your basic account information</p>
                </div>
                <div className="stat-icon"><Icon name="user" /></div>
              </div>
              <div className="profile-details">
                <div><span>Name</span><strong>{profile.full_name}</strong></div>
                <div><span>Email</span><strong>{email}</strong></div>
                <div><span>Phone</span><strong>{profile.phone || 'Not added yet'}</strong></div>
                <div><span>Role</span><strong>{roleLabel(profile.role)}</strong></div>
                <div><span>Member since</span><strong>{new Date(profile.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></div>
              </div>
            </section>

            {profile.role === 'parent' && (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Your children</h2>
                    <p>Players connected to this parent account</p>
                  </div>
                  <Link to="/parent" className="text-link">Open dashboard <Icon name="arrow" size={14} /></Link>
                </div>
                {children.length ? (
                  <div className="profile-list">
                    {children.map((child) => (
                      <div className="profile-list-item" key={child.id}>
                        <div className="child-avatar">{child.full_name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</div>
                        <div>
                          <strong>{child.full_name}</strong>
                          <span>{child.gender || 'Player'} · {formatDate(child.date_of_birth)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="profile-empty">
                    <span>👋</span>
                    <h3>No children added yet</h3>
                    <p>Add your first child from the Parent Dashboard.</p>
                    <Link to="/parent" className="btn btn-primary btn-small">Go to dashboard</Link>
                  </div>
                )}
              </section>
            )}

            {profile.role === 'coach' && (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Coach activity</h2>
                    <p>Your current academy workload</p>
                  </div>
                  <Link to="/coach" className="text-link">Open dashboard <Icon name="arrow" size={14} /></Link>
                </div>
                <div className="role-highlight">
                  <strong>{coachSessions}</strong>
                  <span>upcoming training sessions</span>
                </div>
                <p className="profile-note">Your training, booking and attendance tools are available from the Coach Dashboard.</p>
              </section>
            )}

            {profile.role === 'admin' && (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Academy access</h2>
                    <p>Administrator overview</p>
                  </div>
                  <Link to="/admin" className="text-link">Open admin <Icon name="arrow" size={14} /></Link>
                </div>
                <div className="role-highlight">
                  <strong>{adminUsers}</strong>
                  <span>users currently in KinderBees</span>
                </div>
                <p className="profile-note">You can manage roles and academy operations from the Admin Dashboard.</p>
              </section>
            )}

            <section className="panel profile-security">
              <div className="panel-heading">
                <div>
                  <h2>Account & security</h2>
                  <p>Session controls for this account</p>
                </div>
                <div className="stat-icon"><Icon name="check" /></div>
              </div>
              <div className="security-row">
                <div>
                  <strong>Signed in with email</strong>
                  <span>{email}</span>
                </div>
                <span className="mini-badge">Secure account</span>
              </div>
              <div className="logout-zone">
                <div>
                  <strong>Sign out</strong>
                  <span>End the current KinderBees session on this device.</span>
                </div>
                <button type="button" className="btn btn-white" onClick={() => void signOut()} disabled={signingOut}>
                  <Icon name="logout" size={16} />
                  {signingOut ? 'Signing out...' : 'Log out'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
