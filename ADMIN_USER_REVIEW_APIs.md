# Admin User Review APIs

These APIs support admin review of a user’s conversations and listings.

## 1. Get User Chats

**Endpoint:** `GET /api/admin/users/[id]/chats`

**Access:** admin only

### Query parameters

| Parameter | Default | Notes |
|---|---|---|
| `page` | `1` | paginated conversations |
| `limit` | `20` | max `100` |
| `messageLimit` | `10` | max `20`, number of recent messages per conversation |

### Returns

- basic target-user data: `id`, `name`, `email`, `role`, `banned`
- conversation list with:
  - `conversationId`
  - `otherUser`
  - `product`
  - `messageCount`
  - `unreadCount`
  - `lastMessageTime`
  - `recentMessages`
- pagination info

### Current response shape notes

- `otherUser` currently includes `name`, `avatar`, and `role`
- product images are sanitized down to valid URLs and trimmed to one image
- `recentMessages` are returned oldest-first within the limited recent slice

## 2. Get User Listings

**Endpoint:** `GET /api/admin/users/[id]/listings`

**Access:** admin only

### Query parameters

| Parameter | Default | Notes |
|---|---|---|
| `page` | `1` | paginated listings |
| `limit` | `20` | max `100` |
| `status` | `all` | `all`, `active`, `sold`, `pending`, `deleted` |

### Returns

- seller summary:
  - `id`
  - `name`
  - `email`
  - `role`
  - `sellerVerified`
  - `banned`
  - `averageRating`
  - `ratingCount`
  - `totalSales`
- listings
- listing statistics
- recent seller reviews
- pagination info

### Current response shape notes

- listing images are sanitized and trimmed to one image
- recent reviews are pulled from the real `Review` model using `seller`
- recent reviews populate `reviewer`, not a legacy buyer field

## Admin Use Cases

- investigate a reported user
- review chat behavior before a ban or unban decision
- inspect seller history before reviewing an appeal
- review listing quality, ratings, and history in one place

## Related Endpoints

- `GET /api/admin/ban-appeals`
- `GET /api/admin/ban-appeals/[id]`
- `POST /api/admin/ban-appeals/[id]`
- `POST /api/admin/ban-user`
- `POST /api/admin/unban-user`

## Notes

- These endpoints are still useful even though the admin dashboard is now modularized.
- They power admin review/detail surfaces rather than the top-level dashboard summary modules.
