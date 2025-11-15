# Database Schema Changes Required

## Overview
This document outlines all database schema changes needed to reflect the frontend updates made to the booking form system.

---

## 1. **Required Field Changes**

### Sender Table/Collection:
- ✅ **`lastName`** - Change from `NULL`/`optional` to **`NOT NULL`** (REQUIRED)
- ✅ **`emailAddress`** - Change from `NOT NULL` to **`NULL`** (OPTIONAL, can be empty)
- ✅ **`dialCode`** - Should be stored but is now **STATIC** based on route (cannot be changed by user)

### Receiver Table/Collection:
- ✅ **`lastName`** - Change from `NULL`/`optional` to **`NOT NULL`** (REQUIRED)
- ✅ **`emailAddress`** - Change from `NOT NULL` to **`NULL`** (OPTIONAL, can be empty)
- ✅ **`dialCode`** - Should be stored but is now **STATIC** based on route (cannot be changed by user)

---

## 2. **Address Field Changes (Simplified Structure)**

### Deprecated/Removed Fields (Keep for Backward Compatibility):
The following fields are **NO LONGER COLLECTED** from users but should be kept in the database schema for backward compatibility with existing records:

#### Sender Table:
- `emirates` - Keep field, allow `NULL`
- `city` - Keep field, allow `NULL`
- `district` - Keep field, allow `NULL`
- `zone` - Keep field, allow `NULL` (always empty string now)
- `landmark` - Keep field, allow `NULL`

#### Receiver Table:
- `region` - Keep field, allow `NULL`
- `province` - Keep field, allow `NULL`
- `city` - Keep field, allow `NULL`
- `barangay` - Keep field, allow `NULL`
- `landmark` - Keep field, allow `NULL`

### Current Active Address Fields:
Both Sender and Receiver now only use:
- ✅ **`country`** - `VARCHAR`/`STRING` - REQUIRED
- ✅ **`addressLine1`** - `VARCHAR(200)` - OPTIONAL (max 200 characters)
- ✅ **`completeAddress`** - `TEXT` - Auto-generated from addressLine1 (for backward compatibility)

---

## 3. **Philippines ID Images (New Fields)**

### Verification/Booking Table:
Add the following **new fields** to store Philippines ID images for Philippines to UAE route:

- ✅ **`philippinesIdFront`** - `TEXT`/`LONGTEXT`/`BLOB` - OPTIONAL
  - Stores base64 image or file path/URL
  - Only populated for Philippines to UAE route
  - Format: Base64 string or file reference

- ✅ **`philippinesIdBack`** - `TEXT`/`LONGTEXT`/`BLOB` - OPTIONAL
  - Stores base64 image or file path/URL
  - Only populated for Philippines to UAE route
  - Format: Base64 string or file reference

**Note:** These fields should only be populated when `service = 'ph-to-uae'` and sender is from Philippines.

---

## 4. **Additional Details Section (Removed)**

### Booking Table:
- ✅ **`additionalDetails`** - Keep field but make it **OPTIONAL** (can be `NULL`)
  - The frontend no longer collects this data
  - Keep field for backward compatibility with existing records
  - New bookings will have `NULL` for this field

**Alternative:** If you want to completely remove this field:
- Create a migration to remove `additionalDetails` column/field
- Ensure no existing queries depend on this field
- Consider keeping it as optional for data history

---

## 5. **Complete Database Schema Recommendations**

### ⚠️ IMPORTANT: Payload Structure

**The image fields are sent at the TOP LEVEL of the payload, NOT in a nested object:**

```json
{
  "service": "ph-to-uae",
  "sender": { ... },
  "receiver": { ... },
  "items": [ ... ],
  "eidFrontImage": "data:image/jpeg;base64,...",      // ⚠️ TOP LEVEL
  "eidBackImage": "data:image/jpeg;base64,...",        // ⚠️ TOP LEVEL
  "philippinesIdFront": "data:image/png;base64,...",   // ⚠️ TOP LEVEL - NEW
  "philippinesIdBack": "data:image/png;base64,...",    // ⚠️ TOP LEVEL - NEW
  "customerImage": "data:image/jpeg;base64,...",        // ⚠️ TOP LEVEL
  "customerImages": ["data:image/jpeg;base64,..."],    // ⚠️ TOP LEVEL
  "termsAccepted": true,
  "submissionTimestamp": "2025-11-15T19:33:41.953Z"
}
```

