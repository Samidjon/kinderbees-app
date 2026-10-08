import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import SessionCard from '../components/SessionCard'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import type { TrainingSession } from '../types/training'

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
    status:
      row.status === 'cancelled'
        ? 'cancelled'
        : row.status === 'completed'
          ? 'completed'
          : booked >= row.capacity
            ? 'full'
            : 'open',
  }
}

export default function Home() {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [role, setRole] = useState<'parent' | 'coach' | 'admin' | null>(null)

  useEffect(() => {
    let active = true

    const loadHome = async () => {
      const [scheduleResult, sessionResult] = await Promise.all([
        supabase.rpc('get_training_schedule'),
        supabase.auth.getSession(),
      ])

      if (!active) return

      if (scheduleResult.error) {
        console.error('Home schedule error:', scheduleResult.error)
        setSessions([])
      } else {
        setSessions(((scheduleResult.data ?? []) as ScheduleRow[]).map(toSession))
      }

      const session = sessionResult.data.session
      setSignedIn(Boolean(session))

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (active) setRole((profile?.role as 'parent' | 'coach' | 'admin' | null) ?? null)
      } else {
        setRole(null)
      }

      if (active) setScheduleLoading(false)
    }

    void loadHome()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return

      setSignedIn(Boolean(session))

      if (!session?.user) {
        setRole(null)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (active) setRole((profile?.role as 'parent' | 'coach' | 'admin' | null) ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const upcomingSessions = useMemo(
    () => sessions.filter((session) => session.status !== 'cancelled' && session.status !== 'completed').slice(0, 3),
    [sessions],
  )

  const nextSession = upcomingSessions[0]
  const nextSessionLabel = nextSession
    ? `${new Date(`${nextSession.date}T00:00:00`).toLocaleDateString('en-MY', { weekday: 'long' })} · ${nextSession.group}`
    : 'Sessions published by coaches'

  return (
    <div>
      <Header />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">KINDERBEES FOOTBALL ACADEMY</span>
              <h1>Let your child <span>discover</span> the joy of football.</h1>
              <p>Fun, structured football training that helps young players build confidence, skills and a love for the game.</p>
              <div className="hero-actions">
                {!signedIn && <Link to="/login" className="btn btn-primary">Join KinderBees <Icon name="arrow" /></Link>}
                {signedIn && (
                  <Link
                    to={role ? `/${role}` : '/profile'}
                    className="btn btn-primary"
                  >
                    Go to dashboard <Icon name="arrow" />
                  </Link>
                )}
                <Link to="/schedule" className="btn btn-white">View schedule</Link>
              </div>
              <div className="hero-trust"><span>⚽</span><div><strong>Play</strong><small>Learn</small></div><div><strong>Grow</strong><small>Together</small></div></div>
            </div>
            <div className="hero-art">
              <div className="hero-hex"><img src="/kinderbees-logo.png" alt="KinderBees logo" /></div>
              <div className="floating-card float-one"><span className="round-icon yellow">⚽</span><div><small>Next training</small><strong>{nextSessionLabel}</strong></div></div>
              <div className="floating-card float-two"><span className="round-icon navy">✓</span><div><small>Easy booking</small><strong>For parents</strong></div></div>
            </div>
          </div>
        </section>

        <section className="stats-strip">
          <div className="container stats-grid">
            <div><strong>5+</strong><span>Age groups</span></div>
            <div><strong>Weekly</strong><span>Training sessions</span></div>
            <div><strong>1</strong><span>Parent dashboard</span></div>
            <div><strong>∞</strong><span>Room to grow</span></div>
          </div>
        </section>

        <section id="about" className="section section-soft">
          <div className="container two-col">
            <div>
              <span className="eyebrow">WHY KINDERBEES</span>
              <h2>A football experience built around children.</h2>
            </div>
            <div className="feature-grid">
              <div className="feature"><span className="feature-icon">⚽</span><h3>Learn through play</h3><p>Age-appropriate sessions keep children active, engaged and confident.</p></div>
              <div className="feature"><span className="feature-icon">🐝</span><h3>Grow together</h3><p>We build teamwork, discipline and positive habits beyond the pitch.</p></div>
              <div className="feature"><span className="feature-icon">👨‍👩‍👧</span><h3>Parent friendly</h3><p>See training, reserve sessions and follow attendance from one account.</p></div>
              <div className="feature"><span className="feature-icon">🏆</span><h3>Develop skills</h3><p>Players progress through structured sessions and coach feedback.</p></div>
            </div>
          </div>
        </section>

        <section className="section section-schedule">
          <div className="container">
            <div className="section-heading"><div><span className="eyebrow">UPCOMING TRAINING</span><h2>Choose a convenient session</h2></div><Link className="btn btn-outline" to="/schedule">View full schedule <Icon name="arrow" size={16} /></Link></div>

            {scheduleLoading ? (
              <div className="profile-empty"><span>⏳</span><h3>Loading upcoming training...</h3></div>
            ) : upcomingSessions.length ? (
              <div className="schedule-list">{upcomingSessions.map((session) => <SessionCard key={session.id} session={session} />)}</div>
            ) : (
              <div className="empty-state"><span>📅</span><h3>No upcoming sessions yet</h3><p>New sessions will appear here as coaches publish them.</p></div>
            )}
          </div>
        </section>

        {!signedIn && (
          <section className="cta-section" id="contact">
            <div className="container cta-inner"><div><span className="eyebrow">READY TO START?</span><h2>Give your child a place to play, learn and grow.</h2></div><Link to="/login" className="btn btn-primary">Create parent account <Icon name="arrow" /></Link></div>
          </section>
        )}
      </main>
      <footer><div className="container footer-grid"><LogoFooter /><span>© 2026 KinderBees Football Academy</span><span>Play · Learn · Grow</span></div></footer>
    </div>
  )
}

function LogoFooter() { return <div className="footer-brand"><span>🐝</span><strong>KinderBees</strong></div> }
