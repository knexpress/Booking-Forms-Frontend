export default function PrivacyPolicyPage() {
  const effectiveDate = '20 April 2026'

  return (
    <section className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-6 py-8 md:px-10 md:py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Effective date: {effectiveDate}</p>
        <a
          href="/"
          className="inline-flex items-center text-sm font-semibold text-primary-600 hover:underline mb-8"
        >
          Back to booking form
        </a>

        <div className="space-y-8 text-gray-700 leading-7">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1) Who We Are</h2>
            <p>
              This Privacy Policy explains how KN Express collects, uses, stores, and shares personal data
              when you use our online booking and identity-verification services. For privacy requests,
              contact us at{' '}
              <a href="mailto:customercare@knexpress.ae" className="text-primary-600 hover:underline">
                customercare@knexpress.ae
              </a>{' '}
              or call{' '}
              <a href="tel:+971524459157" className="text-primary-600 hover:underline">
                +971524459157
              </a>.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2) Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Identity details (for example, name, Emirates ID details, and ID images).</li>
              <li>Contact details (for example, mobile number, email address, sender and receiver details).</li>
              <li>Shipment and booking information (for example, addresses, declared item details, and references).</li>
              <li>Verification data (for example, face images and OTP verification metadata).</li>
              <li>Technical usage data (for example, IP address, browser type, device information, and logs).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3) How We Use Personal Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To process bookings, arrange shipment handling, and provide customer support.</li>
              <li>To verify identity and reduce fraud, abuse, and unlawful use of shipping services.</li>
              <li>To comply with UAE legal and regulatory obligations, including record-keeping requirements.</li>
              <li>To improve service quality, reliability, and security.</li>
              <li>To communicate important service, account, and policy updates.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4) Legal Basis and UAE Law Alignment</h2>
            <p>
              We process personal data under applicable lawful bases, including contractual necessity,
              compliance with legal obligations, legitimate business interests, and consent where required.
              Our privacy practices are designed to align with applicable UAE data-protection requirements,
              including Federal Decree-Law No. 45 of 2021 regarding the Protection of Personal Data (PDPL)
              and related implementing regulations.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5) Sensitive and Biometric Data</h2>
            <p>
              Identity documents and face images may be treated as sensitive personal data. We process this
              data for identity verification, fraud prevention, and legal compliance. Access is limited to
              authorized personnel and approved service providers with strict confidentiality and security
              obligations.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6) Data Sharing and Third Parties</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Operational vendors and technology providers supporting booking, verification, and hosting.</li>
              <li>Regulatory authorities, law enforcement, or courts when required by law.</li>
              <li>Business partners and agents strictly as needed to provide shipment services.</li>
            </ul>
            <p className="mt-3">
              We do not sell personal data. Third parties are required to protect data under contractual and
              legal safeguards.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7) International Data Transfers</h2>
            <p>
              Your data may be processed in jurisdictions outside the UAE where our partners operate. Where
              cross-border transfers occur, we apply contractual, organizational, and technical safeguards in
              line with applicable legal requirements.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8) Data Retention</h2>
            <p>
              We keep personal data only for as long as necessary to fulfill service purposes, resolve
              disputes, prevent fraud, enforce agreements, and comply with legal or regulatory obligations.
              Retention periods may differ by data category and legal requirement.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9) Security Measures</h2>
            <p>
              We use administrative, technical, and physical safeguards to protect personal data, including
              access controls, secure transmission, monitoring, and incident response processes. No system can
              guarantee absolute security; however, we continuously work to maintain appropriate protection.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10) Your Privacy Rights</h2>
            <p className="mb-3">
              Subject to applicable law, you may have rights to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Request access to your personal data.</li>
              <li>Request correction of inaccurate or incomplete data.</li>
              <li>Request deletion of data in permitted circumstances.</li>
              <li>Withdraw consent where processing is based on consent.</li>
              <li>Object to or request restriction of certain processing.</li>
              <li>Request portability of eligible data.</li>
              <li>Submit a complaint to the competent UAE authority where applicable.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11) Cookies and Similar Technologies</h2>
            <p>
              We may use cookies or similar technologies to keep the website functional, improve performance,
              and understand service usage. You can manage browser settings to limit cookies, but some
              functionality may be affected.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12) Children&apos;s Privacy</h2>
            <p>
              Our services are not directed to children. We do not knowingly collect personal data from
              children without appropriate legal basis or authorization.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13) Google and Transparency Requirements</h2>
            <p>
              This policy is published at a publicly accessible URL to support transparency expectations from
              Google services and users. It describes what data we collect, why we process it, and how users
              can contact us regarding privacy matters.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14) Policy Updates</h2>
            <p>
              We may update this Privacy Policy from time to time. Any updates will be posted on this page
              with a revised effective date.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

