/**
 * KN Express Backend API
 * Express server with MongoDB integration
 * Deploy to: Render.com, Railway.app, Heroku, etc.
 */

import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aliabdullah:knex22939@finance.gk7t9we.mongodb.net/?retryWrites=true&w=majority&appName=Finance'
const DB_NAME = 'finance'
const COLLECTION_NAME = 'booking'

if (!process.env.MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI environment variable is not set, using default')
}

let cachedClient = null

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient
  }

  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    cachedClient = client
    
    console.log('✅ Connected to MongoDB')
    console.log(`   Database: ${DB_NAME}`)
    console.log(`   Collection: ${COLLECTION_NAME}`)
    
    return client
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message)
    throw error
  }
}

// Middleware - CORS first
app.use(cors({
  origin: '*', // In production, replace with your frontend URL
  credentials: true
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging middleware - log ALL incoming requests AFTER body parsing
app.use((req, res, next) => {
  console.log('\n🔔 ===== INCOMING REQUEST =====')
  console.log('🔔 Method:', req.method)
  console.log('🔔 URL:', req.url)
  console.log('🔔 Path:', req.path)
  console.log('🔔 Content-Type:', req.headers['content-type'])
  console.log('🔔 Body exists:', !!req.body)
  console.log('🔔 Body type:', typeof req.body)
  if (req.body && typeof req.body === 'object') {
    console.log('🔔 Body keys:', Object.keys(req.body))
    if (req.body.sender) {
      console.log('🔔 Sender exists in body')
    }
    if (req.body.receiver) {
      console.log('🔔 Receiver exists in body')
    }
    if (req.body.items) {
      console.log('🔔 Items exists in body, count:', Array.isArray(req.body.items) ? req.body.items.length : 'not array')
    }
  }
  console.log('================================\n')
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'KN Express Backend API'
  })
})

// API root
app.get('/api', (req, res) => {
  res.json({ 
    message: 'KN Express Booking API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      bookings: 'POST /api/bookings'
    }
  })
})

