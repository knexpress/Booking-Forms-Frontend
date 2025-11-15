/**
 * Vercel Serverless Function
 * Handles booking submissions and saves to MongoDB
 */

import { MongoClient } from 'mongodb'

// MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aliabdullah:knex22939@finance.gk7t9we.mongodb.net/?retryWrites=true&w=majority&appName=Finance'
const DB_NAME = 'finance'
const COLLECTION_NAME = 'booking'

let cachedClient = null

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient
  }

  const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  await client.connect()
  cachedClient = client
  
  console.log('✅ Connected to MongoDB')
  return client
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    // Get request body - Vercel auto-parses JSON
    const bookingData = req.body

    // Log request details (visible in Vercel/ngrok logs)
    console.log('📥 ===== NEW BOOKING REQUEST =====')
    console.log('📥 Method:', req.method)
    console.log('📥 Content-Type:', req.headers['content-type'])
    console.log('📥 Body type:', typeof req.body)
    console.log('📥 Body exists:', !!req.body)
    console.log('📥 Body keys:', req.body ? Object.keys(req.body) : 'N/A')
    console.log('📥 Has sender:', !!req.body?.sender)
    console.log('📥 Has receiver:', !!req.body?.receiver)
    console.log('📥 Has items:', !!req.body?.items)

    // Validate request body exists
    if (!bookingData) {
      console.error('❌ Request body is empty')
      return res.status(400).json({
        success: false,
        error: 'Request body is empty'
      })
    }

    // Validate required fields
    console.log('🔍 Validating booking data...')
    console.log('🔍 Sender exists:', !!bookingData.sender)
    console.log('🔍 Receiver exists:', !!bookingData.receiver)
    console.log('🔍 Items exists:', !!bookingData.items)
    console.log('🔍 Items count:', bookingData.items?.length || 0)
    console.log('🔍 Sender firstName:', bookingData.sender?.firstName)
    console.log('🔍 Sender lastName:', bookingData.sender?.lastName)
    console.log('🔍 Sender addressLine1:', bookingData.sender?.addressLine1)
    console.log('🔍 Sender phoneNumber:', bookingData.sender?.phoneNumber)
    console.log('🔍 Receiver firstName:', bookingData.receiver?.firstName)
    console.log('🔍 Receiver lastName:', bookingData.receiver?.lastName)
    console.log('🔍 Receiver addressLine1:', bookingData.receiver?.addressLine1)
    console.log('🔍 Receiver phoneNumber:', bookingData.receiver?.phoneNumber)

    if (!bookingData.sender) {
      console.error('❌ Validation failed: sender is missing')
      return res.status(400).json({
        success: false,
        error: 'Missing required sender information'
      })
    }

    if (!bookingData.receiver) {
      console.error('❌ Validation failed: receiver is missing')
      return res.status(400).json({
        success: false,
        error: 'Missing required receiver information'
      })
    }

    if (!bookingData.items) {
      console.error('❌ Validation failed: items is missing')
      return res.status(400).json({
        success: false,
        error: 'Missing required items information'
      })
    }
    
    if (!Array.isArray(bookingData.items)) {
      console.error('❌ Validation failed: items is not an array', typeof bookingData.items)
      return res.status(400).json({
        success: false,
        error: 'Items must be an array'
      })
    }
    
    if (bookingData.items.length === 0) {
      console.error('❌ Validation failed: items array is empty')
      return res.status(400).json({
        success: false,
        error: 'At least one item is required'
      })
    }
    
    // Validate items structure
    const invalidItems = bookingData.items.filter(item => !item.commodity || !item.qty)
    if (invalidItems.length > 0) {
      console.error('❌ Validation failed: some items are missing commodity or qty')
      return res.status(400).json({
        success: false,
        error: 'All items must have commodity and qty fields'
      })
    }

    // Validate sender required fields - check for non-empty strings
    // Convert to string first in case it's a number
    const senderFirstName = String(bookingData.sender.firstName || '').trim()
    const senderLastName = String(bookingData.sender.lastName || '').trim()
    const senderAddressLine1 = String(bookingData.sender.addressLine1 || '').trim()
    const senderPhoneNumber = String(bookingData.sender.phoneNumber || '').trim()
    
    console.log('🔍 Sender field validation:', {
      firstName: senderFirstName,
      lastName: senderLastName,
      addressLine1: senderAddressLine1,
      phoneNumber: senderPhoneNumber,
      firstNameValid: senderFirstName.length > 0,
      lastNameValid: senderLastName.length > 0,
      addressValid: senderAddressLine1.length > 0,
      phoneValid: senderPhoneNumber.length > 0
    })
    
    if (!senderFirstName || !senderLastName || !senderAddressLine1 || !senderPhoneNumber) {
      const missingFields = []
      if (!senderFirstName) missingFields.push('firstName')
      if (!senderLastName) missingFields.push('lastName')
      if (!senderAddressLine1) missingFields.push('addressLine1')
      if (!senderPhoneNumber) missingFields.push('phoneNumber')
      
      console.error('❌ Validation failed: sender required fields missing:', missingFields)
      return res.status(400).json({
        success: false,
        error: `Missing required sender fields: ${missingFields.join(', ')}`
      })
    }

    // Validate receiver required fields - check for non-empty strings
    // Convert to string first in case it's a number
    const receiverFirstName = String(bookingData.receiver.firstName || '').trim()
    const receiverLastName = String(bookingData.receiver.lastName || '').trim()
    const receiverAddressLine1 = String(bookingData.receiver.addressLine1 || '').trim()
    const receiverPhoneNumber = String(bookingData.receiver.phoneNumber || '').trim()
    
    console.log('🔍 Receiver field validation:', {
      firstName: receiverFirstName,
      lastName: receiverLastName,
      addressLine1: receiverAddressLine1,
      phoneNumber: receiverPhoneNumber,
      firstNameValid: receiverFirstName.length > 0,
      lastNameValid: receiverLastName.length > 0,
      addressValid: receiverAddressLine1.length > 0,
      phoneValid: receiverPhoneNumber.length > 0
    })
    
    if (!receiverFirstName || !receiverLastName || !receiverAddressLine1 || !receiverPhoneNumber) {
      const missingFields = []
      if (!receiverFirstName) missingFields.push('firstName')
      if (!receiverLastName) missingFields.push('lastName')
      if (!receiverAddressLine1) missingFields.push('addressLine1')
      if (!receiverPhoneNumber) missingFields.push('phoneNumber')
      
      console.error('❌ Validation failed: receiver required fields missing:', missingFields)
      return res.status(400).json({
        success: false,
        error: `Missing required receiver fields: ${missingFields.join(', ')}`
      })
    }

    // Generate unique reference number
    const referenceNumber = 'KNX' + Date.now().toString(36).toUpperCase()
    
    // Connect to MongoDB
    const client = await connectToDatabase()
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION_NAME)

    // Prepare booking document with all fields
    const bookingDocument = {
      referenceNumber: referenceNumber,
      service: bookingData.service || 'uae-to-pinas',
      
      // Sender Details - Updated schema to match simplified form
      sender: {
        // Personal Information
        fullName: bookingData.sender.fullName?.trim() || '',
        firstName: senderFirstName,
        lastName: senderLastName,
        emailAddress: bookingData.sender.emailAddress?.trim() || '', // Optional
        agentName: bookingData.sender.agentName?.trim() || '',
        
        // Address Information - Simplified (only addressLine1 is required)
        completeAddress: bookingData.sender.completeAddress?.trim() || senderAddressLine1,
        country: bookingData.sender.country || (bookingData.service === 'ph-to-uae' ? 'PHILIPPINES' : 'UNITED ARAB EMIRATES'),
        addressLine1: senderAddressLine1,
        // Legacy location fields (kept for backward compatibility, but empty)
        emirates: bookingData.sender.emirates?.trim() || '',
        city: bookingData.sender.city?.trim() || '',
        district: bookingData.sender.district?.trim() || '',
        zone: bookingData.sender.zone?.trim() || '',
        region: bookingData.sender.region?.trim() || '',
        province: bookingData.sender.province?.trim() || '',
        barangay: bookingData.sender.barangay?.trim() || '',
        landmark: bookingData.sender.landmark?.trim() || '',
        
        // Contact Information
        dialCode: bookingData.sender.dialCode?.trim() || (bookingData.service === 'ph-to-uae' ? '+63' : '+971'),
        phoneNumber: senderPhoneNumber,
        contactNo: bookingData.sender.contactNo?.trim() || `${bookingData.sender.dialCode || (bookingData.service === 'ph-to-uae' ? '+63' : '+971')}${senderPhoneNumber}`,
        
        // Delivery Options
        deliveryOption: bookingData.sender.deliveryOption || 'warehouse'
      },
      
      // Receiver Details - Updated schema to match simplified form
      receiver: {
        // Personal Information
        fullName: bookingData.receiver.fullName?.trim() || '',
        firstName: receiverFirstName,
        lastName: receiverLastName,
        emailAddress: bookingData.receiver.emailAddress?.trim() || '', // Optional
        
        // Address Information - Simplified (only addressLine1 is required)
        completeAddress: bookingData.receiver.completeAddress?.trim() || receiverAddressLine1,
        country: bookingData.receiver.country || (bookingData.service === 'ph-to-uae' ? 'UNITED ARAB EMIRATES' : 'PHILIPPINES'),
        addressLine1: receiverAddressLine1,
        // Legacy location fields (kept for backward compatibility, but empty)
        region: bookingData.receiver.region?.trim() || '',
        province: bookingData.receiver.province?.trim() || '',
        city: bookingData.receiver.city?.trim() || '',
        barangay: bookingData.receiver.barangay?.trim() || '',
        emirates: bookingData.receiver.emirates?.trim() || '',
        district: bookingData.receiver.district?.trim() || '',
        landmark: bookingData.receiver.landmark?.trim() || '',
        
        // Contact Information
        dialCode: bookingData.receiver.dialCode?.trim() || (bookingData.service === 'ph-to-uae' ? '+971' : '+63'),
        phoneNumber: receiverPhoneNumber,
        contactNo: bookingData.receiver.contactNo?.trim() || `${bookingData.receiver.dialCode || (bookingData.service === 'ph-to-uae' ? '+971' : '+63')}${receiverPhoneNumber}`,
        
        // Delivery Options
        deliveryOption: bookingData.receiver.deliveryOption || 'delivery'
      },
      
      // Items/Commodities
      items: (bookingData.items || []).map(item => ({
        id: item.id || '',
        commodity: item.commodity || '',
        qty: item.qty || 0
      })),
      
      // Identity Verification Documents (including all images)
      identityDocuments: {
        eidFrontImage: bookingData.eidFrontImage || null,
        eidBackImage: bookingData.eidBackImage || null,
        philippinesIdFrontImage: bookingData.philippinesIdFrontImage || null,
        philippinesIdBackImage: bookingData.philippinesIdBackImage || null,
        customerImage: bookingData.customerImage || null,
        customerImages: bookingData.customerImages || (bookingData.customerImage ? [bookingData.customerImage] : [])
      },
      
      // Terms and Status
      termsAccepted: bookingData.termsAccepted || false,
      submittedAt: new Date(),
      submissionTimestamp: bookingData.submissionTimestamp || new Date().toISOString(),
      status: 'pending',
      source: 'web'
    }

    // Insert into MongoDB
    const result = await collection.insertOne(bookingDocument)

    console.log('📦 Booking saved successfully')
    console.log('   Reference:', referenceNumber)
    console.log('   ID:', result.insertedId)
    console.log('   Service:', bookingDocument.service)
    console.log('   Sender:', bookingDocument.sender.fullName)
    console.log('   Receiver:', bookingDocument.receiver.fullName)
    console.log('   Items:', bookingDocument.items.length)
    console.log('   Has EID Front:', !!bookingDocument.identityDocuments.eidFrontImage)
    console.log('   Has EID Back:', !!bookingDocument.identityDocuments.eidBackImage)
    console.log('   Has Philippines ID Front:', !!bookingDocument.identityDocuments.philippinesIdFrontImage)
    console.log('   Has Philippines ID Back:', !!bookingDocument.identityDocuments.philippinesIdBackImage)
    console.log('   Face Images Count:', bookingDocument.identityDocuments.customerImages?.length || 0)

    // Return success response
    return res.status(200).json({
      success: true,
      referenceNumber: referenceNumber,
      bookingId: result.insertedId,
      message: 'Booking submitted successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Booking submission error:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error name:', error.name)
    console.error('❌ Request body type:', typeof req.body)
    console.error('❌ Request body keys:', req.body ? Object.keys(req.body) : 'N/A')
    
    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? (error.message || 'Unknown error')
      : 'Failed to process booking submission'
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
