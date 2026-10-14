---
name: Payment account ownership
description: Keep the Mercado Pago destination separate for SaaS subscriptions and professional bookings.
---

TurnoHub subscription payments must be credited to the platform's Mercado Pago account. Reservation payments must be credited directly to the individual professional's own Mercado Pago account connected through OAuth; do not route reservation money through the platform account.

**Why:** The product owner explicitly requires this separation.

**How to apply:** Keep subscription access credentials separate from OAuth seller credentials, and verify the seller account on booking payment notifications before confirming a reservation.