### Example SQL Schema (MySQL/PostgreSQL):

```sql
-- Sender Table
CREATE TABLE IF NOT EXISTS sender_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id VARCHAR(255) NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,  -- ✅ NOW REQUIRED (was optional)
  
  -- Address (Simplified)
  country VARCHAR(100) NOT NULL,
  addressLine1 VARCHAR(200),  -- ✅ OPTIONAL (max 200 chars)
  completeAddress TEXT,  -- Auto-generated
  
  -- Deprecated Address Fields (Keep for backward compatibility)
  emirates VARCHAR(100) NULL,  -- ✅ DEPRECATED
  city VARCHAR(100) NULL,  -- ✅ DEPRECATED
  district VARCHAR(100) NULL,  -- ✅ DEPRECATED
  zone VARCHAR(100) NULL,  -- ✅ DEPRECATED
  landmark VARCHAR(200) NULL,  -- ✅ DEPRECATED
  
  -- Contact
  dialCode VARCHAR(10) NOT NULL,  -- ✅ STATIC based on route
  phoneNumber VARCHAR(20) NOT NULL,
  contactNo VARCHAR(30) NOT NULL,  -- Combined dialCode + phoneNumber
  
  emailAddress VARCHAR(255) NULL,  -- ✅ NOW OPTIONAL (was required)
  agentName VARCHAR(255) NULL,
  
  deliveryOption ENUM('warehouse', 'pickup') NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_booking_id (booking_id)
);

-- Receiver Table
CREATE TABLE IF NOT EXISTS receiver_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id VARCHAR(255) NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,  -- ✅ NOW REQUIRED (was optional)
  
  -- Address (Simplified)
  country VARCHAR(100) NOT NULL,
  addressLine1 VARCHAR(200),  -- ✅ OPTIONAL (max 200 chars)
  completeAddress TEXT,  -- Auto-generated
  
  -- Deprecated Address Fields (Keep for backward compatibility)
  region VARCHAR(100) NULL,  -- ✅ DEPRECATED
  province VARCHAR(100) NULL,  -- ✅ DEPRECATED
  city VARCHAR(100) NULL,  -- ✅ DEPRECATED
  barangay VARCHAR(100) NULL,  -- ✅ DEPRECATED
  landmark VARCHAR(200) NULL,  -- ✅ DEPRECATED
  
  -- Contact
  dialCode VARCHAR(10) NOT NULL,  -- ✅ STATIC based on route
  phoneNumber VARCHAR(20) NOT NULL,
  contactNo VARCHAR(30) NOT NULL,  -- Combined dialCode + phoneNumber
  
  emailAddress VARCHAR(255) NULL,  -- ✅ NOW OPTIONAL (was required)
  
  deliveryOption ENUM('pickup', 'delivery') NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_booking_id (booking_id)
);

-- Verification/Booking Table (Updated)
CREATE TABLE IF NOT EXISTS bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id VARCHAR(255) UNIQUE NOT NULL,
  reference_number VARCHAR(255) UNIQUE NOT NULL,
  service VARCHAR(50) NOT NULL,  -- 'ph-to-uae' or 'uae-to-pinas'
  
  -- ID Verification Images (stored at TOP LEVEL in payload)
  eidFrontImage TEXT,  -- Emirates ID Front (base64 or file path)
  eidBackImage TEXT,  -- Emirates ID Back (base64 or file path)
  
  -- ✅ NEW: Philippines ID Images (stored at TOP LEVEL in payload)
  philippinesIdFront TEXT NULL,  -- ✅ NEW: Philippines ID Front (only for ph-to-uae route)
  philippinesIdBack TEXT NULL,  -- ✅ NEW: Philippines ID Back (only for ph-to-uae route)
  
  -- Face Verification Images (stored at TOP LEVEL in payload)
  customerImage TEXT,  -- Single face image (backward compatibility) - maps to "customerImage" in payload
  customerImages JSON,  -- Array of face images - maps to "customerImages" in payload
  
  -- Verification Status (derived, not in payload)
  eidVerified BOOLEAN DEFAULT FALSE,
  faceVerified BOOLEAN DEFAULT FALSE,
  
  -- ✅ REMOVED: Additional Details (keep field but make optional)
  additionalDetails JSON NULL,  -- ✅ NOW OPTIONAL (frontend no longer collects)
  
  termsAccepted BOOLEAN DEFAULT FALSE,
  submissionTimestamp TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_booking_id (booking_id),
  INDEX idx_reference_number (reference_number),
  INDEX idx_service (service)
);

-- Items Table (No changes needed)
CREATE TABLE IF NOT EXISTS booking_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id VARCHAR(255) NOT NULL,
  commodity VARCHAR(100) NOT NULL,
  qty INT NOT NULL CHECK (qty > 0 AND qty <= 9999),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  INDEX idx_booking_id (booking_id)
);
```

