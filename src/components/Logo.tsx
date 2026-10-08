import { Link } from 'react-router-dom'

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`brand ${compact ? 'brand-compact' : ''}`}>
      <img src="/kinderbees-logo.png" alt="KinderBees Football Academy" />
      <span>
        <strong>KinderBees</strong>
        {!compact && <small>Football Academy</small>}
      </span>
    </Link>
  )
}
