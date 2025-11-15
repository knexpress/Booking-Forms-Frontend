# Backend API Adjustments Required After Frontend Mobile Responsiveness Updates

## Overview
After implementing comprehensive mobile responsiveness improvements to the booking form frontend, the following backend adjustments and validations should be reviewed/updated to ensure consistency.

---

## 1. **Required Field Validations**

### Sender Details (`POST /api/bookings` - `sender` object):
- ✅ **`lastName`** is now **REQUIRED** (previously optional)
- ✅ **`firstName`** remains **REQUIRED**
- ✅ **`emailAddress`** is now **OPTIONAL** (can be empty string `""` or `null`)
- ✅ **`country`** is **REQUIRED**
- ✅ **`addressLine1`** should be validated (optional field, but if provided, validate length ≤ 200 characters)
- ✅ **`dialCode`** is now **STATIC** based on route:
  - Philippines to UAE route: Always `"+63"`
  - UAE to Philippines route: Always `"+971"`
- ✅ **`phoneNumber`** is **REQUIRED** with format validation:
  - UAE dial code (+971): 9 digits (e.g., 501234567)
  - Philippines dial code (+63): 10 digits (e.g., 9123456789)

### Receiver Details (`POST /api/bookings` - `receiver` object):
- ✅ **`lastName`** is now **REQUIRED** (previously optional)
- ✅ **`firstName`** remains **REQUIRED**
- ✅ **`emailAddress`** is now **OPTIONAL** (can be empty string `""` or `null`)
- ✅ **`country`** is **REQUIRED** (automatically set based on route)
- ✅ **`addressLine1`** should be validated (optional field, but if provided, validate length ≤ 200 characters)
- ✅ **`dialCode`** is now **STATIC** based on route:
  - Philippines to UAE route: Always `"+971"` (receiver is in UAE)
  - UAE to Philippines route: Always `"+63"` (receiver is in Philippines)
- ✅ **`phoneNumber`** is **REQUIRED** with format validation:
  - UAE dial code (+971): 9 digits
  - Philippines dial code (+63): 10 digits

---

## 2. **Simplified Address Fields**

### Deprecated/Removed Fields (Still Sent for Backward Compatibility):
The following fields are **NO LONGER COLLECTED** from the user but may still be present in the payload as `undefined` or empty strings:
- `emirates` (sender only)
- `city` (sender)
- `district` (sender)
- `zone` (sender - always empty string)
- `region` (receiver only)
- `province` (receiver only)
- `city` (receiver)
- `barangay` (receiver)
- `landmark` (both sender and receiver)

### Current Address Structure:
```json
{
  "country": "PHILIPPINES" | "UNITED ARAB EMIRATES",
  "addressLine1": "Flat/Villa No., Building, Street & Area (optional, max 200 chars)",
  "completeAddress": "Same as addressLine1 (for backward compatibility)"
}
```

**Backend Action Required:**
- Update validation to accept addresses with only `country` and `addressLine1`
- Do NOT require the deprecated fields (emirates, city, district, region, province, barangay, landmark)
- Update any address formatting logic to use only `country` + `addressLine1`
- Consider adding a migration to handle legacy bookings that may have the old address structure

---

## 3. **Additional Details Removal**

The **Additional Details** step has been completely removed from the booking flow. The `additionalDetails` field is **NO LONGER SENT** in the booking payload.

**Backend Action Required:**
- Update validation to make `additionalDetails` **optional** (or remove requirement entirely)
- If your backend still expects this field, ensure it can handle `undefined` or `null` values
- Consider deprecating this field in your API documentation

---

## 4. **Expected Payload Structure**

### Complete Booking Payload Example:
```json
{
  "service": "ph-to-uae" | "uae-to-pinas",
  "sender": {
    "fullName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",  // REQUIRED
    "country": "PHILIPPINES",
    "addressLine1": "123 Main St, Building A, Area 1",
    "completeAddress": "123 Main St, Building A, Area 1",
    "dialCode": "+63",  // STATIC based on route
    "phoneNumber": "9123456789",  // REQUIRED, 10 digits for +63
    "contactNo": "+639123456789",
    "emailAddress": "john@example.com",  // OPTIONAL (can be "")
    "agentName": "",  // OPTIONAL
    "deliveryOption": "warehouse" | "pickup",
    // Deprecated fields (may be undefined or empty):
    "emirates": undefined,
    "city": undefined,
    "district": undefined,
    "zone": "",
    "landmark": undefined
  },
  "receiver": {
    "fullName": "Jane Smith",
    "firstName": "Jane",
    "lastName": "Smith",  // REQUIRED
    "country": "UNITED ARAB EMIRATES",
    "addressLine1": "456 Business Bay, Dubai",
    "completeAddress": "456 Business Bay, Dubai",
    "dialCode": "+971",  // STATIC based on route
    "phoneNumber": "501234567",  // REQUIRED, 9 digits for +971
    "contactNo": "+971501234567",
    "emailAddress": "jane@example.com",  // OPTIONAL (can be "")
    "deliveryOption": "pickup" | "delivery",
    // Deprecated fields (may be undefined or empty):
    "region": undefined,
    "province": undefined,
    "city": undefined,
    "barangay": undefined,
    "landmark": undefined
  },
  "items": [
    {
      "id": "item-1",
      "commodity": "Electronics",
      "qty": 5
    }
  ],
  // additionalDetails is NO LONGER SENT
  // Image fields are at TOP LEVEL (not in verification object):
  "eidFrontImage": "data:image/jpeg;base64,...",  // Emirates ID Front
  "eidBackImage": "data:image/jpeg;base64,...",   // Emirates ID Back
  "philippinesIdFront": "data:image/png;base64,...",  // ⚠️ NEW: Philippines ID Front (only for ph-to-uae route)
  "philippinesIdBack": "data:image/png;base64,...",   // ⚠️ NEW: Philippines ID Back (only for ph-to-uae route)
  "customerImage": "data:image/jpeg;base64,...",  // First face image (for backward compatibility)
  "customerImages": ["data:image/jpeg;base64,..."],  // Array of all face images
  "termsAccepted": true,
  "submissionTimestamp": "2024-01-15T10:30:00.000Z"
}
```

