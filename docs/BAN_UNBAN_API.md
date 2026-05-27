# Ban / Unban API Documentation

This file documents the current simple admin ban endpoints.

## Ban User

**Endpoint:** `POST /api/admin/ban-user`

**Access:** admin only

### Request body

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "reason": "Violating community guidelines"
}
```

Rules:

- either `userId` or `email` must be provided
- `reason` is required
- `reason` max length is 500 characters

Behavior:

- bans the user
- stores `bannedAt`, `bannedReason`, and `bannedBy`
- soft-deletes that user’s non-deleted listings by setting `status: deleted`
- sets `expiresAt` so Mongo TTL cleanup can eventually remove those listings
- clears related listing caches

### Success response

```json
{
  "success": true,
  "message": "User banned successfully and 3 listings marked as deleted",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "banned": true,
    "bannedAt": "2026-04-15T10:30:00.000Z",
    "bannedReason": "Violating community guidelines",
    "bannedBy": "507f1f77bcf86cd799439012",
    "listingsDeleted": 3
  }
}
```

### Common errors

- `400`: missing user identifier, missing reason, reason too long, user already banned
- `403`: attempt to ban an admin user
- `404`: user not found

## Unban User

**Endpoint:** `POST /api/admin/unban-user`

**Access:** admin only

### Request body

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com"
}
```

Rules:

- either `userId` or `email` must be provided

Behavior:

- clears the user’s ban state
- restores listings that were soft-deleted by the ban flow
- only restores listings that still have the ban-related `expiresAt`
- clears related listing caches

### Success response

```json
{
  "success": true,
  "message": "User unbanned successfully and 3 listings restored",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "banned": false,
    "listingsRestored": 3
  }
}
```

### Common errors

- `400`: missing user identifier, user is not banned
- `404`: user not found

## Notes

- These endpoints are the simple admin moderation endpoints used by current admin flows.
- They exist alongside appeal review endpoints, but they are not the same thing.
- There is no separate admin login route; admin access uses the normal JWT auth system with `role: "admin"`.
