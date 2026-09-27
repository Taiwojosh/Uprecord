import React from 'react';

export const DemoLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-900 text-white font-sans">
      <nav className="flex justify-between items-center px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏫</span>
          <span className="text-xl font-bold tracking-wide text-emerald-300">Demo School</span>
        </div>
        <a href="/login" className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2 px-5 rounded-full text-sm transition">
          School Portal
        </a>
      </nav>

      <section className="container mx-auto px-6 py-24 text-center max-w-3xl">
        <div className="inline-block bg-emerald-500/20 text-emerald-300 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6 border border-emerald-500/30">
          Demo Environment
        </div>
        <h1 className="text-5xl font-extrabold leading-tight mb-6 text-white">
          SeferNote Demo School
        </h1>
        <p className="text-lg text-white/60 mb-10">
          This is a fictional school for exploring SeferNote's features. Sign in to try the platform.
        </p>
        <a href="/login" className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-8 rounded-full text-lg transition shadow-lg shadow-emerald-500/30">
          Sign In to Demo
        </a>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-white/30 text-sm">
        SeferNote Demo — Not a real school
      </footer>
    </div>
  );
};
