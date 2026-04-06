# Simple Ban/Unban API Documentation

## Ban User Endpoint

**Endpoint**: `POST /api/admin/ban-user`

**Access**: Admin only (returns 404 for non-admins)

### Request Body
```json
{
  "userId": "507f1f77bcf86cd799439011",  // OR use email instead
  "email": "user@example.com",            // Optional: use if userId not provided
  "reason": "Violating community guidelines"
}
```

### Parameters
- **userId** (optional): MongoDB ObjectId of the user to ban
- **email** (optional): Email of the user to ban
- **reason** (required): Ban reason (max 500 characters)

**Note**: Either `userId` or `email` must be provided

### Response (Success - 200)
```json
{
  "success": true,
  "message": "User banned successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "banned": true,
    "bannedAt": "2024-01-15T10:30:00.000Z",
    "bannedReason": "Violating community guidelines",
    "bannedBy": "507f1f77bcf86cd799439012"
  }
}
```

### Error Responses
- **400**: Missing userId/email, missing reason, reason too long, user already banned
- **403**: Attempting to ban an admin user
- **404**: User not found
- **500**: Server error

### Example cURL
```bash
curl -X POST http://localhost:3000/api/admin/ban-user \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<admin_token>" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "reason": "Spam and harassment"
  }'
```

---

## Unban User Endpoint

**Endpoint**: `POST /api/admin/unban-user`

**Access**: Admin only (returns 404 for non-admins)

### Request Body
```json
{
  "userId": "507f1f77bcf86cd799439011",  // OR use email instead
  "email": "user@example.com"             // Optional: use if userId not provided
}
```

### Parameters
- **userId** (optional): MongoDB ObjectId of the user to unban
- **email** (optional): Email of the user to unban

**Note**: Either `userId` or `email` must be provided

### Response (Success - 200)
```json
{
  "success": true,
  "message": "User unbanned successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "banned": false
  }
}
```

### Error Responses
- **400**: Missing userId/email, user not banned
- **404**: User not found
- **500**: Server error

### Example cURL
```bash
curl -X POST http://localhost:3000/api/admin/unban-user \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<admin_token>" \
  -d '{
    "email": "user@example.com"
  }'
```

---

## Features

✅ **Simple & Direct**: No action parameter needed - just call ban or unban  
✅ **Flexible Lookup**: Use userId or email  
✅ **Admin Protection**: Can't ban other admins  
✅ **Validation**: Ensures valid data and prevents double-banning  
✅ **Audit Logging**: All ban/unban actions are logged  
✅ **Security**: Admin-only access with 404 response for non-admins  

## Comparison with Existing Endpoint

### New Simple API (`/api/admin/ban-user`)
- Direct action endpoint
- Automatic validation
- Clear error messages
- Perfect for UI implementation

### Existing API (`/api/admin/users/[id]/ban`)
- Supports both ban and unban with action parameter
- More flexible for bulk operations
- Useful for advanced workflows
