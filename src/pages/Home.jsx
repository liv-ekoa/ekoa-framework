import { Link } from 'react-router-dom'
import {
  Globe,
  RefreshCw,
  Unlink,
  AlertTriangle,
  ArrowLeftRight,
  BarChart2,
  BookOpen,
  Layers,
  TrendingUp,
  School,
  Leaf,
  Users,
  GraduationCap,
  Heart,
  Landmark,
} from 'lucide-react'

const problems = [
  {
    Icon: RefreshCw,
    title: 'Projects restart every year',
    body: 'When student leaders graduate, their sustainability initiatives often disappear entirely. Schools lose institutional memory and start from scratch.',
  },
  {
    Icon: Unlink,
    title: 'No cross-border collaboration',
    body: "Thousands of eco clubs operate in isolation. A solution that works in Singapore never reaches São Paulo — not because of distance, but because there's no infrastructure to connect them.",
  },
  {
    Icon: AlertTriangle,
    title: 'Awareness without implementation',
    body: 'Schools host sustainability weeks and awareness campaigns, but rarely move beyond that into measurable, lasting change. Intent is abundant. Execution infrastructure is not.',
  },
]

const solutions = [
  { Icon: ArrowLeftRight, title: 'Exchange proven models', body: 'Share sustainability frameworks that work across schools and regions.' },
  { Icon: Globe, title: 'Collaborate across borders', body: 'Connect student leaders across countries and institutions in real-time.' },
  { Icon: BarChart2, title: 'Measure real-world impact', body: 'Track and quantify the outcomes of every initiative, not just intentions.' },
  { Icon: BookOpen, title: 'Document failures openly', body: "Build a shared knowledge base of lessons learned so others don't repeat mistakes." },
  { Icon: Layers, title: 'Build lasting continuity', body: "Create transition systems so leadership changes don't mean starting over." },
  { Icon: TrendingUp, title: 'Scale globally', body: 'Take successful student-led solutions from one school to thousands.' },
]

const cohortTypes = [
  { Icon: School, label: 'Schools & school networks' },
  { Icon: Leaf, label: 'Sustainability coordinators & eco clubs' },
  { Icon: Users, label: 'Student leaders & youth organisations' },
  { Icon: Globe, label: 'Climate-focused NGOs & partners' },
  { Icon: GraduationCap, label: 'Educators & advisors' },
  { Icon: Heart, label: 'ESG & sustainability institutions' },
]

