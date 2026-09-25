import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Field, Input } from '../components/ui/Field';

const labels = { grades: 'Academic results', traitGrades: 'Trait scores', attendance: 'Term attendance', dailyAttendance: 'Daily attendance' };
const COLUMNS = ['Student', 'Period', 'Subject / Trait / Date', 'Score / Attendance', 'Remark'];

export function SchoolHistoryPage() {
  const { user } = useAuth();
  const [kind, setKind] = useState('grades');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    api.get('/registry/history', { params: { kind, page, search: query }, signal: controller.signal })
      .then(({ data }) => {
        if (data.schoolId !== user?.schoolId) throw new Error('School mismatch');
        setData(data);
      })
      .catch(e => { if (!controller.signal.aborted) setError(e.response?.data?.error || 'Could not load historical records.'); });
    return () => controller.abort();
  }, [kind, page, query, user?.schoolId]);
  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-[var(--app-text)]">School Historical Records</h1>
        <p className="text-[var(--app-text-muted)] mt-3">
          Saved academic records from your school's backups. Read-only history is kept separately from new report editing.
        </p>
      </header>

      <nav aria-label="Record collections" className="flex flex-wrap gap-2">
        {Object.entries(labels).map(([key, label]) => (
          <Button key={key} type="button" size="sm" aria-pressed={kind === key}
            variant={kind === key ? 'school' : 'outline'}
            onClick={() => { setKind(key); setPage(1); }}>
            {label}{data ? ` (${data.counts[key]})` : ''}
          </Button>
        ))}
      </nav>

      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1); }}>
        <Field label="Find student" className="flex-1 min-w-64">
          {({ id, describedBy }) => (
            <Input id={id} aria-describedby={describedBy} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or admission number" />
          )}
        </Field>
        <Button type="submit" variant="school">
          <Search className="w-4 h-4" aria-hidden="true" /> Search
        </Button>
      </form>

      {error && <Alert tone="danger">{error}</Alert>}

      {!data && !error && (
        <div aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {data && (
        <section aria-label="Historical records table">
          <p className="text-sm text-[var(--app-text-muted)]">
            {data.total} matching records · Page {page} of {Math.max(1, Math.ceil(data.total / 50))}
          </p>
          <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
            <table className="w-full text-sm text-left border-collapse">
              <caption className="sr-only">{labels[kind as keyof typeof labels]}</caption>
              <thead>
                <tr className="border-b border-[var(--app-border-strong)] bg-[var(--app-surface-2)]">
                  {COLUMNS.map(h => <th key={h} scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.records.map((r: any) => (
                  <tr key={r.id} className="border-b border-[var(--app-border)] hover:bg-[var(--app-surface-2)]">
                    <td className="px-4 py-3"><strong className="text-[var(--app-text)]">{r.student.fullName}</strong><div className="text-xs text-[var(--app-text-subtle)]">{r.student.admissionNumber}</div></td>
                    <td className="px-4 py-3 text-[var(--app-text-muted)]">{r.session} · Term {r.term}</td>
                    <td className="px-4 py-3 text-[var(--app-text-muted)]">{r.subject?.subjectName || r.trait?.traitName || r.date || 'Term total'}</td>
                    <td className="px-4 py-3 tabular-nums">{kind === 'grades' ? `${r.total ?? '—'} · ${r.grade || ''}` : kind === 'traitGrades' ? r.score : kind === 'attendance' ? `${r.daysPresent} / ${r.totalDays} days` : r.status}</td>
                    <td className="px-4 py-3 text-[var(--app-text-muted)]">{r.remark || r.teacherRemark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.total === 0 && (
              <EmptyState icon="FileText" title="No records found" message="Try a different search or record collection." />
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Previous
            </Button>
            <Button type="button" variant="outline" disabled={page * 50 >= data.total} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