---

## 6. **Migration Scripts**

### Migration 1: Update Sender Table

```sql
-- Make lastName required
ALTER TABLE sender_details 
MODIFY COLUMN lastName VARCHAR(100) NOT NULL;

-- Make emailAddress optional
ALTER TABLE sender_details 
MODIFY COLUMN emailAddress VARCHAR(255) NULL;

-- Add addressLine1 if not exists
ALTER TABLE sender_details 
ADD COLUMN IF NOT EXISTS addressLine1 VARCHAR(200) NULL AFTER country;

-- Deprecate old address fields (make nullable if not already)
ALTER TABLE sender_details 
MODIFY COLUMN emirates VARCHAR(100) NULL,
MODIFY COLUMN city VARCHAR(100) NULL,
MODIFY COLUMN district VARCHAR(100) NULL,
MODIFY COLUMN zone VARCHAR(100) NULL,
MODIFY COLUMN landmark VARCHAR(200) NULL;
```

### Migration 2: Update Receiver Table

```sql
-- Make lastName required
ALTER TABLE receiver_details 
MODIFY COLUMN lastName VARCHAR(100) NOT NULL;

-- Make emailAddress optional
ALTER TABLE receiver_details 
MODIFY COLUMN emailAddress VARCHAR(255) NULL;

-- Add addressLine1 if not exists
ALTER TABLE receiver_details 
ADD COLUMN IF NOT EXISTS addressLine1 VARCHAR(200) NULL AFTER country;

-- Deprecate old address fields (make nullable if not already)
ALTER TABLE receiver_details 
MODIFY COLUMN region VARCHAR(100) NULL,
MODIFY COLUMN province VARCHAR(100) NULL,
MODIFY COLUMN city VARCHAR(100) NULL,
MODIFY COLUMN barangay VARCHAR(100) NULL,
MODIFY COLUMN landmark VARCHAR(200) NULL;
```

### Migration 3: Update Bookings Table (Add Philippines ID)

```sql
-- Add Philippines ID fields
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS philippinesIdFront TEXT NULL AFTER eidBackImage,
ADD COLUMN IF NOT EXISTS philippinesIdBack TEXT NULL AFTER philippinesIdFront;

-- Make additionalDetails optional if it was required
ALTER TABLE bookings 
MODIFY COLUMN additionalDetails JSON NULL;
```

---

## 7. **Validation Rules Summary**

### Sender Validation:
- ✅ `firstName`: REQUIRED, 2-50 characters, letters only
- ✅ `lastName`: REQUIRED, 2-50 characters, letters only ⚠️ **NEW REQUIREMENT**
- ✅ `country`: REQUIRED
- ✅ `addressLine1`: OPTIONAL, max 200 characters
- ✅ `dialCode`: REQUIRED, STATIC based on route (+63 for Philippines, +971 for UAE)
- ✅ `phoneNumber`: REQUIRED, 9 digits for +971, 10 digits for +63
- ✅ `emailAddress`: OPTIONAL, valid email format if provided ⚠️ **NOW OPTIONAL**
- ✅ `agentName`: OPTIONAL
- ✅ `deliveryOption`: REQUIRED, enum('warehouse', 'pickup')

