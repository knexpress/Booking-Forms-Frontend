import jsPDF from 'jspdf'

export interface BookingPDFData {
  referenceNumber: string
  bookingId?: string
  service?: string
  sender: {
    fullName: string
    completeAddress: string
    contactNo: string
    emailAddress: string
    agentName?: string
  }
  receiver: {
    fullName: string
    completeAddress: string
    contactNo: string
    emailAddress: string
    deliveryOption: 'warehouse' | 'address'
  }
  items: Array<{
    id: string
    commodity: string
    qty: number
  }>
  eidFrontImage?: string
  eidBackImage?: string
  philippinesIdFront?: string
  philippinesIdBack?: string
  customerImage?: string // Single image for backward compatibility
  customerImages?: string[] // Multiple face images
  submissionTimestamp?: string
}

export async function generateBookingPDF(data: BookingPDFData, options?: { openInNewTab?: boolean }): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  // Helper function to add new page if needed
  const checkNewPage = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage()
      yPos = margin
    }
  }

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('KNEX DELIVERY SERVICES', pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('BOOKING CONFIRMATION', pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // Reference Number
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Reference Number: ${data.referenceNumber}`, margin, yPos)
  yPos += 8

  if (data.bookingId) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Booking ID: ${data.bookingId}`, margin, yPos)
    yPos += 8
  }

  if (data.service) {
    // Format service name for display
    let serviceDisplay = data.service.toUpperCase()
    // Replace hyphens with spaces for better readability
    serviceDisplay = serviceDisplay.replace(/-/g, ' ')
    // Handle common route names
    if (serviceDisplay.includes('PH') && serviceDisplay.includes('UAE')) {
      serviceDisplay = 'PH TO UAE'
    } else if (serviceDisplay.includes('UAE') && serviceDisplay.includes('PINAS')) {
      serviceDisplay = 'UAE TO PHILIPPINES'
    }
    doc.text(`Service: ${serviceDisplay}`, margin, yPos)
    yPos += 8
  }

  if (data.submissionTimestamp) {
    const date = new Date(data.submissionTimestamp).toLocaleString()
    doc.text(`Submitted: ${date}`, margin, yPos)
    yPos += 10
  }

  yPos += 5

  // Sender Details
  checkNewPage(50)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('SENDER DETAILS', margin, yPos)
  yPos += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Full Name: ${data.sender.fullName}`, margin, yPos)
  yPos += 6
  doc.text(`Address: ${data.sender.completeAddress}`, margin, yPos)
  yPos += 6
  doc.text(`Contact: ${data.sender.contactNo}`, margin, yPos)
  yPos += 6
  doc.text(`Email: ${data.sender.emailAddress}`, margin, yPos)
  yPos += 6
  if (data.sender.agentName) {
    doc.text(`Agent Name: ${data.sender.agentName}`, margin, yPos)
    yPos += 6
  }
  yPos += 5

  // Receiver Details
  checkNewPage(50)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('RECEIVER DETAILS', margin, yPos)
  yPos += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Full Name: ${data.receiver.fullName}`, margin, yPos)
  yPos += 6
  doc.text(`Address: ${data.receiver.completeAddress}`, margin, yPos)
  yPos += 6
  doc.text(`Contact: ${data.receiver.contactNo}`, margin, yPos)
  yPos += 6
  doc.text(`Email: ${data.receiver.emailAddress}`, margin, yPos)
  yPos += 6
  doc.text(`Delivery Option: ${data.receiver.deliveryOption === 'warehouse' ? 'Warehouse Pickup' : 'Home Delivery'}`, margin, yPos)
  yPos += 10

  // Items
  checkNewPage(30)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('ITEMS DECLARATION', margin, yPos)
  yPos += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  
  if (data.items && data.items.length > 0) {
    data.items.forEach((item, index) => {
      checkNewPage(10)
      doc.text(`${index + 1}. ${item.commodity} - Quantity: ${item.qty}`, margin + 5, yPos)
      yPos += 7
    })
  } else {
    doc.text('No items declared', margin + 5, yPos)
    yPos += 7
  }

  yPos += 10

  // Helper function to add image to PDF
  const addImageToPDF = (imageData: string, label: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        checkNewPage(80)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin, yPos)
        yPos += 8

        // Convert base64 to image
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          try {
            const imgWidth = 70
            const imgHeight = (img.height * imgWidth) / img.width
            
            checkNewPage(imgHeight + 10)
            
            // Determine image format and prepare data
            let format: 'JPEG' | 'PNG' = 'JPEG'
            let imageDataForPDF = imageData
            
            if (imageData.includes('data:image/png')) {
              format = 'PNG'
              // jsPDF needs base64 string without the data URI prefix
              imageDataForPDF = imageData.split(',')[1]
            } else if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
              // jsPDF needs base64 string without the data URI prefix
              imageDataForPDF = imageData.split(',')[1]
            } else if (!imageData.includes(',')) {
              // Already just base64 string
              imageDataForPDF = imageData
            } else {
              // Extract base64 part
              imageDataForPDF = imageData.split(',')[1]
            }
            
            doc.addImage(imageDataForPDF, format, margin, yPos, imgWidth, imgHeight)
            yPos += imgHeight + 10
            resolve()
          } catch (error) {
            console.error(`Error adding image ${label}:`, error)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.text(`${label} not available`, margin, yPos)
            yPos += 8
            resolve()
          }
        }
        
        img.onerror = () => {
          console.error(`Image load error for ${label}`)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.text(`${label} not available`, margin, yPos)
          yPos += 8
          resolve()
        }
        
        img.src = imageData
      } catch (error) {
        console.error(`Error adding ${label}:`, error)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`${label} not available`, margin, yPos)
        yPos += 8
        resolve()
      }
    })
  }

  // Add Images sequentially
  if (data.eidFrontImage) {
    await addImageToPDF(data.eidFrontImage, 'Emirates ID - Front')
  }

  if (data.eidBackImage) {
    await addImageToPDF(data.eidBackImage, 'Emirates ID - Back')
  }

  // Add Philippines ID images if available (for Philippines to UAE route)
  if (data.philippinesIdFront) {
    await addImageToPDF(data.philippinesIdFront, 'Philippines ID - Front')
  }

  if (data.philippinesIdBack) {
    await addImageToPDF(data.philippinesIdBack, 'Philippines ID - Back')
  }

  // Add customer photos - prefer multiple images array, fallback to single image
  const customerPhotos = data.customerImages && data.customerImages.length > 0 
    ? data.customerImages 
    : (data.customerImage ? [data.customerImage] : [])
  
  // Add all customer photos sequentially
  for (let index = 0; index < customerPhotos.length; index++) {
    await addImageToPDF(customerPhotos[index], customerPhotos.length > 1 ? `Customer Photo - ${index + 1}` : 'Customer Photo')
  }

  // Footer
  yPos += 5
  checkNewPage(20)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text('This is a computer-generated document.', pageWidth / 2, yPos, { align: 'center' })
  yPos += 5
  doc.text('Please keep this document for your records.', pageWidth / 2, yPos, { align: 'center' })

  // Output PDF
  if (options?.openInNewTab) {
    const blobUrl = doc.output('bloburl')
    window.open(blobUrl, '_blank')
  } else {
    doc.save(`Booking-${data.referenceNumber}.pdf`)
  }
}

