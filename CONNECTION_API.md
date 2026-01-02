# My Circle - Connection API Endpoints

## Connection Endpoints

All endpoints require `Authorization: Bearer <firebase_token>` header.

### POST /v1/connections/request

Send a connection request to another user.

**Request Body:**
```json
{
  "target_user_id": 123  // OR use "invite_token": "uuid-token"
}
```

**Response (201):**
```json
{
  "id": 1,
  "state": "pending",
  "type": "permanent",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Errors:**
- `400` - Cannot connect to yourself, or connection already exists
- `429` - Circle is full (50 max)

### POST /v1/connections/:id/accept

Accept a pending connection request.

**Response (200):**
```json
{
  "id": 1,
  "state": "active",
  "type": "permanent",
  "started_at": "2025-01-01T00:00:00Z",
  "expires_at": null
}
```

**Errors:**
- `403` - Only the recipient can accept
- `400` - Connection is not pending

### POST /v1/connections/:id/remove

Remove a connection (silent removal - no notification sent).

**Response (200):**
```json
{
  "success": true,
  "message": "Connection removed"
}
```

### GET /v1/connections

List user's active connections.

**Response (200):**
```json
{
  "connections": [
    {
      "id": 1,
      "user": {
        "id": 456,
        "real_name": "Alice Johnson",
        "avatar_url": "https://..."
      },
      "type": "permanent",
      "state": "active",
      "started_at": "2025-01-01T00:00:00Z",
      "expires_at": null
    }
  ],
  "count": 1
}
```

### GET /v1/connections/pending

List pending connection requests.

**Response (200):**
```json
{
  "connections": [
    {
      "id": 1,
      "requester_id": 123,
      "requester_name": "Bob Smith",
      "requester_avatar": "https://...",
      "type": "permanent",
      "created_at": "2025-01-01T00:00:00Z",
      "is_requester": true
    }
  ],
  "count": 1
}
```

## Features Implemented

✅ **Mutual connections only** - Both users must accept
✅ **50-user limit** - Enforced for both users
✅ **Silent removal** - No notification when connection ends
✅ **Connection states** - pending → active → ended
✅ **Permanent & temporary** - 12-month expiry for temporary