### Receiver Validation:
- ✅ `firstName`: REQUIRED, 2-50 characters, letters only
- ✅ `lastName`: REQUIRED, 2-50 characters, letters only ⚠️ **NEW REQUIREMENT**
- ✅ `country`: REQUIRED
- ✅ `addressLine1`: OPTIONAL, max 200 characters
- ✅ `dialCode`: REQUIRED, STATIC based on route (+63 for Philippines, +971 for UAE)
- ✅ `phoneNumber`: REQUIRED, 9 digits for +971, 10 digits for +63
- ✅ `emailAddress`: OPTIONAL, valid email format if provided ⚠️ **NOW OPTIONAL**
- ✅ `deliveryOption`: REQUIRED, enum('pickup', 'delivery')

### Booking Validation:
- ✅ `eidFrontImage`: OPTIONAL (required for UAE routes)
- ✅ `eidBackImage`: OPTIONAL (required for UAE routes)
- ✅ `philippinesIdFront`: OPTIONAL ⚠️ **NEW FIELD** (required for ph-to-uae route)
- ✅ `philippinesIdBack`: OPTIONAL ⚠️ **NEW FIELD** (required for ph-to-uae route)
- ✅ `faceImages`: REQUIRED (at least one image)
- ✅ `eidVerified`: REQUIRED, boolean
- ✅ `faceVerified`: REQUIRED, boolean
- ✅ `additionalDetails`: OPTIONAL ⚠️ **NO LONGER COLLECTED** (deprecated)
- ✅ `termsAccepted`: REQUIRED, boolean

---

## 8. **Data Migration for Existing Records**

### Handle Existing Records Without Last Name:

```sql
-- Check for records with NULL lastName
SELECT COUNT(*) FROM sender_details WHERE lastName IS NULL OR lastName = '';
SELECT COUNT(*) FROM receiver_details WHERE lastName IS NULL OR lastName = '';

-- Option 1: Set default value (if you have fullName)
UPDATE sender_details 
SET lastName = SUBSTRING_INDEX(fullName, ' ', -1)
WHERE (lastName IS NULL OR lastName = '') AND fullName IS NOT NULL;

UPDATE receiver_details 
SET lastName = SUBSTRING_INDEX(fullName, ' ', -1)
WHERE (lastName IS NULL OR lastName = '') AND fullName IS NOT NULL;

-- Option 2: Set to a placeholder (if fullName is not available)
UPDATE sender_details 
SET lastName = 'UNKNOWN'
WHERE lastName IS NULL OR lastName = '';

UPDATE receiver_details 
SET lastName = 'UNKNOWN'
WHERE lastName IS NULL OR lastName = '';
```

### Migrate Old Address Data to addressLine1:

```sql
-- Migrate existing address data to addressLine1
UPDATE sender_details 
SET addressLine1 = CONCAT_WS(', ', 
  IFNULL(zone, ''), 
  IFNULL(district, ''), 
  IFNULL(city, ''), 
  IFNULL(emirates, ''),
  IFNULL(landmark, '')
)
WHERE addressLine1 IS NULL OR addressLine1 = '';

UPDATE receiver_details 
SET addressLine1 = CONCAT_WS(', ', 
  IFNULL(region, ''), 
  IFNULL(province, ''), 
  IFNULL(city, ''), 
  IFNULL(barangay, ''),
  IFNULL(landmark, '')
)
WHERE addressLine1 IS NULL OR addressLine1 = '';
```

---

## 9. **API Payload Changes**

### Updated Booking Creation Payload:

