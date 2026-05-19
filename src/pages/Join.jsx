import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const roles = [
  'School / School Network',
  'Sustainability Coordinator / Eco Club',
  'Student Leader',
  'Educator / Advisor',
  'Climate-focused NGO / Partner',
  'ESG Institution',
  'Other',
]

const lookingFor = [
  'Climate and school networks ready for implementation',
  'Sustainability coordinators and active eco clubs',
  'Student leaders and youth organizations',
  'Climate-focused NGOs and implementation partners',
  'Educators, advisors, and ESG institutions',
]

const inputClass =
  'w-full bg-white rounded-lg px-4 py-3 text-sm text-forest placeholder:text-forest/30 outline-none focus:ring-2 focus:ring-forest/20 transition-shadow'

export default function Join() {
  const [form, setForm] = useState({
    name: '', email: '', organisation: '', country: '', role: '', message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section className="bg-cream px-6 py-32">
        <div className="max-w-lg mx-auto text-center">
          <CheckCircle2 size={48} className="text-forest-600 mx-auto mb-6" />
          <h2 className="font-serif text-3xl font-bold text-forest mb-4">
            Application received.
          </h2>
          <p className="text-forest/60 leading-relaxed">
            Thank you for applying to the founding cohort. We'll review your application
            and be in touch soon.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-cream px-6 py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
        {/* Left — description */}
        <div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold text-forest leading-tight mb-1">
            Help us build this
          </h1>
          <h1 className="font-serif text-4xl lg:text-5xl italic text-forest-600 leading-tight mb-6">
            from the ground up.
          </h1>
          <p className="text-forest/60 leading-relaxed mb-10">
            We are forming an early global founding cohort of schools, student leaders,
            educators, and organizations who want to shape the future of student-led
            sustainability infrastructure.
          </p>

          <h3 className="text-xs uppercase tracking-widest text-forest-600 font-semibold mb-5">
            Who We Are Looking For
          </h3>
          <ul className="space-y-3">
            {lookingFor.map((item) => (
              <li key={item} className="flex items-start gap-3 text-forest/65 text-sm leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-forest-600 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-forest/60 mb-1.5 block">Full Name *</label>
              <input
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className={inputClass}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs text-forest/60 mb-1.5 block">Email *</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="you@school.edu"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-forest/60 mb-1.5 block">Organisation</label>
              <input
                name="organisation"
                value={form.organisation}
                onChange={handleChange}
                className={inputClass}
                placeholder="School or organisation"
              />
            </div>
            <div>
              <label className="text-xs text-forest/60 mb-1.5 block">Country</label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                className={inputClass}
                placeholder="Your country"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-forest/60 mb-1.5 block">Your Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="">Select your role</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-forest/60 mb-1.5 block">Message</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={5}
              className={`${inputClass} resize-none`}
              placeholder="Tell us about your work and how you'd like to collaborate..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-forest text-cream py-3.5 rounded-lg text-sm font-medium hover:bg-forest-800 transition-colors flex items-center justify-center gap-2"
          >
            Submit Application
          </button>
        </form>
      </div>
    </section>
  )
}
