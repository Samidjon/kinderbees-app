import Icon from './Icon'
import type { TrainingSession } from '../types/training'

export default function SessionCard({
  session,
  showBook = true,
  onReserve,
  actionLabel = 'Reserve training',
  disabled = false,
}: {
  session: TrainingSession
  showBook?: boolean
  onReserve?: (session: TrainingSession) => void
  actionLabel?: string
  disabled?: boolean
}) {
  const spaces = Math.max(session.capacity - session.booked, 0)
  const date = new Date(`${session.date}T00:00:00`)
  const isFull = session.status === 'full'
  const isCancelled = session.status === 'cancelled'

  return (
    <article className="session-card">
      <div className="session-date">
        <span>{date.toLocaleDateString('en-MY', { weekday: 'short' }).toUpperCase()}</span>
        <strong>{date.getDate()}</strong>
        <small>{date.toLocaleDateString('en-MY', { month: 'short' })}</small>
      </div>
      <div className="session-main">
        <div className="row-between">
          <div>
            <span className="pill">{session.group}</span>
            <h3>{session.start} – {session.end}</h3>
          </div>
          <span className={`status status-${session.status}`}>
            {isCancelled ? 'Cancelled' : isFull ? 'Full' : 'Open'}
          </span>
        </div>
        <p><Icon name="map" size={15} /> {session.location}</p>
        <div className="capacity-row">
          <span>{session.booked}/{session.capacity} players</span>
          <span>{spaces} spaces left</span>
        </div>
        <div className="progress"><span style={{ width: `${Math.min((session.booked / session.capacity) * 100, 100)}%` }} /></div>
        {showBook && (
          <button
            disabled={disabled || isFull || isCancelled}
            className="btn btn-primary full-button"
            onClick={() => onReserve?.(session)}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </article>
  )
}
