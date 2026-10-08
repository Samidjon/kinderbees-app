import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Schedule from './pages/Schedule'
import Login from './pages/Login'
import ParentDashboard from './pages/ParentDashboard'
import CoachDashboard from './pages/CoachDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'
import { supabase } from './lib/supabaseClient'

type Role = 'parent' | 'coach' | 'admin'

type Profile = {
  role: Role
}

function Protected({
  requiredRole,
  role,
  children,
}: {
  requiredRole: Role
  role: Role | null
  children: ReactNode
}) {
  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (role !== requiredRole) {
    return <Navigate to={`/${role}`} replace />
  }

  return children
}

export default function App() {
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Profile load error:', error)
      setRole(null)
      return
    }

    setRole(data?.role ?? null)
  }

  useEffect(() => {
    let active = true

    const initialise = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (!active) return

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id)
      }

      if (active) setLoading(false)
    }

    void initialise()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!nextSession?.user) {
        setRole(null)
        return
      }

      await loadProfile(nextSession.user.id)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: '#1f3f72',
          fontWeight: 800,
        }}
      >
        Loading KinderBees...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />

      <Route
        path="/parent"
        element={
          <Protected requiredRole="parent" role={role}>
            <ParentDashboard />
          </Protected>
        }
      />

      <Route
        path="/coach"
        element={
          <Protected requiredRole="coach" role={role}>
            <CoachDashboard />
          </Protected>
        }
      />

      <Route
        path="/admin"
        element={
          <Protected requiredRole="admin" role={role}>
            <AdminDashboard />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
