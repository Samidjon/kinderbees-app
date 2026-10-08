export type TrainingSession = {
  id: string
  group: string
  date: string
  start: string
  end: string
  location: string
  capacity: number
  booked: number
  status: 'open' | 'full' | 'cancelled' | 'completed'
}
