import { Facebook, Instagram, Youtube, Linkedin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Left Section - Logo and Tagline */}
          <div className="col-span-1 md:col-span-1">
            <h2 className="text-2xl font-bold text-white mb-4">KN EXPRESS</h2>
            <p className="text-sm text-gray-400">
              Welcome to KN Express — built for your cargo, your convenience, and your peace of mind.
            </p>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Services</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Hubs</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Tracking</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Address */}
          <div className="col-span-1">
            <h3 className="text-white font-semibold mb-4">Address</h3>
            <p className="text-gray-400 text-sm mb-2">
              Rocky Warehouse<br />
              Mon - Sun: 09:00 AM to 06:00 PM
            </p>
            <p className="text-gray-400 text-sm">
              <a href="mailto:customercare@knexpress.ae" className="hover:text-white transition-colors">
                customercare@knexpress.ae
              </a>
            </p>
          </div>

          {/* Call Us & Social Media */}
          <div className="col-span-1">
            <h3 className="text-white font-semibold mb-4">Call Us</h3>
            <p className="text-gray-400 text-sm mb-6">
              <a href="tel:+971524459157" className="hover:text-white transition-colors">
                +971524459157
              </a>
            </p>

            <h3 className="text-white font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors" title="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a4.83 4.83 0 0 0-1-.1 4.85 4.85 0 0 0 0 9.69 4.84 4.84 0 0 0 4.93-4.78V9.4a6.1 6.1 0 0 0 4.1 1.56v-3.4a4.85 4.85 0 0 1-1.18-.27z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 All Rights Reserved by KN Express
          </p>
        </div>
      </div>
    </footer>
  )
}

