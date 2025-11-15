# ⚠️ CRITICAL: Philippines ID Images in Backend Payload

## Current Payload Structure

The frontend sends **Philippines ID images at the TOP LEVEL** of the booking payload:

```json
{
  "service": "ph-to-uae",
  "sender": { ... },
  "receiver": { ... },
  "items": [ ... ],
  "eidFrontImage": "data:image/jpeg;base64,...",
  "eidBackImage": "data:image/jpeg;base64,...",
  "philippinesIdFront": "data:image/png;base64,...",  // ⚠️ AT TOP LEVEL
  "philippinesIdBack": "data:image/png;base64,...",   // ⚠️ AT TOP LEVEL
  "customerImage": "data:image/jpeg;base64,...",
  "customerImages": ["data:image/jpeg;base64,..."],
  "termsAccepted": true,
  "submissionTimestamp": "2025-11-15T19:33:41.953Z"
}
```

## Backend Action Required

### 1. **Extract Philippines ID Images from Payload**

Your backend API (`POST /api/bookings`) must extract and save:

```javascript
// Example Node.js/Express handler
app.post('/api/bookings', async (req, res) => {
  const {
    service,
    sender,
    receiver,
    items,
    eidFrontImage,        // Emirates ID Front
    eidBackImage,         // Emirates ID Back
    philippinesIdFront,   // ⚠️ NEW: Philippines ID Front
    philippinesIdBack,    // ⚠️ NEW: Philippines ID Back
    customerImage,        // First face image
    customerImages,       // Array of face images
    termsAccepted,
    submissionTimestamp
  } = req.body

  // Save to database
  const booking = await db.bookings.create({
    service,
    sender: sender,
    receiver: receiver,
    items: items,
    eidFrontImage,        // Save to database
    eidBackImage,         // Save to database
    philippinesIdFront,   // ⚠️ MUST SAVE THIS
    philippinesIdBack,    // ⚠️ MUST SAVE THIS
    customerImage,
    customerImages,
    termsAccepted,
    submissionTimestamp
  })
})
```

### 2. **Database Schema Must Include These Fields**

```sql
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS philippinesIdFront TEXT NULL,
ADD COLUMN IF NOT EXISTS philippinesIdBack TEXT NULL;
```

### 3. **Validation Rules**

- `philippinesIdFront` and `philippinesIdBack` are **REQUIRED** when `service = 'ph-to-uae'`
- These fields are **OPTIONAL** (can be `NULL`) when `service = 'uae-to-pinas'`
- Image format: Base64 data URI (e.g., `data:image/png;base64,...` or `data:image/jpeg;base64,...`)

### 4. **Example Validation**

```javascript
// Validate Philippines ID images for ph-to-uae route
if (service === 'ph-to-uae') {
  if (!philippinesIdFront || !philippinesIdBack) {
    return res.status(400).json({
      success: false,
      error: 'Philippines ID images are required for Philippines to UAE route',
      errors: [
        { field: 'philippinesIdFront', message: 'Philippines ID Front is required' },
        { field: 'philippinesIdBack', message: 'Philippines ID Back is required' }
      ]
    })
  }
}
```

### 5. **Storage Options**

You can store the images as:

**Option A: Base64 in Database (Simple)**
```sql
philippinesIdFront TEXT NULL,  -- Store full base64 string
philippinesIdBack TEXT NULL
```

**Option B: File Storage (Recommended for Production)**
```javascript
// Convert base64 to file and store path
const philippinesIdFrontPath = await saveImageToFile(philippinesIdFront, 'philippines-id-front')
const philippinesIdBackPath = await saveImageToFile(philippinesIdBack, 'philippines-id-back')

// Store paths in database
philippinesIdFront: philippinesIdFrontPath,
philippinesIdBack: philippinesIdBackPath
```

### 6. **Complete Payload Fields Summary**

| Field | Type | Required | Route | Description |
|-------|------|----------|-------|-------------|
| `eidFrontImage` | string | Yes | All | Emirates ID Front (base64) |
| `eidBackImage` | string | Yes | All | Emirates ID Back (base64) |
| `philippinesIdFront` | string | Yes* | ph-to-uae | Philippines ID Front (base64) |
| `philippinesIdBack` | string | Yes* | ph-to-uae | Philippines ID Back (base64) |
| `customerImage` | string | Yes | All | First face image (base64) |
| `customerImages` | array | Yes | All | All face images (base64 array) |

*Required only for `ph-to-uae` route, optional for `uae-to-pinas`

## Testing

Test with this payload structure:

```bash
POST /api/bookings
Content-Type: application/json

{
  "service": "ph-to-uae",
  "sender": { ... },
  "receiver": { ... },
  "items": [ ... ],
  "eidFrontImage": "data:image/jpeg;base64,...",
  "eidBackImage": "data:image/jpeg;base64,...",
  "philippinesIdFront": "data:image/png;base64,...",  // ⚠️ MUST BE SAVED
  "philippinesIdBack": "data:image/png;base64,...",   // ⚠️ MUST BE SAVED
  "customerImage": "data:image/jpeg;base64,...",
  "customerImages": ["data:image/jpeg;base64,..."],
  "termsAccepted": true,
  "submissionTimestamp": "2025-11-15T19:33:41.953Z"
}
```

## Verification Checklist

- [ ] Backend API extracts `philippinesIdFront` from request body
- [ ] Backend API extracts `philippinesIdBack` from request body
- [ ] Database table has `philippinesIdFront` column
- [ ] Database table has `philippinesIdBack` column
- [ ] Images are saved to database (or file storage)
- [ ] Validation requires these fields for `ph-to-uae` route
- [ ] Validation allows `NULL` for `uae-to-pinas` route
- [ ] Images can be retrieved from database for PDF generation
- [ ] Images are included in booking retrieval API responses

---

**Last Updated**: [Current Date]  
**Status**: ⚠️ CRITICAL - Must be implemented before production deployment

