import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Field, Input } from '../components/ui/Field';

const labels = { grades: 'Academic results', traitGrades: 'Trait scores', attendance: 'Term attendance', dailyAttendance: 'Daily attendance' };

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
    api.get('/registry/history', { params: { kind, page, search: query, grouped: 1 }, signal: controller.signal })
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
          Saved academic records from your school's backups, grouped by session and term. Read-only history is kept separately from new report editing.
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
        <section aria-label="Historical records" className="space-y-6">
          <p className="text-sm text-[var(--app-text-muted)]">
            {data.total === 0 ? 'No matching records' : `Showing ${((data.page || page) - 1) * (data.pageSize || 2000) + 1}–${Math.min((data.page || page) * (data.pageSize || 2000), data.total)} of ${data.total} matching records`}
          </p>
          {data.total === 0 && (
            <EmptyState icon="FileText" title="No records found" message="Try a different search or record collection." />
          )}
          {data.total > 0 && Array.isArray(data.groups) && data.groups.map(group => (
            <div key={group.session} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden">
              <div className="px-4 py-3 bg-[var(--app-surface-2)] border-b border-[var(--app-border-strong)] flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-[var(--app-text)]">Session {group.session || 'Unspecified'}</h2>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                  {group.terms.reduce((sum, t) => sum + t.count, 0)} on this page
                </span>
              </div>
              {group.terms.map(term => (
                <div key={`${group.session}-${term.term}`} className="border-b border-[var(--app-border)] last:border-0">
                  <h3 className="px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--app-text-muted)]">Term {term.term}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <tbody>
                        {term.records.map((r: any) => (
                          <tr key={r.id} className="border-t border-[var(--app-border)] hover:bg-[var(--app-surface-2)]">
                            <td className="px-4 py-3"><strong className="text-[var(--app-text)]">{r.student.fullName}</strong><div className="text-xs text-[var(--app-text-subtle)]">{r.student.admissionNumber}</div></td>
                            <td className="px-4 py-3 text-[var(--app-text-muted)]">{r.subject?.subjectName || r.trait?.traitName || r.date || 'Term total'}</td>
                            <td className="px-4 py-3 tabular-nums">{kind === 'grades' ? `${r.total ?? '—'} · ${r.grade || ''}` : kind === 'traitGrades' ? r.score : kind === 'attendance' ? `${r.daysPresent} / ${r.totalDays} days` : r.status}</td>
                            <td className="px-4 py-3 text-[var(--app-text-muted)]">{r.remark || r.teacherRemark || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {term.count > term.records.length && (
                    <p className="px-4 py-2 text-xs text-[var(--app-text-subtle)]">
                      Showing first {term.records.length} of {term.count} records for this term.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
          {data.total === 0 && !Array.isArray(data.groups) && (
            <EmptyState icon="FileText" title="No records found" message="Try a different search or record collection." />
          )}
          {data.total > 0 && (page > 1 || data.hasMore) && (
            <div className="flex items-center justify-between gap-3" aria-label="History pages">
              <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous page</Button>
              <span className="text-sm text-[var(--app-text-muted)]">Page {page}</span>
              <Button type="button" variant="outline" disabled={!data.hasMore} onClick={() => setPage(value => value + 1)}>Next page</Button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
