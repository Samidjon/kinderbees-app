import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import type { TrainingSession } from '../types/training'

type Lookup = { id: string; name: string }

type DbSession = {
  id: string
  training_date: string
  start_time: string
  end_time: string
  capacity: number
  status: 'scheduled' | 'cancelled' | 'completed'
  training_groups: { name: string } | null
  locations: { name: string } | null
  bookings?: { count: number }[]
}

function toUiSession(session: DbSession): TrainingSession {
  const booked = session.bookings?.[0]?.count ?? 0
  const status = session.status === 'cancelled'
    ? 'cancelled'
    : session.status === 'completed'
      ? 'completed'
      : booked >= session.capacity ? 'full' : 'open'

  return {
    id: session.id,
    group: session.training_groups?.name ?? 'Group',
    date: session.training_date,
    start: session.start_time.slice(0, 5),
    end: session.end_time.slice(0, 5),
    location: session.locations?.name ?? 'Location TBC',
    capacity: session.capacity,
    booked,
    status,
  }
}

export default function CoachDashboard() {
  const [items, setItems] = useState<TrainingSession[]>([])
  const [groups, setGroups] = useState<Lookup[]>([])
  const [locations, setLocations] = useState<Lookup[]>([])
  const [showForm, setShowForm] = useState(false)
  const [groupId, setGroupId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('17:00')
  const [end, setEnd] = useState('18:00')
  const [capacity, setCapacity] = useState(12)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You are not signed in.')
      setLoading(false)
      return
    }

    const [sessionResult, groupResult, locationResult] = await Promise.all([
      supabase
        .from('training_sessions')
        .select('id, training_date, start_time, end_time, capacity, status, training_groups(name), locations(name), bookings(count)')
        .eq('coach_id', user.id)
        .order('training_date', { ascending: true })
        .order('start_time', { ascending: true }),
      supabase.from('training_groups').select('id, name').order('name'),
      supabase.from('locations').select('id, name').order('name'),
    ])

    if (sessionResult.error) setError(sessionResult.error.message)
    setItems(((sessionResult.data ?? []) as unknown as DbSession[]).map(toUiSession))
    setGroups((groupResult.data ?? []) as Lookup[])
    setLocations((locationResult.data ?? []) as Lookup[])

    if (!groupId && groupResult.data?.[0]) setGroupId(groupResult.data[0].id)
    if (!locationId && locationResult.data?.[0]) setLocationId(locationResult.data[0].id)
    if (!date) setDate(new Date().toISOString().slice(0, 10))

    if (groupResult.error && !error) setError(groupResult.error.message)
    if (locationResult.error && !error) setError(locationResult.error.message)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const addSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You are not signed in.')
      setSaving(false)
      return
    }

    if (!groupId || !locationId || !date || !start || !end) {
      setError('Please complete the training details.')
      setSaving(false)
      return
    }

    if (end <= start) {
      setError('End time must be later than start time.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase
      .from('training_sessions')
      .insert({
        group_id: groupId,
        coach_id: user.id,
        location_id: locationId,
        training_date: date,
        start_time: start,
        end_time: end,
        capacity,
        notes: notes.trim() || null,
      })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setShowForm(false)
    setNotes('')
    setSuccess('Training published successfully.')
    setSaving(false)
    await load()
  }

  const upcoming = useMemo(
    () => items.filter((item) => item.status !== 'completed').sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)),
    [items],
  )

  const playersExpected = upcoming.reduce((sum, item) => sum + item.booked, 0)
  const openSpaces = upcoming.reduce((sum, item) => sum + Math.max(item.capacity - item.booked, 0), 0)

  return <div><Header /><main className="dashboard-shell"><div className="container"><div className="dash-top"><div><span className="eyebrow">COACH DASHBOARD</span><h1>Training control centre.</h1><p>Create sessions, see bookings and prepare for attendance.</p></div><button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setSuccess(''); setError('') }}><Icon name="plus" /> Create training</button></div>

    {error && <div className="auth-error dashboard-alert">{error}</div>}
    {success && <div className="dashboard-alert success-alert">{success}</div>}

    {showForm && <form className="panel create-form" onSubmit={addSession}><div className="panel-heading"><div><h2>New training session</h2><p>This will appear on the parent schedule immediately.</p></div></div><div className="form-grid"><label>Group<select value={groupId} onChange={(e)=>setGroupId(e.target.value)} required><option value="">Select group</option>{groups.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Location<select value={locationId} onChange={(e)=>setLocationId(e.target.value)} required><option value="">Select location</option>{locations.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={(e)=>setDate(e.target.value)} required /></label><label>Start time<input type="time" value={start} onChange={(e)=>setStart(e.target.value)} required /></label><label>End time<input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} required /></label><label>Capacity<input type="number" value={capacity} onChange={(e)=>setCapacity(Math.max(1, Number(e.target.value)))} min={1} required /></label><label className="modal-field-full">Notes<textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} placeholder="Optional notes for parents or coaches" /></label></div><button className="btn btn-primary" disabled={saving}>{saving ? 'Publishing…' : 'Publish training'}</button></form>}

    <div className="dashboard-grid"><section className="panel span-2"><div className="panel-heading"><div><h2>Upcoming sessions</h2><p>{loading ? 'Loading…' : `${upcoming.length} sessions planned`}</p></div><div className="mini-badge">Coach</div></div>{loading ? <div className="profile-empty"><span>⏳</span><h3>Loading training sessions...</h3></div> : upcoming.length ? <div className="coach-table"><div className="table-head"><span>Date</span><span>Group</span><span>Time</span><span>Attendance</span><span>Status</span></div>{upcoming.map((s)=><div className="table-row" key={s.id}><strong>{new Date(`${s.date}T00:00:00`).toLocaleDateString('en-MY',{day:'2-digit',month:'short'})}</strong><span className="pill">{s.group}</span><span>{s.start}–{s.end}</span><span>{s.booked}/{s.capacity}</span><span className={`status status-${s.status}`}>{s.status === 'full' ? 'Full' : s.status === 'open' ? 'Open' : s.status}</span></div>)}</div> : <div className="empty-state"><span>📅</span><h3>No training sessions yet</h3><p>Create your first session and it will appear on the parent schedule.</p></div>}</section><section className="panel"><div className="panel-heading"><div><h2>Overview</h2><p>Current workload</p></div></div><div className="big-number">{upcoming.length}</div><p className="muted">upcoming sessions</p><div className="quick-stat"><span>Players expected</span><strong>{playersExpected}</strong></div><div className="quick-stat"><span>Open spaces</span><strong>{openSpaces}</strong></div></section></div></div></main></div>
}
