# API Visual Overview

```text
Weggo API Surface
=================

Auth
  /api/auth/register
  /api/auth/login
  /api/auth/logout
  /api/auth/me
  /api/auth/forgot-password
  /api/auth/reset-password
  /api/auth/upload-id
  /api/auth/ban-appeal

Marketplace
  /api/listings
  /api/listings/[id]
  /api/listings/nearby
  /api/listings/trending
  /api/recommendations
  /api/categories/counts

User Activity
  /api/wishlist
  /api/recently-viewed
  /api/reviews
  /api/messages
  /api/saved-searches
  /api/blocks

Appeals
  /api/users/ban-appeals
  /api/users/ban-appeals/submit
  /api/admin/ban-appeals
  /api/admin/ban-appeals/[id]

Support Tickets
  /api/tickets
  /api/tickets/[id]
  /api/tickets/[id]/reply
  /api/tickets/[id]/status
  /api/admin/tickets
  /api/admin/tickets/[id]
  /api/admin/tickets/[id]/reply
  /api/admin/tickets/[id]/status

Admin
  /api/admin/analytics
  /api/admin/users
  /api/admin/users/[id]/chats
  /api/admin/users/[id]/listings
  /api/admin/sellers
  /api/admin/sellers/[id]/listings
  /api/admin/reports
  /api/admin/listings/[id]
  /api/admin/listings/[id]/boost
  /api/admin/listings/bulk-delete
  /api/admin/ban-user
  /api/admin/unban-user
  /api/admin/view-mode
```

Notes:

- Messages and tickets are the two main threaded communication systems.
- Appeals and admin moderation are related but separate from support tickets.
- For exact contracts, use the route files in `app/api/`.
