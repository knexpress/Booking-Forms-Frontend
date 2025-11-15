import { useState } from 'react'
import { FileText, CheckCircle, ArrowLeft, Send } from 'lucide-react'

interface Step4Props {
  onSubmit: () => void
  onBack: () => void
}

export default function Step4TermsSubmission({ onSubmit, onBack }: Step4Props) {
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!agreed) {
      alert('Please read and agree to the Terms and Conditions to proceed.')
      return
    }

    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    onSubmit()
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Terms and Conditions</h2>
        <p className="text-sm text-gray-500">
          Please review and accept our terms before final submission
        </p>
      </div>

      {/* Terms Content */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-6 h-6 text-primary-600" />
          <h3 className="text-xl font-semibold text-gray-800">KNEX Delivery Services Terms & Conditions</h3>
        </div>

        <div className="h-96 overflow-y-auto bg-gray-50 p-6 rounded-lg border border-gray-300 space-y-4 text-sm text-gray-700">
          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">1. ACCEPTANCE OF TERMS</h4>
            <p>
              By using KNEX Delivery Services L.L.C cargo booking and delivery services, you agree to be bound by these 
              Terms and Conditions. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">2. SERVICE DESCRIPTION</h4>
            <p>
              KNEX Delivery Services provides cargo delivery services from the United Arab Emirates to the Philippines. 
              We act solely as a carrier and logistics provider. Our services include pickup, packaging, international 
              shipping, customs clearance, and final delivery.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">3. SENDER RESPONSIBILITIES</h4>
            <p className="mb-2">The sender is responsible for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Providing accurate and complete information about the shipment</li>
              <li>Ensuring all items are properly packaged and labeled</li>
              <li>Declaring all contents accurately and honestly</li>
              <li>Ensuring no prohibited or restricted items are included</li>
              <li>Providing valid identification for verification purposes</li>
              <li>Paying all applicable fees and charges</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">4. PROHIBITED AND RESTRICTED ITEMS</h4>
            <p className="mb-2">The following items are strictly prohibited:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Any food items containing pork or pork derivatives</li>
              <li>Weapons, firearms, and ammunition</li>
              <li>Currency, money, and negotiable instruments</li>
              <li>Batteries (car, machine, and large batteries)</li>
              <li>Jewelry and precious stones</li>
              <li>Medical items and pharmaceuticals</li>
              <li>Cigarettes and tobacco products</li>
              <li>Items exceeding 200cm in length</li>
              <li>Illegal substances and contraband</li>
              <li>Hazardous materials and explosives</li>
            </ul>
            <p className="mt-2 font-semibold text-red-600">
              Shipping prohibited items is a criminal offense and punishable by law. The sender will be held fully 
              responsible for any legal consequences.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">5. IDENTITY VERIFICATION</h4>
            <p>
              For security and compliance purposes, all senders must complete identity verification including Emirates ID 
              scanning and facial biometric verification. By proceeding with verification, you consent to the collection 
              and processing of your biometric data for authentication purposes only. Your data will be handled in 
              accordance with UAE data protection laws.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">6. WEIGHT AND DIMENSIONAL CHARGES</h4>
            <p>
              Charges are calculated based on either actual weight or volumetric weight, whichever is greater. 
              Volumetric weight is calculated as: Length (cm) × Width (cm) × Height (cm) ÷ 5,500. We reserve the 
              right to re-weigh and re-measure shipments at our facility, and adjust charges accordingly.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">7. DELIVERY SCHEDULE</h4>
            <p className="mb-2">We operate on the following schedule:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Tuesday Loading:</strong> Thursday arrival in Philippines (Cut-off: Sunday)</li>
              <li><strong>Friday Loading:</strong> Sunday arrival in Philippines (Cut-off: Wednesday)</li>
            </ul>
            <p className="mt-2">
              Delivery times are estimates and may be affected by customs clearance, weather, or other factors beyond 
              our control. KNEX Delivery Services is not liable for delays caused by circumstances beyond our control.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">8. LIABILITY AND INSURANCE</h4>
            <p>
              KNEX Delivery Services acts solely as a carrier. We are not responsible for the nature, condition, quality, 
              or value of the contents of any shipment. Our liability is limited to a maximum of AED 500 per shipment 
              unless additional insurance is purchased. We are not liable for:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Damage to improperly packaged items</li>
              <li>Loss or damage to prohibited or undeclared items</li>
              <li>Delays in customs clearance</li>
              <li>Seizure or confiscation by authorities</li>
              <li>Acts of God, war, terrorism, or civil unrest</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">9. RETURN AND REFUND POLICY</h4>
            <p className="font-bold text-red-600 text-base mb-2">
              VIDEO REQUIRED - NO RETURN - NO REFUND
            </p>
            <p>
              All shipments are final. Returns and refunds are not provided. Recipients must video record the unboxing 
              of all packages. Without video evidence, no claims for damaged or missing items will be accepted. 
              By agreeing to these terms, you acknowledge and accept this policy.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">10. CLAIMS AND DISPUTES</h4>
            <p>
              Any claims for loss or damage must be reported within 48 hours of delivery with supporting video evidence. 
              Claims without proper documentation will not be processed. All disputes will be resolved in accordance 
              with UAE laws and under the jurisdiction of Dubai courts.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">11. PRIVACY AND DATA PROTECTION</h4>
            <p>
              We collect and process personal information including contact details, identification documents, and 
              biometric data. This information is used solely for service delivery, security, and compliance purposes. 
              We do not share your information with third parties except as required by law or for service delivery.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">12. CUSTOMS AND DUTIES</h4>
            <p>
              Shipments are subject to customs inspection and duties in both UAE and Philippines. The receiver is 
              responsible for all customs duties, taxes, and clearance fees. KNEX Delivery Services is not responsible 
              for customs delays or additional charges imposed by authorities.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">13. AMENDMENTS</h4>
            <p>
              KNEX Delivery Services reserves the right to modify these Terms and Conditions at any time. Continued 
              use of our services constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">14. CONTACT INFORMATION</h4>
            <p>
              <strong>KNEX DELIVERY SERVICES L.L.C</strong><br />
              Rocky Warehouse #19, 11th Street<br />
              Al Qusais Industrial Area 1<br />
              Dubai, United Arab Emirates<br />
              Contact: +971559738713<br />
              Contact Person: Jayson Cuartel (+971 55 690 3632)
            </p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 text-base mb-2">15. ACKNOWLEDGMENT</h4>
            <p className="font-semibold">
              By checking the agreement box below and submitting this booking, you acknowledge that you have read, 
              understood, and agree to be bound by these Terms and Conditions. You confirm that all information 
              provided is accurate and that your shipment contains no prohibited items.
            </p>
          </section>
        </div>
      </div>

      {/* Agreement Checkbox */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 text-primary-600 mt-1 cursor-pointer"
          />
          <span className="text-sm text-gray-700 flex-1">
            <strong className="text-gray-900">I have read and agree to the KNEX Delivery Services Terms and Conditions, 
            Privacy Policy, and all declarations.</strong> I confirm the accuracy of all submitted information and declare 
            that my shipment contains no prohibited or restricted items. I understand that shipping prohibited items is 
            a criminal offense and accept full responsibility for the contents of my shipment.
          </span>
        </label>
      </div>

      {/* Status Message */}
      {agreed && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">
            Thank you for accepting the terms. You may now submit your booking.
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary flex items-center gap-2"
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!agreed || isSubmitting}
          className="btn-primary flex-1 flex items-center justify-center gap-2 text-lg py-4"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Booking
            </>
          )}
        </button>
      </div>
    </div>
  )
}