**⚠️ IMPORTANT:** The image fields (`eidFrontImage`, `eidBackImage`, `philippinesIdFront`, `philippinesIdBack`, `customerImage`, `customerImages`) are sent at the **TOP LEVEL** of the payload, NOT inside a `verification` object.

---

## 5. **Validation Rules Summary**

### Required Fields:
- `service` (string)
- `sender.firstName` (string, 2-50 chars, letters only)
- `sender.lastName` (string, 2-50 chars, letters only) ⚠️ **NEW REQUIREMENT**
- `sender.country` (string)
- `sender.dialCode` (string, static: "+63" or "+971")
- `sender.phoneNumber` (string, digits only, length based on dialCode)
- `sender.contactNo` (string, dialCode + phoneNumber)
- `sender.deliveryOption` (enum: "warehouse" | "pickup")
- `receiver.firstName` (string, 2-50 chars, letters only)
- `receiver.lastName` (string, 2-50 chars, letters only) ⚠️ **NEW REQUIREMENT**
- `receiver.country` (string)
- `receiver.dialCode` (string, static: "+63" or "+971")
- `receiver.phoneNumber` (string, digits only, length based on dialCode)
- `receiver.contactNo` (string, dialCode + phoneNumber)
- `receiver.deliveryOption` (enum: "pickup" | "delivery")
- `items` (array, at least 1 item)
- `verification.eidVerified` (boolean)
- `verification.faceVerified` (boolean)
- `termsAccepted` (boolean)

### Optional Fields:
- `sender.emailAddress` (string, valid email format if provided, can be empty)
- `sender.addressLine1` (string, max 200 chars)
- `sender.agentName` (string)
- `receiver.emailAddress` (string, valid email format if provided, can be empty)
- `receiver.addressLine1` (string, max 200 chars)
- `additionalDetails` (object, completely optional - step removed)

---

## 6. **API Response Recommendations**

### Success Response:
```json
{
  "success": true,
  "bookingId": "BOOK-2024-001234",
  "message": "Booking submitted successfully",
  "data": {
    // Booking details
  }
}
```

### Validation Error Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "field": "sender.lastName",
      "message": "Last name is required"
    },
    {
      "field": "sender.phoneNumber",
      "message": "Phone number must be 10 digits for Philippines (+63)"
    }
  ]
}
```

---

## 7. **Testing Checklist**

Please verify the following scenarios:

- [ ] Booking submission with all required fields succeeds
- [ ] Booking with missing `lastName` (sender or receiver) is rejected
- [ ] Booking with empty `emailAddress` (string `""`) is accepted
- [ ] Booking with missing `emailAddress` (undefined) is accepted
- [ ] Booking with valid `emailAddress` format is accepted
- [ ] Booking with invalid `emailAddress` format is rejected
- [ ] Booking with only `country` + `addressLine1` is accepted (no deprecated address fields required)
- [ ] Dial code validation matches route (Philippines to UAE: +63 for sender, +971 for receiver)
- [ ] Phone number format validation works correctly (9 digits for +971, 10 digits for +63)
- [ ] Booking without `additionalDetails` field is accepted
- [ ] All deprecated address fields can be `undefined` or empty strings

---

## 8. **Migration Considerations**

If you have existing bookings in your database:

1. **Address Fields**: Existing bookings may have the old address structure. Ensure your queries/display logic can handle both formats.
2. **Email Address**: Some existing bookings may have `null` email addresses. This should now be acceptable.
3. **Last Name**: If any existing records have `null` or empty `lastName`, you may want to flag them for data cleanup or handle them gracefully in queries.
4. **Additional Details**: Existing bookings may have `additionalDetails`. Ensure this doesn't break any queries.

---

## Questions or Issues?

If you need clarification on any of these changes or encounter issues during implementation, please contact the frontend development team.

**Last Updated**: [Current Date]
**Frontend Version**: Mobile Responsive Update v1.0