export default function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <section id="hero" className="bg-cream px-6 pt-20 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 text-sm text-forest-600 border border-forest-600/30 rounded-full px-4 py-1.5 mb-10">
            <Globe size={13} />
            Building the global founding cohort
          </div>

          <h1 className="font-serif font-bold text-forest leading-[1.1] text-5xl lg:text-6xl max-w-3xl mb-6">
            Student-led climate action{' '}
            <em className="italic font-normal text-forest-600">shouldn't restart</em>
            {' '}from zero every year.
          </h1>

          <p className="text-forest/65 text-lg max-w-lg leading-relaxed mb-10">
            Ekoa × GSIN is building the global infrastructure that connects schools,
            student leaders, and sustainability initiatives — making collaboration
            measurable, scalable, and lasting.
          </p>

          <div className="flex flex-wrap gap-4 mb-20">
            <Link
              to="/join"
              className="inline-flex items-center gap-2 bg-forest text-cream px-6 py-3 rounded-full text-sm font-medium hover:bg-forest-800 transition-colors"
            >
              Join the Founding Cohort <span aria-hidden>→</span>
            </Link>
            <a
              href="#mission"
              className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium text-forest border border-forest/25 hover:border-forest/50 transition-colors"
            >
              Learn More
            </a>
          </div>

          <div className="flex gap-16">
            <div>
              <p className="font-serif text-4xl font-bold text-forest">1.5B</p>
              <p className="text-sm text-forest/55 mt-1">Students globally</p>
            </div>
            <div>
              <p className="font-serif text-4xl font-bold text-forest">
                195<sup className="text-2xl font-bold">+</sup>
              </p>
              <p className="text-sm text-forest/55 mt-1">Countries</p>
            </div>
            <div>
              <p className="font-serif text-4xl font-bold text-forest">∞</p>
              <p className="text-sm text-forest/55 mt-1">Potential impact</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section id="mission" className="bg-cream px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-forest-600 font-semibold mb-8">
            The Problem
          </p>
          <h2 className="font-serif text-4xl lg:text-5xl font-bold text-forest leading-tight mb-1">
            The world has passionate students.
          </h2>
          <h2 className="font-serif text-4xl lg:text-5xl italic text-forest-600 leading-tight mb-16">
            It's missing coordinated execution.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {problems.map(({ Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl p-8">
                <div className="w-11 h-11 bg-forest/5 rounded-xl flex items-center justify-center mb-6">
                  <Icon size={20} className="text-forest/50" />
                </div>
                <h3 className="font-serif text-xl font-bold text-forest mb-3">{title}</h3>
                <p className="text-forest/60 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution ── */}
      <section id="how-it-works" className="bg-cream px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-forest-600 font-semibold mb-8 text-center">
            The Solution
          </p>
          <h2 className="font-serif text-4xl lg:text-5xl font-bold text-forest text-center leading-tight mb-1">
            A global implementation network
          </h2>
          <h2 className="font-serif text-4xl lg:text-5xl italic text-forest-600 text-center leading-tight mb-6">
            built by students, for students.
          </h2>
          <p className="text-center text-forest/60 max-w-xl mx-auto text-base leading-relaxed mb-16">
            Not another awareness initiative. This is infrastructure — designed to make
            student-led sustainability collaborative, measurable, scalable, and lasting.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-12">
            {solutions.map(({ Icon, title, body }) => (
              <div key={title}>
                <Icon size={22} className="text-forest mb-4" />
                <h3 className="font-serif text-lg font-bold text-forest mb-2">{title}</h3>
                <p className="text-forest/60 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quote / Mission ── */}
      <section className="bg-forest px-6 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-serif text-2xl lg:text-3xl text-cream leading-snug mb-10">
            "Climate action in schools should not restart from zero every year."
          </p>
          <div className="space-y-3 text-cream/65 text-base">
            <p>The world already has passionate students.</p>
            <p>It already has eco clubs.</p>
            <p>It already has ideas.</p>
          </div>
          <p className="text-cream font-semibold mt-6 text-base">
            What's missing is coordinated execution.
          </p>
        </div>
      </section>

      {/* ── Join / Network ── */}
      <section id="network" className="bg-cream px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-forest-600 font-semibold mb-8">
            Join Us
          </p>
          <div className="flex flex-col md:flex-row gap-16">
            <div className="md:w-1/2">
              <h2 className="font-serif text-4xl lg:text-5xl font-bold text-forest leading-tight mb-1">
                We're forming the
              </h2>
              <h2 className="font-serif text-4xl lg:text-5xl italic text-forest-600 leading-tight mb-6">
                founding cohort.
              </h2>
              <p className="text-forest/60 leading-relaxed mb-8 max-w-md">
                We are looking for collaborators across regions who want to help build
                this with us from the ground up. This is your chance to shape the future
                of student-led sustainability infrastructure.
              </p>
              <Link
                to="/join"
                className="inline-flex items-center gap-2 bg-forest text-cream px-6 py-3 rounded-full text-sm font-medium hover:bg-forest-800 transition-colors"
              >
                Apply to Join <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="md:w-1/2 grid grid-cols-2 gap-3">
              {cohortTypes.map(({ Icon, label }) => (
                <div key={label} className="bg-white rounded-xl px-4 py-3.5 flex items-center gap-3">
                  <Icon size={16} className="text-forest-600 flex-shrink-0" />
                  <span className="text-sm text-forest leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="bg-cream px-6 pb-24">
        <div className="max-w-6xl mx-auto border-t border-forest/10 pt-16">
          <p className="text-xs uppercase tracking-widest text-forest-600 font-semibold mb-6">
            About
          </p>
          <div className="max-w-2xl">
            <p className="text-forest/70 leading-relaxed mb-4">
              Ekoa × GSIN is a collaboration between Ekoa and the Global Student
              Implementation Network. We believe the infrastructure to connect and sustain
              student-led climate action should be open, shared, and built by the students
              who need it most.
            </p>
            <p className="text-forest/70 leading-relaxed">
              This is not a top-down initiative. It is being shaped, tested, and grown by
              the founding cohort — schools, educators, coordinators, and youth
              organisations from every region of the world.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
