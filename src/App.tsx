import { useState, useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import ToastContainer from './components/ToastContainer'
import PrivacyPolicyPage from './components/PrivacyPolicyPage'
import LandingPage from './components/LandingPage'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname.toLowerCase())
  const isPrivacyPolicyRoute = currentPath === '/privacypolicy'

  useEffect(() => {
    const syncPath = () => setCurrentPath(window.location.pathname.toLowerCase())
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <ToastContainer />
      <Header />
      <div className="flex-1 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {!isPrivacyPolicyRoute && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <LandingPage />
            </div>
          )}

          {isPrivacyPolicyRoute && <PrivacyPolicyPage />}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default App

