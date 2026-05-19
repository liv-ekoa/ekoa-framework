import { Link } from 'react-router-dom'

function LogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#1C3A2A" />
      <path d="M10 23 Q10 9 24 9 Q24 23 10 23 Z" fill="#F5F0E6" fillOpacity="0.9" />
      <path d="M17 9 Q24 16 17 23" stroke="#2D6644" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoIcon />
          <span className="font-serif font-bold text-forest text-lg tracking-tight">Ekoa × GSIN</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="/#mission" className="text-sm text-forest/70 hover:text-forest transition-colors">Mission</a>
          <a href="/#how-it-works" className="text-sm text-forest/70 hover:text-forest transition-colors">How It Works</a>
          <a href="/#network" className="text-sm text-forest/70 hover:text-forest transition-colors">Network</a>
          <a href="/#about" className="text-sm text-forest/70 hover:text-forest transition-colors">About</a>
          <Link
            to="/join"
            className="bg-forest text-cream text-sm px-5 py-2.5 rounded-full hover:bg-forest-800 transition-colors font-medium"
          >
            Join the Network
          </Link>
        </div>
      </div>
    </nav>
  )
}
