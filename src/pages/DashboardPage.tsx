import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Users, UserCheck, LayoutGrid, ArrowRight, Settings as SettingsIcon, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Skeleton } from '../components/ui/Skeleton';
import { Alert } from '../components/ui/Alert';

type CountKey = 'students' | 'teachers' | 'classes';
type Counts = Record<CountKey, number>;

const TILES: { key: CountKey; label: string; icon: typeof Users }[] = [
  { key: 'students', label: 'Students', icon: Users },
  { key: 'teachers', label: 'Teachers', icon: UserCheck },
  { key: 'classes', label: 'Classes', icon: LayoutGrid },
];

export const DashboardPage = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const controller = new AbortController();
    setCounts(null);
    setError(false);
    setLoading(true);
    api
      .get<{ schoolId: string; students: unknown[]; teachers: unknown[]; classes: unknown[] }>('/registry', { signal: controller.signal })
      .then(({ data }) => {
        if (data.schoolId !== user.schoolId) throw new Error('Tenant mismatch');
        setCounts({ students: data.students.length, teachers: data.teachers.length, classes: data.classes.length });
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.schoolId, user?.role]);

  if (user?.role === 'teacher') return <Navigate to="/teacher-portal" replace />;
  if (user?.role === 'student') return <Navigate to="/student-portal" replace />;

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--app-text)]">Dashboard</h1>
        <p className="mt-3 text-[var(--app-text-muted)]">
          Welcome, {user?.fullName}. Here is your school overview.
        </p>
      </header>

      {error ? (
        <Alert tone="danger" title="Totals unavailable">
          School totals could not be loaded. Please reload.
        </Alert>
      ) : (
        <div className="grid sm:grid-cols-3 gap-5" aria-busy={loading}>
          {TILES.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              to="/registry"
              className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] p-6 transition-all hover:border-[var(--app-border-strong)] hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <p className="capitalize text-sm font-semibold text-[var(--app-text-muted)]">{label}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--app-surface-2)] text-[var(--app-text-muted)] group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                  <Icon className="w-4.5 h-4.5" aria-hidden="true" />
                </span>
              </div>
              {loading || counts === null ? (
                <Skeleton className="mt-3 h-10 w-16" />
              ) : (
                <p className="text-4xl font-bold mt-3 tabular-nums">{counts[key]}</p>
              )}
              <p className="text-sm text-[var(--app-text-subtle)] mt-3">Saved school records</p>
            </Link>
          ))}
        </div>
      )}
   <section
        className="rounded-2xl p-8"
        style={{ backgroundColor: 'var(--brand-secondary, #0f172a)', color: 'var(--brand-on-secondary, #ffffff)' }}
      >
        <h2 className="text-2xl font-bold" style={{ color: 'inherit' }}>Manage your school registry</h2>
        <p className="opacity-90 mt-3 max-w-2xl">
          Add classes, students and teacher records. Changes are saved to the school account and available across
          signed-in devices.
        </p>
        <Link
          to="/registry"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 mt-6 font-bold transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary, #2563EB)', color: 'var(--brand-on-primary, #ffffff)' }}
        >
          Open School Registry
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </section>

      <section className="grid sm:grid-cols-2 gap-5">
        <Link
          to="/settings"
          className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-[var(--app-text)] transition-all hover:border-[var(--app-border-strong)] hover:shadow-[var(--shadow-card)]"
        >
          <h2 className="font-bold text-xl flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[var(--app-text-muted)]" aria-hidden="true" />
            School settings
          </h2>
          <p className="mt-2 text-[var(--app-text-muted)]">
            Update the school identity and portal branding.
          </p>
        </Link>
        <Link
          to="/manual"
          className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-[var(--app-text)] transition-all hover:border-[var(--app-border-strong)] hover:shadow-[var(--shadow-card)]"
        >
          <h2 className="font-bold text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--app-text-muted)]" aria-hidden="true" />
            School guide
          </h2>
          <p className="mt-2 text-[var(--app-text-muted)]">Explore the available tools.</p>
        </Link>
      </section>

      <p className="text-sm text-[var(--app-text-muted)]">
        Pilot note: the older academic screens retain browser-local storage. Use School Registry for shared class,
        teacher and student records. Email activation and recovery remain disabled.
      </p>
    </main>
  );
};
