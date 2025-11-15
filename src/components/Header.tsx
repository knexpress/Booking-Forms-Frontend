import { BookOpen } from 'lucide-react'

interface HeaderProps {
  onBookNow?: () => void
}

export default function Header({ onBookNow }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm">
      {/* Top Navigation Bar */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-green-600">KN EXPRESS</h1>
            </div>

            {/* Action Button */}
            <div className="flex items-center">
              {onBookNow && (
                <button
                  onClick={onBookNow}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Book Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

