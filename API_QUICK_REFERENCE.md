# API Quick Reference

This is the current quick route map for the main API surfaces.

## Auth

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/auth/register` | `POST` | create account |
| `/api/auth/login` | `POST` | sign in |
| `/api/auth/logout` | `POST` | clear auth cookie |
| `/api/auth/me` | `GET` | current user state |
| `/api/auth/forgot-password` | `POST` | start reset flow |
| `/api/auth/reset-password` | `POST` | complete reset |
| `/api/auth/upload-id` | `POST` | seller verification step |
| `/api/auth/ban-appeal` | `POST` | public banned-user appeal path |

## Marketplace

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/listings` | `GET`, `POST` | browse/create |
| `/api/listings/[id]` | `GET`, `PUT`, `DELETE` | listing detail/update/delete |
| `/api/listings/nearby` | `GET` | nearby discovery |
| `/api/listings/trending` | `GET` | trending discovery |
| `/api/recommendations` | `GET` | recommendations with strategy/signal-aware fallback |
| `/api/categories/counts` | `GET` | category counts for homepage discovery |

## User activity

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/wishlist` | `GET`, `POST`, `DELETE` | favorites |
| `/api/recently-viewed` | `GET`, `POST` | history |
| `/api/reviews` | `GET`, `POST` | seller reviews |
| `/api/messages` | `GET`, `POST` | conversations and sending |
| `/api/saved-searches` | `GET`, `POST`, `DELETE` | saved searches |
| `/api/blocks` | `POST` | block another user |

## Appeals

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/users/ban-appeals` | `GET` | authenticated history |
| `/api/users/ban-appeals/submit` | `POST` | authenticated submission |
| `/api/admin/ban-appeals` | `GET` | admin list |
| `/api/admin/ban-appeals/[id]` | `GET`, `POST` | admin detail/review |

## Support tickets

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/tickets` | `GET`, `POST` | user ticket list/create |
| `/api/tickets/[id]` | `GET` | user ticket detail |
| `/api/tickets/[id]/reply` | `POST` | user reply |
| `/api/tickets/[id]/status` | `PATCH` | user close flow / admin-compatible auth |
| `/api/admin/tickets` | `GET` | admin inbox |
| `/api/admin/tickets/[id]` | `GET` | admin detail |
| `/api/admin/tickets/[id]/reply` | `POST` | admin reply |
| `/api/admin/tickets/[id]/status` | `PATCH` | admin status change |

## Admin

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/admin/analytics` | `GET` | dashboard stats |
| `/api/admin/users` | `GET` | admin user list |
| `/api/admin/users/[id]/chats` | `GET` | user review chats |
| `/api/admin/users/[id]/listings` | `GET` | user review listings |
| `/api/admin/sellers` | `GET` | seller list |
| `/api/admin/sellers/[id]/listings` | `GET` | seller listings |
| `/api/admin/reports` | `GET` | reports queue |
| `/api/admin/reports/[id]` | `PATCH` or route-specific action | moderation actions |
| `/api/admin/listings/[id]` | `PATCH` | visibility/admin actions |
| `/api/admin/listings/[id]/boost` | `PATCH` | boost toggle |
| `/api/admin/listings/bulk-delete` | `POST` | bulk moderation |
| `/api/admin/ban-user` | `POST` | ban user |
| `/api/admin/unban-user` | `POST` | unban user |
| `/api/admin/view-mode` | `POST` | admin view-mode toggle |
