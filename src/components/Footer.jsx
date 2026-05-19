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

export default function Footer() {
  return (
    <footer className="bg-cream border-t border-forest/10 px-6 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <LogoIcon />
              <span className="font-serif font-bold text-forest text-lg tracking-tight">Ekoa × GSIN</span>
            </div>
            <p className="text-sm text-forest/60 max-w-xs leading-relaxed">
              A collaboration between Ekoa and the Global Student Implementation Network — building infrastructure for student-led sustainability at scale.
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest text-forest-600 font-semibold mb-5">Navigate</h4>
            <ul className="space-y-3">
              <li><a href="/#mission" className="text-sm text-forest/70 hover:text-forest transition-colors">Mission</a></li>
              <li><a href="/#how-it-works" className="text-sm text-forest/70 hover:text-forest transition-colors">How It Works</a></li>
              <li><a href="/#network" className="text-sm text-forest/70 hover:text-forest transition-colors">Network</a></li>
              <li><a href="/#about" className="text-sm text-forest/70 hover:text-forest transition-colors">About</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest text-forest-600 font-semibold mb-5">Get Involved</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/join" className="text-sm text-forest/70 hover:text-forest transition-colors">
                  Join the Founding Cohort
                </Link>
              </li>
              <li>
                <a href="mailto:hello@ekoagsin.org" className="text-sm text-forest/70 hover:text-forest transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-forest/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs text-forest/40">© 2026 Ekoa × GSIN. All rights reserved.</p>
          <p className="text-xs text-forest/40">Built by students, for students.</p>
        </div>
      </div>
    </footer>
  )
}
