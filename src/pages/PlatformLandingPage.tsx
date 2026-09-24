import React from 'react';

export const PlatformLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white font-sans">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🖊️</span>
          <span className="text-xl font-bold tracking-wide text-indigo-300">GlobePen</span>
        </div>
        <div className="flex gap-4 items-center">
          <a href="/login" className="text-white/70 hover:text-white transition text-sm">Sign In</a>
          <a
            href="https://demo.ifyspace.tech/login"
            className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-2 px-5 rounded-full text-sm transition"
          >
            Explore Demo
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 text-center max-w-4xl">
        <div className="inline-block bg-indigo-500/20 text-indigo-300 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6 border border-indigo-500/30">
          Modern School Management Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
          The Platform That Powers Schools
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
          A dedicated school portal with school branding, secure sign-in and a shared registry for classes, teachers and students.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a href="/login" className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 px-8 rounded-full text-lg transition shadow-lg shadow-indigo-500/30">
            Get Started
          </a>
          <a href="https://demo.ifyspace.tech" className="border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-semibold py-3 px-8 rounded-full text-lg transition">
            View Demo
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 pb-24 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '📊', title: 'School Registry', desc: 'Keep pilot student and class records available across signed-in sessions.' },
            { icon: '🏫', title: 'School Identity', desc: 'Your school name, colors and dedicated portal address.' },
            { icon: '🔒', title: 'School Access', desc: 'Role-based access and separate school workspaces.' },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} GlobePen · <a href="https://demo.ifyspace.tech/login" className="hover:text-white/60 transition">Explore the demo</a>
      </footer>
    </div>
  );
};
