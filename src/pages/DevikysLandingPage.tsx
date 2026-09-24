import React from 'react';

export const DevikysLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-black text-yellow-300 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto flex justify-between items-center px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black font-black text-lg">D</div>
            <div>
              <div className="font-black text-lg tracking-wide leading-tight">DEVIKYS GEM SCHOOLS</div>
              <div className="text-xs text-yellow-200/70">Shining Brighter Every Day</div>
            </div>
          </div>
          <nav className="hidden md:flex gap-6 text-sm text-yellow-200/80 items-center">
            <a href="#about" className="hover:text-yellow-300 transition">About</a>
            <a href="#programs" className="hover:text-yellow-300 transition">Programs</a>
            <a href="#values" className="hover:text-yellow-300 transition">Values</a>
            <a href="#contact" className="hover:text-yellow-300 transition">Contact</a>
          </nav>
          <a
            href="/login"
            className="bg-yellow-400 text-black font-bold py-2 px-5 rounded-full hover:bg-yellow-300 transition text-sm shadow"
          >
            School Portal
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 30% 50%, #FFD700 0%, transparent 60%), radial-gradient(circle at 80% 20%, #FF0000 0%, transparent 50%)'}}/>
        <div className="container mx-auto px-4 py-24 text-center relative z-10">
          <div className="inline-block border border-yellow-400/50 text-yellow-300 rounded-full px-4 py-1 text-xs tracking-widest uppercase mb-6">
            Excellence in Education
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
            DEVIKYS<br/>
            <span className="text-yellow-400">GEM SCHOOLS</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
            Providing world-class education rooted in character, excellence, and a passion for learning. 
            Where every child shines brighter every day.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/login" className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-full text-lg hover:bg-yellow-300 transition shadow-lg shadow-yellow-400/30">
              School Portal →
            </a>
            <a href="#about" className="border border-white/30 text-white/80 hover:text-white hover:border-white/60 font-semibold py-3 px-8 rounded-full text-lg transition">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-yellow-400 py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-black">
            {[
              { value: '500+', label: 'Students' },
              { value: '40+', label: 'Teachers' },
              { value: '20+', label: 'Years' },
              { value: '95%', label: 'Pass Rate' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-4xl font-black">{s.value}</div>
                <div className="text-sm font-semibold text-black/70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-black text-yellow-300 rounded-full px-4 py-1 text-xs tracking-widest uppercase mb-4">
                About Us
              </div>
              <h2 className="text-4xl font-black text-black mb-4 leading-tight">
                A Legacy of<br/><span className="text-red-600">Academic Excellence</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                DEVIKYS GEM SCHOOLS has been a beacon of education for over two decades. We combine rigorous 
                academics with a nurturing environment to help every student reach their full potential.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our holistic approach to education develops not just academic skills but strong moral character, 
                leadership, and a love for lifelong learning.
              </p>
            </div>
            <div className="bg-black rounded-2xl p-8 text-center text-white">
              <div className="text-6xl mb-4">🎓</div>
              <div className="text-yellow-400 font-black text-2xl mb-2">Our Mission</div>
              <p className="text-white/70 text-sm leading-relaxed">
                To provide an exceptional learning environment where every student is empowered to discover 
                their unique gifts, develop critical thinking, and grow into responsible leaders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <div className="inline-block bg-yellow-100 text-black rounded-full px-4 py-1 text-xs tracking-widest uppercase mb-4 font-semibold">
              Academic Programs
            </div>
            <h2 className="text-4xl font-black text-black">What We Offer</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📚', title: 'Primary School', desc: 'Strong foundation in literacy, numeracy, and creative learning for ages 5–11.' },
              { icon: '🔬', title: 'Secondary School', desc: 'Comprehensive curriculum with science, arts and commercial tracks for ages 12–18.' },
              { icon: '🏆', title: 'Extra-Curriculars', desc: 'Sports, debates, science clubs, and cultural activities to develop the whole child.' },
            ].map((p) => (
              <div key={p.title} className="border-2 border-gray-100 rounded-2xl p-6 hover:border-yellow-400 hover:shadow-lg transition group">
                <div className="text-5xl mb-4">{p.icon}</div>
                <h3 className="text-xl font-black text-black mb-2 group-hover:text-yellow-600 transition">{p.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section id="values" className="py-20 bg-black text-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <div className="inline-block bg-yellow-400/20 text-yellow-300 rounded-full px-4 py-1 text-xs tracking-widest uppercase mb-4 font-semibold">
              Our Values
            </div>
            <h2 className="text-4xl font-black">What We Stand For</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '💡', label: 'Excellence' },
              { icon: '🤝', label: 'Integrity' },
              { icon: '❤️', label: 'Compassion' },
              { icon: '🌍', label: 'Community' },
            ].map((v) => (
              <div key={v.label} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-yellow-400/10 hover:border-yellow-400/30 transition">
                <div className="text-4xl mb-3">{v.icon}</div>
                <div className="font-black text-yellow-300">{v.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="inline-block bg-black text-yellow-300 rounded-full px-4 py-1 text-xs tracking-widest uppercase mb-4 font-semibold">
            Get In Touch
          </div>
          <h2 className="text-4xl font-black text-black mb-4">Contact Us</h2>
          <p className="text-gray-500 mb-8">Have questions? We'd love to hear from you.</p>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { icon: '📍', label: 'Address', value: 'Nigeria' },
              { icon: '📞', label: 'Phone', value: 'Contact school admin' },
              { icon: '📧', label: 'Email', value: 'Contact via portal' },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">{c.icon}</div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">{c.label}</div>
                <div className="font-bold text-gray-800 mt-1">{c.value}</div>
              </div>
            ))}
          </div>
          <a href="/login" className="inline-block bg-black text-yellow-400 font-black py-3 px-8 rounded-full text-lg hover:bg-gray-900 transition">
            Access School Portal →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white/50 py-8 text-center text-sm">
        <div className="container mx-auto px-4">
          <div className="font-black text-yellow-400 text-lg mb-1">DEVIKYS GEM SCHOOLS</div>
          <div className="mb-4">Shining Brighter Every Day</div>
          <div className="text-xs text-white/30">
            © {new Date().getFullYear()} DEVIKYS GEM SCHOOLS · 
            <span className="ml-2">Powered by <a href="https://app.ifyspace.tech" className="text-white/40 hover:text-white/60 transition">GlobePen</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
};
