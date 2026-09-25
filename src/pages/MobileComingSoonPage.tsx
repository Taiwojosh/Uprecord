import React from 'react';
import { ArrowRight, ArrowLeft, Smartphone, Store, Download, Check } from 'lucide-react';
import { useInstallPrompt } from '../lib/pwa';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';

const offerings = [
  {
    icon: Smartphone,
    title: 'GlobePen Mobile',
    body: 'One GlobePen application where staff, students and parents can access supported schools — timetable, results and notices in one place.',
    points: ['One sign-in across supported schools', 'Built on the GlobePen platform', 'Consistent updates for every school'],
  },
  {
    icon: Store,
    title: 'Dedicated School Apps',
    body: 'A school-branded application powered by the same GlobePen mobile foundation, shaped around each school’s identity.',
    points: ['School-specific name and branding', 'Reusable GlobePen mobile base', 'Rolls out with each school, not before'],
  },
];

export const MobileComingSoonPage: React.FC = () => {
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstallPrompt();

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] font-sans">
      <nav aria-label="Main" className="border-b border-[var(--app-border)]">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 min-w-0" aria-label="GlobePen home">
            <Logo size={34} />
          </a>
          <div className="flex items-center gap-3">
            <a href="/" className="hidden sm:inline-flex text-sm font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
              Home
            </a>
            <a
              href="/login"
              className="inline-flex items-center rounded-xl bg-[var(--app-primary)] px-4 py-2.5 text-sm font-bold text-[var(--app-on-primary)]"
            >
              Sign in
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-5 pb-20">
        <section className="pt-14 pb-10 md:pt-20 md:pb-14 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
            <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
            Coming soon
          </p>
          <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-tight text-[var(--app-text)] leading-tight">
            GlobePen Mobile
          </h1>
          <p className="mt-5 text-lg md:text-xl text-[var(--app-text-muted)] max-w-2xl mx-auto leading-relaxed">
            GlobePen for phones is on the way. Today, the full platform lives in the GlobePen web app — installable in one tap.
          </p>
        </section>

        <section aria-label="Upcoming mobile offerings" className="grid md:grid-cols-2 gap-5">
          {offerings.map(({ icon: Icon, title, body, points }) => (
            <article
              key={title}
              className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-7 transition-all hover:border-[var(--app-border-strong)] hover:shadow-[var(--shadow-card)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--app-surface-2)] text-[var(--app-text-muted)]">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-bold text-[var(--app-text)]">{title}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--app-text-muted)]">{body}</p>
              <ul className="mt-5 space-y-2.5">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-[var(--app-text)]">
                    <Check className="w-4 h-4 mt-0.5 text-[var(--app-success)] shrink-0" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        {/* Store availability — clearly non-interactive placeholders */}
        <section aria-label="Store availability" className="mt-8 grid gap-4 sm:grid-cols-2">
          {['App Store', 'Google Play'].map((store) => (
            <div
              key={store}
              aria-disabled="true"
              className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-5 py-4 opacity-70"
            >
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-[var(--app-text-subtle)]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-[var(--app-text)]">{store}</p>
                  <p className="text-xs text-[var(--app-text-subtle)]">Not yet available</p>
                </div>
              </div>
              <span className="rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--app-text-subtle)]">
                Coming soon
              </span>
            </div>
          ))}
        </section>

        {/* Install the web app — the real, available alternative */}
        <section
          aria-label="Install the web app"
          className="mt-10 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 md:p-10 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--app-text)]">
            Install the GlobePen Web App
          </h2>
          <p className="mt-3 text-sm md:text-base text-[var(--app-text-muted)] max-w-xl mx-auto leading-relaxed">
            The web app installs straight from the browser — same sign-in, same data, no store required.
          </p>

          {/* The install affordance is only real when the browser offers one. */}
          {isStandalone ? (
            <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--app-success)]/10 border border-[var(--app-success)]/30 px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-100">
              <Check className="w-4 h-4" aria-hidden="true" />
              You're running the installed GlobePen app.
            </p>
          ) : canInstall ? (
            <div className="mt-6">
              <Button size="lg" onClick={() => void promptInstall()}>
                <Download className="w-4 h-4" aria-hidden="true" />
                Install GlobePen
              </Button>
              <p className="mt-2 text-xs text-[var(--app-text-subtle)]">Installs to your home screen or desktop.</p>
            </div>
          ) : isIOS ? (
            <div className="mt-6 max-w-md mx-auto text-left rounded-2xl bg-[var(--app-surface-2)] border border-[var(--app-border)] p-5">
              <p className="text-sm font-bold text-[var(--app-text)]">Add GlobePen to your iPhone or iPad</p>
              <ol className="mt-3 space-y-2 text-sm text-[var(--app-text-muted)] list-decimal list-inside leading-relaxed">
                <li>Open GlobePen in Safari.</li>
                <li>Tap the Share button.</li>
                <li>Choose “Add to Home Screen”.</li>
              </ol>
            </div>
          ) : (
            <p className="mt-6 text-sm text-[var(--app-text-subtle)]">
              Installation is available today in Chrome and Edge on desktop and Android. Every other browser keeps full
              access to GlobePen in a tab — no separate app needed.
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-primary)] px-6 py-3 text-sm font-bold text-[var(--app-on-primary)] hover:bg-[var(--app-primary-hover)] transition-colors"
            >
              Open GlobePen
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
            <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to GlobePen
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--app-border)] px-5 py-8 text-center text-sm text-[var(--app-text-subtle)]">
        GlobePen — school management platform
      </footer>
    </div>
  );
};