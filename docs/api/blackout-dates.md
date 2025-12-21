# Blackout Dates API

API endpoints for managing blackout dates (date ranges when campsites are unavailable).

## Endpoints

### `POST /api/admin/blackout-dates`

Create a new blackout date.

**Request Body:**
```json
{
  "start_date": "2025-01-15",
  "end_date": "2025-01-20",
  "campsite_id": "uuid-or-null",  // null = applies to all campsites
  "reason": "Maintenance"          // optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "start_date": "2025-01-15",
  "end_date": "2025-01-20",
  "campsite_id": "uuid-or-null",
  "reason": "Maintenance",
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:00:00Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (missing dates, invalid date range)
- `500` - Server error

---

### `PATCH /api/admin/blackout-dates/[id]`

Update an existing blackout date with server-side validation.

**Request Body:** (all fields optional)
```json
{
  "start_date": "2025-01-15",
  "end_date": "2025-01-20",
  "campsite_id": "uuid-or-null",
  "reason": "Updated reason"
}
```

**Validation Rules:**
1. **Date Validation:**
   - `end_date` must be after `start_date` (minimum 1 night)
   - Date format: `yyyy-MM-dd`

2. **Campsite Validation:**
   - If `campsite_id` provided, campsite must exist
   - Campsite must be active (`is_active = true`)
   - `null` campsite_id = global blackout (applies to all sites)

3. **Conflict Detection:**
   - Cannot overlap with existing reservations (non-cancelled, non-no-show)
   - Cannot overlap with other blackout dates
   - Uses exclusive end dates: `[start_date, end_date)`

**Response (Success):**
```json
{
  "id": "uuid",
  "start_date": "2025-01-15",
  "end_date": "2025-01-20",
  "campsite_id": "uuid-or-null",
  "reason": "Updated reason",
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-15T14:30:00Z"
}
```

**Response (Validation Error):**
```json
{
  "error": "Conflicts with reservation for John Doe",
  "code": "CONFLICT_RESERVATION",
  "conflicts": [{ ... }]
}
```

**Error Codes:**
- `CONFLICT_RESERVATION` - Overlaps with existing reservation
- `CONFLICT_BLACKOUT` - Overlaps with another blackout date

**Status Codes:**
- `200` - Success
- `400` - Validation error (invalid dates, inactive campsite)
- `404` - Blackout not found or campsite not found
- `409` - Conflict with existing reservation or blackout
- `500` - Server error

---

### `DELETE /api/admin/blackout-dates/[id]`

Delete a blackout date.

**Response:**
```json
{
  "message": "Blackout date deleted successfully"
}
```

**Status Codes:**
- `200` - Success
- `404` - Blackout not found
- `500` - Server error

---

## RLS Policies

The `blackout_dates` table has the following Row Level Security policies:

1. **Public Read** (`anon` role):
   - Can read all blackout dates
   - Needed for public availability checks

2. **Authenticated Full Access** (`authenticated` role):
   - Can create, read, update, delete blackout dates
   - Applies to logged-in admin users

3. **Service Role Full Access** (`service_role` role):
   - Full access for API routes
   - Used by server-side operations

---

## Usage Examples

### Create Global Blackout (Holiday)

```bash
curl -X POST http://localhost:3000/api/admin/blackout-dates \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-12-24",
    "end_date": "2025-12-26",
    "campsite_id": null,
    "reason": "Christmas Holiday"
  }'
```

### Update Blackout Dates

```bash
curl -X PATCH http://localhost:3000/api/admin/blackout-dates/[id] \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-01-20",
    "end_date": "2025-01-25"
  }'
```

### Delete Blackout

```bash
curl -X DELETE http://localhost:3000/api/admin/blackout-dates/[id]
```

---

## Server-Side Validation Details

### Overlap Detection Algorithm

The server uses the following logic to detect date range overlaps:

```
Overlap exists when:
  new_start < existing_end AND new_end > existing_start
```

This works with **exclusive end dates**:
- `check_in: 2025-01-05, check_out: 2025-01-10` = 5 nights (Jan 5-9)
- Back-to-back is allowed: checkout Jan 10 + checkin Jan 10 = no conflict

### Conflict Check Process

1. **Fetch existing data** from database
2. **Initial filter** using Supabase queries:
   - Match campsite_id (or null for global)
   - Date range filters (optimization)
3. **Precise filtering** in application code:
   - Apply exact overlap formula
   - Handle edge cases
4. **Return structured error** if conflicts found

### Why Server-Side Validation?

Client-side validation is UX (fast feedback), but server validation is **truth**:
- Prevents race conditions (two admins editing simultaneously)
- Ensures data integrity
- Required for security (client can be bypassed)
- Provides authoritative error messages

---

## Database Schema

```sql
CREATE TABLE public.blackout_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  campsite_id uuid REFERENCES public.campsites(id) ON DELETE CASCADE,
  CONSTRAINT check_blackout_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_blackout_dates_range ON blackout_dates(start_date, end_date);
CREATE INDEX idx_blackout_dates_campsite_id ON blackout_dates(campsite_id);
```

**Constraints:**
- `end_date >= start_date` (enforced at DB level)
- Foreign key to `campsites` with CASCADE delete
- Indexes on date range and campsite for query performance

---

## Integration with Calendar UI

The calendar component uses this API via:

```typescript
const handleBlackoutMoveRequested = async (
  blackout: BlackoutDate,
  newCampsiteId: string,
  newStartDate: string,
  newEndDate: string
) => {
  const response = await fetch(`/api/admin/blackout-dates/${blackout.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campsite_id: newCampsiteId === 'UNASSIGNED' ? null : newCampsiteId,
      start_date: newStartDate,
      end_date: newEndDate,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update blackout date');
  }

  // Success - trigger data refetch
};
```

**Next Steps:**
- Replace `window.location.reload()` with SWR `mutate` for optimistic updates
- Handle error codes for better UX
- Add loading states during API calls
