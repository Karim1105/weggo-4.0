# Admin User Review Quick Guide

## Main endpoints

### 1. User chats

```text
GET /api/admin/users/[userId]/chats
```

Use for:

- reviewing a user’s conversation history
- checking recent message context
- inspecting which listing a conversation is about

Query params:

- `page`
- `limit`
- `messageLimit`

### 2. User listings

```text
GET /api/admin/users/[userId]/listings
```

Use for:

- reviewing all listings created by a user
- filtering listings by `active`, `sold`, `pending`, or `deleted`
- seeing seller stats and recent reviews

Query params:

- `page`
- `limit`
- `status`

### 3. Ban appeals list

```text
GET /api/admin/ban-appeals
```

Use for:

- listing pending / approved / rejected appeals

### 4. Ban appeal detail

```text
GET /api/admin/ban-appeals/[appealId]
```

Use for:

- loading a single appeal review page safely by route id

### 5. Review a ban appeal

```text
POST /api/admin/ban-appeals/[appealId]
```

Use for:

- approving or rejecting an appeal
- admin override of an earlier decision if needed

### 6. Ban user

```text
POST /api/admin/ban-user
```

### 7. Unban user

```text
POST /api/admin/unban-user
```

## Practical review flow

1. Open the admin dashboard users or appeals module.
2. Load the target user’s chats and listings in parallel.
3. If the user has an appeal, fetch the specific appeal detail record.
4. Review recent messages, listings, ratings, and appeal text.
5. Decide whether to ban, unban, approve, or reject.

## Current UI reality

- the admin dashboard is now modularized
- tickets are part of admin too
- appeal review can deep-link to real conversation routes
- admin listing detail pages and seller review pages use live server/API data instead of relying purely on legacy local storage snapshots
