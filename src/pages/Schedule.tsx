import Header from '../components/Header'
import SessionCard from '../components/SessionCard'
import Icon from '../components/Icon'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { TrainingSession } from '../types/training'

type Child = { id: string; full_name: string }

type ScheduleRow = {
  id: string
  training_date: string
  start_time: string
  end_time: string
  group_name: string
  location_name: string
  capacity: number
  booked_count: number
  status: 'scheduled' | 'cancelled' | 'completed'
}

function toSession(row: ScheduleRow): TrainingSession {
  const booked = Number(row.booked_count ?? 0)
  return {
    id: row.id,
    group: row.group_name,
    date: row.training_date,
    start: row.start_time.slice(0, 5),
    end: row.end_time.slice(0, 5),
    location: row.location_name,
    capacity: row.capacity,
    booked,
    status: row.status === 'cancelled' ? 'cancelled' : row.status === 'completed' ? 'completed' : booked >= row.capacity ? 'full' : 'open',
  }
}

export default function Schedule() {
  const navigate = useNavigate()
  const [group, setGroup] = useState('All')
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null)
  const [selectedChild, setSelectedChild] = useState('')
  const [childMenuOpen, setChildMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadSchedule = async () => {
    setLoading(true)
    setError('')
    const { data, error: scheduleError } = await supabase.rpc('get_training_schedule')
    if (scheduleError) {
      setError(scheduleError.message)
      setSessions([])
    } else {
      setSessions(((data ?? []) as ScheduleRow[]).map(toSession))
    }
    setLoading(false)
  }

  useEffect(() => { void loadSchedule() }, [])

  const filtered = useMemo(
    () => group === 'All' ? sessions : sessions.filter((s) => s.group === group),
    [group, sessions],
  )

  const reserve = async (session: TrainingSession) => {
    setError('')
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'parent') {
      setError('Only parent accounts can book training sessions.')
      return
    }

    const { data, error: childError } = await supabase
      .from('children')
      .select('id, full_name')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: true })

    if (childError) {
      setError(childError.message)
      return
    }

    if (!data?.length) {
      setError('Add a child to your parent account before booking training.')
      return
    }

    setChildren(data as Child[])
    setSelectedChild(data[0].id)
    setChildMenuOpen(false)
    setSelectedSession(session)
  }

  const confirmBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedSession || !selectedChild) return
    setBooking(true)
    setError('')
    setMessage('')

    const { error: bookingError } = await supabase.rpc('book_training', {
      p_session_id: selectedSession.id,
      p_child_id: selectedChild,
    })

    if (bookingError) {
      setError(bookingError.message)
      setBooking(false)
      return
    }

    setSelectedSession(null)
    setBooking(false)
    setMessage('Training booked successfully.')
    await loadSchedule()
  }

  return <div><Header /><main className="dashboard-shell"><div className="container narrow-top"><div className="page-heading"><div><span className="eyebrow">TRAINING SCHEDULE</span><h1>Book a session that works for you.</h1><p>Coaches publish sessions here. Parents can reserve a place for one of their children.</p></div><div className="filter-row">{['All','U5','U7','U9','U11'].map((x) => <button key={x} className={`filter-chip ${group === x ? 'active' : ''}`} onClick={() => setGroup(x)}>{x}</button>)}</div></div>

    {error && <div className="auth-error dashboard-alert">{error}</div>}
    {message && <div className="dashboard-alert success-alert">{message}</div>}

    {loading ? <div className="profile-empty"><span>⏳</span><h3>Loading training schedule...</h3></div> : filtered.length ? <div className="schedule-list">{filtered.map((session) => <SessionCard key={session.id} session={session} onReserve={reserve} />)}</div> : <div className="empty-state"><span>📅</span><h3>No sessions published yet</h3><p>Once coaches create sessions, they will appear here.</p></div>}

    <div className="panel schedule-note"><div><span className="eyebrow">BOOKING FLOW</span><h2>Choose a session → choose your child → confirm.</h2><p>Places are checked against the live training capacity in Supabase, so full sessions cannot be overbooked.</p></div><Icon name="arrow" size={18} /></div>
  </div></main>

  {selectedSession && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedSession(null); setChildMenuOpen(false) } }}><form className="modal-card" onSubmit={confirmBooking} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">RESERVE TRAINING</span><h2>{selectedSession.group} · {selectedSession.start}–{selectedSession.end}</h2><p>{selectedSession.location} · {new Date(`${selectedSession.date}T00:00:00`).toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><button type="button" className="icon-btn" onClick={() => { setSelectedSession(null); setChildMenuOpen(false) }} aria-label="Close"><Icon name="x" /></button></div><div className="child-picker"><span className="child-picker-label">Choose a child</span><div className="child-select-wrap"><button type="button" className={`child-select-trigger ${childMenuOpen ? 'is-open' : ''}`} onClick={() => setChildMenuOpen((value) => !value)} aria-haspopup="listbox" aria-expanded={childMenuOpen}><span>{children.find((child) => child.id === selectedChild)?.full_name ?? 'Select a child'}</span><span className="child-select-chevron">⌄</span></button>{childMenuOpen && <div className="child-select-menu" role="listbox">{children.map((child) => <button key={child.id} type="button" className={`child-select-option ${child.id === selectedChild ? 'selected' : ''}`} onClick={() => { setSelectedChild(child.id); setChildMenuOpen(false) }} role="option" aria-selected={child.id === selectedChild}><span className="child-option-avatar">{child.full_name.split(' ').filter(Boolean).slice(0,2).map((part) => part[0]).join('').toUpperCase()}</span><span className="child-option-copy"><strong>{child.full_name}</strong><small>Book this session for this child</small></span>{child.id === selectedChild && <span className="child-option-check">✓</span>}</button>)}</div>}</div></div><div className="modal-actions"><button type="button" className="btn btn-white" onClick={() => { setSelectedSession(null); setChildMenuOpen(false) }}>Cancel</button><button type="submit" className="btn btn-primary" disabled={booking}>{booking ? 'Booking…' : 'Confirm booking'}</button></div></form></div>}
  </div>
}