```json
{
  "service": "ph-to-uae" | "uae-to-pinas",
  "sender": {
    "fullName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",  // ✅ REQUIRED
    "country": "PHILIPPINES",
    "addressLine1": "123 Main St, Building A, Area 1",  // ✅ NEW: Only this field
    "completeAddress": "123 Main St, Building A, Area 1",
    "dialCode": "+63",  // ✅ STATIC
    "phoneNumber": "9123456789",  // ✅ REQUIRED
    "contactNo": "+639123456789",
    "emailAddress": "john@example.com",  // ✅ OPTIONAL (can be "")
    "agentName": "",  // ✅ OPTIONAL
    "deliveryOption": "warehouse" | "pickup"
    // Deprecated fields (may still be sent but should be ignored):
    // "emirates": null,
    // "city": null,
    // "district": null,
    // "zone": "",
    // "landmark": null
  },
  "receiver": {
    "fullName": "Jane Smith",
    "firstName": "Jane",
    "lastName": "Smith",  // ✅ REQUIRED
    "country": "UNITED ARAB EMIRATES",
    "addressLine1": "456 Business Bay, Dubai",  // ✅ NEW: Only this field
    "completeAddress": "456 Business Bay, Dubai",
    "dialCode": "+971",  // ✅ STATIC
    "phoneNumber": "501234567",  // ✅ REQUIRED
    "contactNo": "+971501234567",
    "emailAddress": "jane@example.com",  // ✅ OPTIONAL (can be "")
    "deliveryOption": "pickup" | "delivery"
    // Deprecated fields (may still be sent but should be ignored):
    // "region": null,
    // "province": null,
    // "city": null,
    // "barangay": null,
    // "landmark": null
  },
  "items": [
    {
      "id": "item-1",
      "commodity": "Electronics",
      "qty": 5
    }
  ],
  "verification": {
    "eidFrontImage": "base64...",  // Optional (required for UAE routes)
    "eidBackImage": "base64...",  // Optional (required for UAE routes)
    "philippinesIdFront": "base64...",  // ✅ NEW: Optional (required for ph-to-uae)
    "philippinesIdBack": "base64...",  // ✅ NEW: Optional (required for ph-to-uae)
    "faceImages": ["base64..."],
    "eidVerified": true,
    "faceVerified": true
  },
  "termsAccepted": true,
  "submissionTimestamp": "2024-01-15T10:30:00.000Z"
  // ✅ REMOVED: "additionalDetails" - No longer collected
}
```

---

## 10. **Testing Checklist**

Before deploying to production, test:

- [ ] Create booking with all required fields (including lastName)
- [ ] Create booking without emailAddress (should succeed)
- [ ] Create booking with empty string emailAddress (should succeed)
- [ ] Create booking with only country and addressLine1 (no deprecated fields)
- [ ] Create Philippines to UAE booking with philippinesIdFront and philippinesIdBack
- [ ] Create UAE to Philippines booking without philippinesIdFront/Back (should succeed)
- [ ] Verify dialCode is static based on route (cannot be changed by user)
- [ ] Verify phoneNumber format validation (9 digits for +971, 10 digits for +63)
- [ ] Test backward compatibility with old address fields (should accept NULL)
- [ ] Test booking creation without additionalDetails field (should succeed)
- [ ] Verify lastName cannot be NULL (database constraint)
- [ ] Verify emailAddress can be NULL (database constraint)
- [ ] Test PDF generation includes philippinesIdFront and philippinesIdBack when available

---

## 11. **Backward Compatibility Notes**

1. **Deprecated Address Fields**: Keep these fields in the schema but make them nullable. Existing queries can still work, but new bookings won't populate them.

2. **Additional Details**: Keep the field as optional. Old bookings may have data, but new bookings won't.

3. **Last Name**: For existing records without lastName, run the migration script to populate from fullName or set a default value before making it required.

4. **Email Address**: Existing records may have emailAddress. Allow NULL going forward, but don't remove existing data.

---

## Summary of Changes

### ✅ Required Changes:
1. Make `lastName` required in sender and receiver tables
2. Make `emailAddress` optional in sender and receiver tables
3. Add `philippinesIdFront` and `philippinesIdBack` fields to bookings table
4. Make `additionalDetails` optional in bookings table (if it was required)
5. Add `addressLine1` field to sender and receiver tables (if not exists)

### ✅ Recommended Changes:
1. Keep deprecated address fields but make them nullable
2. Run data migration for existing records without lastName
3. Migrate old address data to addressLine1 for existing records

### ⚠️ Breaking Changes:
- `lastName` is now required (may break existing records without lastName)
- `emailAddress` is now optional (should not break anything)
- `additionalDetails` is no longer collected (should not break anything, but old data may exist)

---

## Questions?

If you need clarification on any of these changes or need help with specific database migrations, please contact the frontend development team.

**Last Updated**: [Current Date]  
**Frontend Version**: Mobile Responsive Update v1.0

