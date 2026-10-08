import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import SessionCard from '../components/SessionCard'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import type { TrainingSession } from '../types/training'

type Child = {
  id: string
  full_name: string
  date_of_birth: string | null
  gender: string | null
  notes: string | null
  created_at: string
}

type ChildForm = { full_name: string; date_of_birth: string; gender: string; notes: string }
const emptyForm: ChildForm = { full_name: '', date_of_birth: '', gender: '', notes: '' }

type BookingRow = {
  id: string
  child_id: string
  session_id: string
  status: 'booked' | 'cancelled'
  child: { full_name: string } | null
  training_sessions: {
    training_date: string
    start_time: string
    end_time: string
    capacity: number
    status: 'scheduled' | 'cancelled' | 'completed'
    training_groups: { name: string } | null
    locations: { name: string } | null
  } | null
}

function getAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null
  const birth = new Date(`${dateOfBirth}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age >= 0 ? age : null
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

function bookingToSession(row: BookingRow): TrainingSession | null {
  const s = row.training_sessions
  if (!s) return null
  const date = s.training_date
  return {
    id: row.session_id,
    group: s.training_groups?.name ?? 'Group',
    date,
    start: s.start_time.slice(0, 5),
    end: s.end_time.slice(0, 5),
    location: s.locations?.name ?? 'Location TBC',
    capacity: s.capacity,
    booked: 1,
    status: s.status === 'cancelled' ? 'cancelled' : s.status === 'completed' ? 'completed' : 'open',
  }
}

export default function ParentDashboard() {
  const navigate = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [bookingRows, setBookingRows] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showAddChild, setShowAddChild] = useState(false)
  const [form, setForm] = useState<ChildForm>(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login', { replace: true }); return }

    const [childrenResult, bookingsResult] = await Promise.all([
      supabase.from('children').select('id, full_name, date_of_birth, gender, notes, created_at').eq('parent_id', user.id).order('created_at', { ascending: true }),
      supabase.from('bookings').select('id, child_id, session_id, status, child:children(full_name), training_sessions(training_date, start_time, end_time, capacity, status, training_groups(name), locations(name))').order('created_at', { ascending: false }),
    ])

    if (childrenResult.error) { setError(childrenResult.error.message); setLoading(false); return }
    if (bookingsResult.error) { setError(bookingsResult.error.message); setLoading(false); return }

    setChildren((childrenResult.data ?? []) as Child[])
    setBookingRows((bookingsResult.data ?? []) as unknown as BookingRow[])
    setLoading(false)
  }

  useEffect(() => { void loadData() }, [])

  const upcomingBookings = useMemo(() => bookingRows.filter((row) => row.status === 'booked' && row.training_sessions && row.training_sessions.training_date >= new Date().toISOString().slice(0, 10)).sort((a, b) => `${a.training_sessions?.training_date}${a.training_sessions?.start_time}`.localeCompare(`${b.training_sessions?.training_date}${b.training_sessions?.start_time}`)), [bookingRows])

  const submitChild = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setSuccess('')
    if (!form.full_name.trim()) { setError('Please enter the child’s full name.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login', { replace: true }); return }
    const { data, error: insertError } = await supabase.from('children').insert({ parent_id: user.id, full_name: form.full_name.trim(), date_of_birth: form.date_of_birth || null, gender: form.gender || null, notes: form.notes.trim() || null }).select('id, full_name, date_of_birth, gender, notes, created_at').single()
    if (insertError) { setError(insertError.message); setSaving(false); return }
    setChildren((current) => [...current, data as Child]); setForm(emptyForm); setShowAddChild(false); setSuccess(`${data.full_name} was added to your family.`); setSaving(false)
  }

  const removeChild = async (child: Child) => {
    if (!window.confirm(`Remove ${child.full_name} from your account?`)) return
    setDeletingId(child.id); setError(''); setSuccess('')
    const { error: deleteError } = await supabase.from('children').delete().eq('id', child.id)
    if (deleteError) { setError(deleteError.message); setDeletingId(null); return }
    setChildren((current) => current.filter((item) => item.id !== child.id)); setSuccess(`${child.full_name} was removed.`); setDeletingId(null)
  }

  const cancelBooking = async (bookingId: string) => {
    if (!window.confirm('Cancel this training booking?')) return
    setCancellingId(bookingId); setError(''); setSuccess('')
    const { data, error: cancelError } = await supabase.rpc('cancel_training_booking', { p_booking_id: bookingId })
    if (cancelError) { setError(cancelError.message); setCancellingId(null); return }
    if (!data) { setError('This booking could not be cancelled.'); setCancellingId(null); return }
    setBookingRows((rows) => rows.map((row) => row.id === bookingId ? { ...row, status: 'cancelled' } : row)); setSuccess('Training booking cancelled.'); setCancellingId(null)
  }

  return <div><Header /><main className="dashboard-shell"><div className="container"><div className="dash-top"><div><span className="eyebrow">PARENT DASHBOARD</span><h1>Your family at KinderBees</h1><p>Manage your children and your real training bookings from one place.</p></div><div className="dash-actions"><Link to="/schedule" className="btn btn-white">Browse schedule</Link><button type="button" className="btn btn-primary" onClick={() => { setShowAddChild(true); setError(''); setSuccess('') }}>Add a child <Icon name="plus" /></button></div></div>

  {error && <div className="auth-error dashboard-alert">{error}</div>}{success && <div className="dashboard-alert success-alert">{success}</div>}

  <div className="dashboard-grid"><section className="panel span-2"><div className="panel-heading"><div><h2>Your children</h2><p>Player profiles connected to your parent account</p></div><button type="button" className="icon-btn" title="Add child" onClick={() => { setShowAddChild(true); setError(''); setSuccess('') }}><Icon name="plus" /></button></div>{loading ? <div className="profile-empty"><span>⏳</span><h3>Loading your family...</h3></div> : children.length ? <div className="children-grid">{children.map((child) => { const age = getAge(child.date_of_birth); return <div className="child-card child-card-real" key={child.id}><div className="child-avatar">{initials(child.full_name)}</div><div><span className="pill">{child.gender || 'Player'}</span><h3>{child.full_name}</h3><p>{age !== null ? `${age} years old` : 'Date of birth not added'}</p>{child.notes && <small className="child-notes">{child.notes}</small>}</div><button type="button" className="child-remove" onClick={() => void removeChild(child)} disabled={deletingId === child.id}>{deletingId === child.id ? '…' : 'Remove'}</button></div>})}</div> : <div className="empty-state"><span>👋</span><h3>No children added yet</h3><p>Add your first child before booking training sessions.</p><button type="button" className="btn btn-primary" onClick={() => setShowAddChild(true)}>Add first child</button></div>}</section>

  <section className="panel"><div className="panel-heading"><div><h2>Quick stats</h2><p>Your KinderBees account</p></div></div><div className="quick-stat"><span>Upcoming bookings</span><strong>{upcomingBookings.length}</strong></div><div className="quick-stat"><span>Total children</span><strong>{children.length}</strong></div><div className="quick-stat"><span>Account</span><strong>Parent</strong></div></section>

  <section className="panel span-2"><div className="panel-heading"><div><h2>My training</h2><p>Your confirmed upcoming sessions</p></div><Link to="/schedule" className="text-link">Browse schedule <Icon name="arrow" size={15} /></Link></div>{loading ? <div className="profile-empty"><span>⏳</span><h3>Loading bookings...</h3></div> : upcomingBookings.length ? <div className="schedule-list compact-list">{upcomingBookings.map((row) => { const session = bookingToSession(row); if (!session) return null; return <div key={row.id} className="booking-item"><SessionCard session={session} showBook={false} /><div className="booking-meta"><span>Booked for <strong>{row.child?.full_name ?? 'your child'}</strong></span><button type="button" className="btn btn-white" onClick={() => void cancelBooking(row.id)} disabled={cancellingId === row.id}>{cancellingId === row.id ? 'Cancelling…' : 'Cancel booking'}</button></div></div>})}</div> : <div className="empty-state"><span>📅</span><h3>No training booked yet</h3><p>Choose a session from the live schedule and book it for one of your children.</p><Link to="/schedule" className="btn btn-primary">Browse sessions</Link></div>}</section>

  <section className="panel"><div className="panel-heading"><div><h2>Academy news</h2><p>Latest updates</p></div></div><div className="news-item"><span className="news-dot"/><div><strong>Live training schedule</strong><p>Published sessions now come directly from the coach dashboard.</p></div></div><div className="news-item"><span className="news-dot"/><div><strong>Secure booking</strong><p>Capacity is checked in Supabase before a booking is confirmed.</p></div></div></section></div></div></main>

  {showAddChild && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddChild(false) }}><form className="modal-card" onSubmit={submitChild} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">PLAYER PROFILE</span><h2>Add your child</h2><p>This information will be linked to your parent account.</p></div><button type="button" className="icon-btn" onClick={() => setShowAddChild(false)} aria-label="Close"><Icon name="x" /></button></div><div className="modal-form-grid"><label>Child full name<input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="e.g. Adam Smith" required /></label><label>Date of birth<input type="date" value={form.date_of_birth} onChange={(event) => setForm((current) => ({ ...current, date_of_birth: event.target.value }))} /></label><label>Gender<select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></label><label className="modal-field-full">Notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Allergies, preferences, or useful notes for the academy" rows={4} /></label></div><div className="modal-actions"><button type="button" className="btn btn-white" onClick={() => setShowAddChild(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add child'}</button></div></form></div>}
  </div>
}
