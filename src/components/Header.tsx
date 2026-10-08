import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import { supabase } from '../lib/supabaseClient'

type ProfileSummary = {
  full_name: string
  role: 'parent' | 'coach' | 'admin'
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      setSignedIn(Boolean(session))

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .single()
        if (active) setProfile(data as ProfileSummary | null)
      } else {
        setProfile(null)
      }
    }

    void load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      setSignedIn(Boolean(session))
      setProfileOpen(false)

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .single()
        if (active) setProfile(data as ProfileSummary | null)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const initials = useMemo(() => {
    if (!profile?.full_name) return 'KB'
    return profile.full_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  }, [profile?.full_name])

  const closeMenus = () => {
    setOpen(false)
    setProfileOpen(false)
  }

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Logo compact />
        <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Icon name={open ? 'x' : 'menu'} /></button>
        <nav className={open ? 'nav-open' : ''}>
          <Link to="/" onClick={closeMenus}>Home</Link>
          <Link to="/schedule" onClick={closeMenus}>Schedule</Link>
          <a href="/#about" onClick={closeMenus}>About</a>
          <a href="/#contact" onClick={closeMenus}>Contact</a>
          {signedIn ? (
            <div className="profile-nav-wrap">
              <button
                type="button"
                className="profile-nav-button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="profile-nav-avatar">{initials}</span>
                <span className="profile-nav-name">Profile</span>
                <Icon name="chevron" size={14} />
              </button>
              {profileOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-head">
                    <span className="profile-nav-avatar profile-nav-avatar-large">{initials}</span>
                    <div>
                      <strong>{profile?.full_name || 'KinderBees member'}</strong>
                      <small>{profile?.role === 'admin' ? 'Administrator' : profile?.role === 'coach' ? 'Coach' : 'Parent'}</small>
                    </div>
                  </div>
                  <Link to="/profile" onClick={closeMenus}><Icon name="user" size={15} /> My profile</Link>
                  {profile?.role === 'parent' && <Link to="/parent" onClick={closeMenus}><Icon name="users" size={15} /> Parent dashboard</Link>}
                  {profile?.role === 'coach' && <Link to="/coach" onClick={closeMenus}><Icon name="calendar" size={15} /> Coach dashboard</Link>}
                  {profile?.role === 'admin' && <Link to="/admin" onClick={closeMenus}><Icon name="chart" size={15} /> Admin dashboard</Link>}
                </div>
              )}
            </div>
          ) : (
            <Link className="nav-login" to="/login" onClick={closeMenus}>Login</Link>
          )}
          {!signedIn && <Link className="btn btn-primary btn-small" to="/login" onClick={closeMenus}>Join KinderBees</Link>}
        </nav>
      </div>
    </header>
  )
}
