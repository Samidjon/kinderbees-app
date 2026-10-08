export default function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'calendar') return <svg {...common}><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 9h18"/></svg>
  if (name === 'users') return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M17 11a4 4 0 1 0-1-7.9M21 21v-2a4 4 0 0 0-3-3.87"/></svg>
  if (name === 'chart') return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>
  if (name === 'menu') return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16"/></svg>
  if (name === 'x') return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>
  if (name === 'map') return <svg {...common}><path d="m4 6 6-3 4 3 6-3v15l-6 3-4-3-6 3Z"/><path d="M10 3v15M14 6v15"/></svg>
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4 3.4-6 8-6s7.3 2 8 6"/></svg>
  if (name === 'chevron') return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>
  if (name === 'logout') return <svg {...common}><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-7"/></svg>
  return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>
}
