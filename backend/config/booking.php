<?php

// Single source of truth for the reservation lifecycle timing values. Both
// ProcessSessionLifecycle and ReservationController read from here now, instead of
// each hardcoding their own copy of "20" / "2" — that duplication is exactly what
// caused a value change in one file to silently not apply everywhere.
//
// Override via .env, e.g.:
//   RESERVATION_EXPIRY_MINUTES=20
//   BOOKING_CUTOFF_HOURS=2

return [
    'reservation_expiry_minutes' => (int) env('RESERVATION_EXPIRY_MINUTES', 20),
    'booking_cutoff_hours' => (int) env('BOOKING_CUTOFF_HOURS', 2),
];