// Bookings endpoint
app.post('/api/bookings', async (req, res) => {
  console.log('\n🎯 ===== POST /api/bookings ENDPOINT HIT =====')
  console.log('🎯 Timestamp:', new Date().toISOString())
  
  try {
    const bookingData = req.body

    // Log request details
    console.log('\n📥 ===== NEW BOOKING REQUEST =====')
    console.log('📥 Method:', req.method)
    console.log('📥 Content-Type:', req.headers['content-type'])
    console.log('📥 Body type:', typeof req.body)
    console.log('📥 Body exists:', !!req.body)
    console.log('📥 Body keys:', req.body ? Object.keys(req.body) : 'N/A')
    console.log('📥 Has sender:', !!req.body?.sender)
    console.log('📥 Has receiver:', !!req.body?.receiver)
    console.log('📥 Has items:', !!req.body?.items)
    
    // Log raw body if it's a string
    if (typeof req.body === 'string') {
      console.log('📥 Raw body (first 500 chars):', req.body.substring(0, 500))
    }
    
    if (req.body?.sender) {
      console.log('📥 Sender keys:', Object.keys(req.body.sender))
      console.log('📥 Sender firstName:', req.body.sender.firstName)
      console.log('📥 Sender lastName:', req.body.sender.lastName)
      console.log('📥 Sender addressLine1:', req.body.sender.addressLine1)
      console.log('📥 Sender phoneNumber:', req.body.sender.phoneNumber)
    }
    
    if (req.body?.receiver) {
      console.log('📥 Receiver keys:', Object.keys(req.body.receiver))
      console.log('📥 Receiver firstName:', req.body.receiver.firstName)
      console.log('📥 Receiver lastName:', req.body.receiver.lastName)
      console.log('📥 Receiver addressLine1:', req.body.receiver.addressLine1)
      console.log('📥 Receiver phoneNumber:', req.body.receiver.phoneNumber)
    }

    // Validate required fields
    if (!bookingData) {
      console.error('❌ Request body is empty')
      return res.status(400).json({
        success: false,
        error: 'Request body is empty'
      })
    }

    if (!bookingData.sender) {
      console.error('❌ Sender is missing')
      return res.status(400).json({
        success: false,
        error: 'Missing required sender information'
      })
    }

    if (!bookingData.receiver) {
      console.error('❌ Receiver is missing')
      return res.status(400).json({
        success: false,
        error: 'Missing required receiver information'
      })
    }

    if (!bookingData.items) {
      console.error('❌ Items is missing')
      return res.status(400).json({
        success: false,
        error: 'Missing required items information'
      })
    }
    
    if (!Array.isArray(bookingData.items)) {
      console.error('❌ Items is not an array', typeof bookingData.items)
      return res.status(400).json({
        success: false,
        error: 'Items must be an array'
      })
    }
    
    if (bookingData.items.length === 0) {
      console.error('❌ Items array is empty')
      return res.status(400).json({
        success: false,
        error: 'At least one item is required'
      })
    }
    
    // Validate items structure
    const invalidItems = bookingData.items.filter(item => !item.commodity || !item.qty)
    if (invalidItems.length > 0) {
      console.error('❌ Some items are missing commodity or qty')
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

    // Prepare booking document with all detailed fields
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
      items: bookingData.items || [],
      
      // Additional Details
      additionalDetails: {
        paymentMethod: bookingData.additionalDetails?.paymentMethod || 'cash',
        email: bookingData.additionalDetails?.email || '',
        additionalInstructions: bookingData.additionalDetails?.additionalInstructions || ''
      },
      
      // Identity Verification Documents
      identityDocuments: {
        eidFrontImage: bookingData.eidFrontImage || null,
        eidBackImage: bookingData.eidBackImage || null,
        philippinesIdFrontImage: bookingData.philippinesIdFrontImage || null,
        philippinesIdBackImage: bookingData.philippinesIdBackImage || null,
        customerImage: bookingData.customerImage || null, // Single image for backward compatibility
        customerImages: bookingData.customerImages || (bookingData.customerImage ? [bookingData.customerImage] : []) // All face images
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

    console.log('\n📦 ===== BOOKING SAVED SUCCESSFULLY =====')
    console.log(`📦 Reference: ${referenceNumber}`)
    console.log(`📦 ID: ${result.insertedId}`)
    console.log(`📦 Service: ${bookingDocument.service}`)
    console.log(`📦 Sender: ${bookingDocument.sender.firstName} ${bookingDocument.sender.lastName}`)
    console.log(`📦 Sender Address: ${bookingDocument.sender.addressLine1}`)
    console.log(`📦 Sender Phone: ${bookingDocument.sender.phoneNumber}`)
    console.log(`📦 Receiver: ${bookingDocument.receiver.firstName} ${bookingDocument.receiver.lastName}`)
    console.log(`📦 Receiver Address: ${bookingDocument.receiver.addressLine1}`)
    console.log(`📦 Receiver Phone: ${bookingDocument.receiver.phoneNumber}`)
    console.log(`📦 Items: ${bookingDocument.items.length}`)
    console.log(`📦 Has EID Front: ${!!bookingDocument.identityDocuments.eidFrontImage}`)
    console.log(`📦 Has EID Back: ${!!bookingDocument.identityDocuments.eidBackImage}`)
    console.log(`📦 Has Philippines ID Front: ${!!bookingDocument.identityDocuments.philippinesIdFrontImage}`)
    console.log(`📦 Has Philippines ID Back: ${!!bookingDocument.identityDocuments.philippinesIdBackImage}`)
    console.log(`📦 Face Images: ${bookingDocument.identityDocuments.customerImages?.length || 0}`)
    console.log(`📦 Timestamp: ${new Date().toISOString()}`)
    console.log('==========================================\n')

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
    
    return res.status(500).json({
      success: false,
      error: 'Failed to process booking submission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found',
    path: req.path
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
})

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 KN Express Backend API')
  console.log(`📍 Server: http://localhost:${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`\n📡 Endpoints:`)
  console.log(`   GET  /health          - Health check`)
  console.log(`   GET  /api             - API info`)
  console.log(`   POST /api/bookings    - Submit booking`)
  console.log(`\n✅ Server ready and listening...`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n👋 SIGTERM received, closing server gracefully...')
  if (cachedClient) {
    await cachedClient.close()
    console.log('✅ MongoDB connection closed')
  }
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('\n👋 SIGINT received, closing server gracefully...')
  if (cachedClient) {
    await cachedClient.close()
    console.log('✅ MongoDB connection closed')
  }
  process.exit(0)
})

export default app
