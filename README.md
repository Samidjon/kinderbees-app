# KinderBees Football Academy

## Next stage: live training + bookings

This version connects the coach schedule and parent booking flow to Supabase.

### 1. Keep your existing `.env.local`

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### 2. Run the new Supabase SQL

Open Supabase **SQL Editor** and run:

`supabase/training_booking.sql`

This creates:
- `get_training_schedule()` – public schedule data with aggregate booking counts
- `book_training()` – safe capacity-checked booking
- `cancel_training_booking()` – parent booking cancellation

### 3. Run the app

```bash
npm install
npm run dev
```

### 4. Test in this order

1. Sign in as a **Coach**.
2. Open Coach Dashboard.
3. Create a training session.
4. Sign in as a **Parent**.
5. Add at least one child.
6. Open Training Schedule.
7. Reserve the new training for the child.
8. Open Parent Dashboard and check **My training**.
9. Cancel the booking and verify the slot becomes available again.

### Notes

- The training schedule is now loaded from Supabase instead of demo data.
- Bookings are stored in `public.bookings`.
- Capacity is checked inside the database function to reduce overbooking/race conditions.
- The existing `.env.local` is intentionally not included in this project archive.

## Booking fix (latest)

The booking RPC was rebuilt with the exact parameter names used by the frontend. In Supabase SQL Editor, run `supabase/training_booking.sql` again, or at minimum run the `book_training` drop/recreate section and `notify pgrst, 'reload schema';` at the end.

The child picker in Schedule is now a custom KinderBees-styled dropdown instead of the browser default select.
