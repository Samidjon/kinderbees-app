import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'

type Role = 'parent' | 'coach' | 'admin'

type AdminUser = {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

const ADMIN_EMAIL = 'admin@kinderbees.my'

function roleLabel(role: Role) {
  if (role === 'admin') return 'Admin'
  if (role === 'coach') return 'Coach'
  return 'Parent'
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [changingId, setChangingId] = useState<string | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    setError('')

    const { data, error: usersError } = await supabase.rpc('admin_list_users')

    if (usersError) {
      console.error('Admin users error:', usersError)
      setError(usersError.message)
      setUsers([])
    } else {
      setUsers((data ?? []) as AdminUser[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users

    return users.filter((user) =>
      `${user.full_name} ${user.email}`.toLowerCase().includes(query),
    )
  }, [search, users])

  const changeRole = async (userId: string, role: 'parent' | 'coach') => {
    setChangingId(userId)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (updateError) {
      console.error('Role update error:', updateError)
      setError(updateError.message)
      setChangingId(null)
      return
    }

    await loadUsers()
    setChangingId(null)
  }

  const parentCount = users.filter((user) => user.role === 'parent').length
  const coachCount = users.filter((user) => user.role === 'coach').length
  const adminCount = users.filter((user) => user.role === 'admin').length

  const stats = [
    { label: 'Active parents', value: String(parentCount), icon: 'users' },
    { label: 'Players', value: '84', icon: 'user' },
    { label: 'Coaches', value: String(coachCount), icon: 'users' },
    { label: 'Upcoming sessions', value: '18', icon: 'calendar' },
  ]

  return <div>
    <Header />
    <main className="dashboard-shell">
      <div className="container">
        <div className="dash-top">
          <div>
            <span className="eyebrow">ADMIN DASHBOARD</span>
            <h1>Academy overview.</h1>
            <p>Manage users, training, attendance and the public site.</p>
          </div>
          <button className="table-action table-action-primary" onClick={() => void loadUsers()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh users'}
          </button>
        </div>

        <div className="admin-stats">
          {stats.map((s) => <div className="stat-card" key={s.label}>
            <div className="stat-icon"><Icon name={s.icon}/></div>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>)}
        </div>

        <div className="dashboard-grid">
          <section className="panel span-2">
            <div className="panel-heading">
              <div>
                <h2>Users & roles</h2>
                <p>Anyone who registers starts as Parent. Promote a user to Coach when needed.</p>
              </div>
              <span className="mini-badge">{adminCount} admin{adminCount === 1 ? '' : 's'}</span>
            </div>

            <div className="user-toolbar">
              <div className="search-box">
                <Icon name="user" size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" />
              </div>
              <div className="role-summary">
                <span>{parentCount} parents</span>
                <span>{coachCount} coaches</span>
                <span>{adminCount} admins</span>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="users-table">
              <div className="users-table-head">
                <span>User</span>
                <span>Email / login</span>
                <span>Role</span>
                <span>Action</span>
              </div>

              {loading && <div className="empty-table">Loading users...</div>}

              {!loading && visibleUsers.map((user) => (
                <div className="users-table-row" key={user.id}>
                  <div>
                    <strong>{user.full_name}</strong>
                    <small>Joined {new Date(user.created_at).toLocaleDateString()}</small>
                  </div>
                  <div className="user-email">{user.email}</div>
                  <div><span className={`role-badge role-${user.role}`}>{roleLabel(user.role)}</span></div>
                  <div>
                    {user.email.toLowerCase() === ADMIN_EMAIL
                      ? <span className="protected-role">Protected admin</span>
                      : user.role === 'coach'
                        ? <button className="table-action" disabled={changingId === user.id} onClick={() => void changeRole(user.id, 'parent')}>{changingId === user.id ? 'Updating...' : 'Make parent'}</button>
                        : <button className="table-action table-action-primary" disabled={changingId === user.id} onClick={() => void changeRole(user.id, 'coach')}>{changingId === user.id ? 'Updating...' : 'Make coach'}</button>}
                  </div>
                </div>
              ))}

              {!loading && visibleUsers.length === 0 && <div className="empty-table">No users found.</div>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading"><div><h2>Management</h2><p>Core academy areas</p></div></div>
            <div className="admin-links">{['Training schedule','Attendance','Programs','Locations','Gallery','Announcements'].map((x)=><button key={x}><span>{x}</span><Icon name="arrow" /></button>)}</div>
          </section>

          <section className="panel">
            <div className="panel-heading"><div><h2>Needs attention</h2><p>Quick admin checks</p></div></div>
            <div className="attention"><span>!</span><div><strong>2 sessions need coach review</strong><p>Check attendance from last week.</p></div></div>
            <div className="attention"><span>!</span><div><strong>1 cancelled session</strong><p>Confirm parent notification.</p></div></div>
          </section>
        </div>
      </div>
    </main>
  </div>
}
