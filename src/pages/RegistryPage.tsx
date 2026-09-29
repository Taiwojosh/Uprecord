import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, Users, GraduationCap, Pencil, Trash2, BookOpen, CalendarClock, TrendingUp, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Skeleton';
import { Field, Input, Select } from '../components/ui/Field';
import { db, type IClass, type ISubject } from '../db/db';

type Kind = 'classes' | 'students' | 'teachers' | 'subjects';
type Row = { id: number; className?: string; level?: string; fullName?: string; admissionNumber?: string; gender?: string; classId?: number; email?: string; phone?: string; subjectName?: string; isCore?: boolean; teacherName?: string; teacherId?: number | null; capacity?: number };
type Registry = {
  schoolId: string;
  classes: Row[];
  students: Row[];
  teachers: Row[];
  subjects: Row[];
  schoolInfo: { name: string; abbreviation: string };
  termInfo: { currentTerm: number; currentSession: string };
};
type RolloverPreview = {
  from: { term: number; session: string };
  to: { term: number; session: string };
  isSameSession: boolean;
  rollover: {
    classes: { id: number; className: string; level: string; teacherName: string | null; studentCount: number; teacherAssigned: boolean }[];
    studentCount: number;
    teacherCount: number;
    classesWithoutTeacher: string[];
    studentsNotInClass: number;
  };
};
type PromotionMove = {
  studentId: number;
  fullName: string;
  admissionNumber: string;
  status: string;
  fromClass: { id: number; className: string; level: string } | null;
  toClass: { id: number; className: string; level: string } | null;
  action: 'promote' | 'skip' | 'graduate';
  reason: string;
};
type PromotionPreview = {
  schoolId: string;
  fromSession: string;
  toSession: string;
  moves: PromotionMove[];
  summary: { total: number; promote: number; graduate: number; skip: number };
};

const META: Record<Kind, { label: string; icon: string }> = {
  classes: { label: 'Classes', icon: 'LayoutGrid' },
  students: { label: 'Students', icon: 'Users' },
  teachers: { label: 'Teachers', icon: 'GraduationCap' },
  subjects: { label: 'Subjects', icon: 'BookOpen' },
};

export function RegistryPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Registry | null>(null);
  const [kind, setKind] = useState<Kind>('classes');
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [rollover, setRollover] = useState<RolloverPreview | null>(null);
  const [promotion, setPromotion] = useState<PromotionPreview | null>(null);
  const [promotionExceptions, setPromotionExceptions] = useState<Record<number, 'skip'>>({});
  const [rolloverBusy, setRolloverBusy] = useState(false);
  const [promotionBusy, setPromotionBusy] = useState(false);
  const schoolId = user?.schoolId;
  // Registered classes/subjects also appear in the academic subject/class lists
  // (the local Dexie tables that score sheets and report cards read from).
  const syncClassesAndSubjectsToLocal = useCallback(async (registry: Registry) => {
    if (!registry.schoolId) return;
    await db.transaction('rw', db.classes, db.subjects, async () => {
      const localClasses = await db.classes.where('schoolId').equals(registry.schoolId).toArray();
      const byRegistryId = new Map(localClasses.filter(c => c.registryId).map(c => [c.registryId!, c]));
      const byName = new Map(localClasses.map(c => [c.className.trim().toLowerCase(), c]));
      const localClassIdByServerId = new Map<number, number>();
      for (const row of registry.classes) {
        if (!row.className) continue;
        const existing = byRegistryId.get(row.id) || byName.get(row.className.trim().toLowerCase());
        const fields = {
          schoolId: registry.schoolId, registryId: row.id, className: row.className,
          teacherName: row.teacherName || '', teacherId: row.teacherId ?? null,
          level: (row.level as IClass['level']) || 'junior', capacity: row.capacity,
        };
        const localId = existing?.id ? (await db.classes.update(existing.id, fields), existing.id) : await db.classes.add(fields);
        localClassIdByServerId.set(row.id, localId);
      }
      const localSubjects = await db.subjects.where('schoolId').equals(registry.schoolId).toArray();
      const bySubjectRegistryId = new Map(localSubjects.filter(s => s.registryId).map(s => [s.registryId!, s]));
      for (const row of registry.subjects) {
        if (!row.subjectName) continue;
        const localClassId = row.classId ? localClassIdByServerId.get(row.classId) : undefined;
        if (row.classId && !localClassId) throw new Error('Registered subject refers to a missing class.');
        const existing = bySubjectRegistryId.get(row.id) || localSubjects.find(s =>
          s.subjectName.trim().toLowerCase() === row.subjectName!.trim().toLowerCase() &&
          (s.classId || undefined) === localClassId,
        );
        const fields = {
          schoolId: registry.schoolId, registryId: row.id, subjectName: row.subjectName,
          isCore: row.isCore ?? false, teacherId: row.teacherId ?? null,
          classId: localClassId, classIds: localClassId ? [localClassId] : [],
        };
        if (existing?.id) await db.subjects.update(existing.id, fields);
        else await db.subjects.add({ ...fields, coreLevels: ['Primary', 'junior', 'senior'] as ISubject['coreLevels'], departmentIds: [], assistantTeacherIds: [] });
      }
    });
  }, []);
  const load = useCallback(async () => {
    const response = await api.get<Registry>('/registry');
    if (response.data.schoolId !== schoolId) throw new Error('School context changed. Reload the page.');
    setData(response.data);
    try { await syncClassesAndSubjectsToLocal(response.data); return true; }
    catch { return false; }
  }, [schoolId, syncClassesAndSubjectsToLocal]);
  useEffect(() => {
    const controller = new AbortController();
    let serverLoaded = false;
    setData(null);
    setLoading(true);
    setMessage('');
    api.get<Registry>('/registry', { signal: controller.signal })
      .then(({ data }) => {
        if (data.schoolId !== schoolId) throw new Error('School context mismatch');
        setData(data);
        serverLoaded = true;
        return syncClassesAndSubjectsToLocal(data);
      })
      .catch(e => { if (!controller.signal.aborted) setMessage(e.response?.data?.error || (serverLoaded ? 'Academic lists on this device could not refresh. Reload to retry.' : 'Registry could not be loaded.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [schoolId]);
  const fields: [string, string][] = kind === 'classes' ? [['className', 'Class name'], ['level', 'Level']] : kind === 'teachers' ? [['fullName', 'Full name'], ['email', 'Email'], ['phone', 'Phone (optional)']] : kind === 'subjects' ? [['subjectName', 'Subject name']] : [['fullName', 'Full name'], ['admissionNumber', 'Admission number (leave empty to auto-generate)']];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const body: Record<string, unknown> = Object.fromEntries(fields.map(([key]) => [key, form[key] || '']));
      if (kind === 'students') { body.gender = form.gender || 'Female'; body.classId = Number(form.classId); }
      if (kind === 'subjects') { body.isCore = form.isCore === 'true'; }
      if (editing) await api.put(`/registry/${kind}/${editing}`, body);
      else await api.post(`/registry/${kind}`, body);
      setForm({}); setEditing(null); const synced = await load(); setMessage(synced ? 'Saved to your school registry.' : 'Saved to your school registry. Academic lists on this device could not refresh; reload to retry.');
    } catch (e: any) { setMessage(e.response?.data?.error || 'Could not save. Please retry.'); }
    finally { setBusy(false); }
  };
  const remove = async (row: Row) => {
    if (!window.confirm(`Delete ${row.className || row.fullName || row.subjectName}? This removes the record from the school registry.`)) return;
    setBusy(true);
    try { await api.delete(`/registry/${kind}/${row.id}`); const synced = await load(); setMessage(synced ? 'Record deleted.' : 'Record deleted. Academic lists on this device could not refresh; reload to retry.'); }
    catch (e: any) { setMessage(e.response?.data?.error || 'Could not delete this record.'); }
    finally { setBusy(false); }
  };
  const previewRollover = async () => {
    setRolloverBusy(true); setMessage('');
    try {
      const { data: preview } = await api.post<RolloverPreview>('/registry/rollover/preview', {});
      setRollover(preview);
    } catch (e: any) { setMessage(e.response?.data?.error || 'Could not build a rollover preview.'); }
    finally { setRolloverBusy(false); }
  };
  const applyRollover = async () => {
    if (!rollover) return;
    if (!window.confirm(`Advance the registry to Term ${rollover.to.term} · ${rollover.to.session}? This is preview-first: you reviewed the roster above.`)) return;
    setRolloverBusy(true); setMessage('');
    try {
      await api.post('/registry/rollover/apply', { fromTerm: rollover.from.term, fromSession: rollover.from.session, targetTerm: rollover.to.term, targetSession: rollover.to.session });
      const synced = await load(); setRollover(null); setMessage(synced ? 'Term/session rollover applied.' : 'Term/session rollover applied. Academic lists on this device could not refresh; reload to retry.');
    } catch (e: any) { setMessage(e.response?.data?.error || 'Could not apply the rollover.'); }
    finally { setRolloverBusy(false); }
  };
  const previewPromotion = async (targetSession: string, exceptions?: Record<number, 'skip'>) => {
    setPromotionBusy(true); setMessage('');
    try {
      const exceptionsPayload = exceptions ? Object.fromEntries(Object.entries(exceptions).map(([k, v]) => [String(k), v])) : undefined;
      const { data: preview } = await api.post<PromotionPreview>('/registry/promotion/preview', exceptionsPayload ? { ...(targetSession ? { targetSession } : {}), exceptions: exceptionsPayload } : (targetSession ? { targetSession } : {}));
      setPromotion(preview);
      setPromotionExceptions(exceptions || {});
    } catch (e: any) { setMessage(e.response?.data?.error || 'Could not build a promotion preview.'); }
    finally { setPromotionBusy(false); }
  };
  const togglePromotionException = (studentId: number) => {
    const next = { ...promotionExceptions };
    if (next[studentId]) delete next[studentId];
    else next[studentId] = 'skip';
    setPromotionExceptions(next);
    previewPromotion(promotion?.toSession || '', next);
  };
  const applyPromotion = async () => {
    if (!promotion) return;
    if (promotion.moves.some(move => move.action !== 'skip' && !move.fromClass)) {
      setMessage('A student has no current class. Assign a class in the registry, then preview again.');
      return;
    }
    const moves = promotion.moves
      .filter(move => move.action !== 'skip')
      .map(move => ({ studentId: move.studentId, fromClassId: move.fromClass!.id, toClassId: move.toClass?.id ?? null }));
    if (moves.length === 0) { setMessage('Nothing to promote — all students were kept as exceptions.'); return; }
    if (!window.confirm(`Promote ${moves.length} student(s) into ${promotion.toSession}? Preview was shown first; students marked as exceptions stay in place.`)) return;
    setPromotionBusy(true); setMessage('');
    try {
      const { data } = await api.post<{ promoted: number; graduated: number }>('/registry/promotion/apply', { fromSession: promotion.fromSession, targetSession: promotion.toSession, moves });
      const synced = await load(); setPromotion(null); setMessage(synced ? `Promotion applied: ${data.promoted} promoted, ${data.graduated} graduated.` : `Promotion applied: ${data.promoted} promoted, ${data.graduated} graduated. Academic lists on this device could not refresh; reload to retry.`);
    } catch (e: any) { setMessage(e.response?.data?.error || 'Could not apply the promotion plan.'); }
    finally { setPromotionBusy(false); }
  };
  if (user?.role !== 'admin') return (
    <main className="p-8">
      <EmptyState icon="ShieldCheck" title="Administrators only" message="The school registry is available to school administrators." />
    </main>
  );
  const okTone = message.startsWith('Saved') || message.startsWith('Record deleted') || message.startsWith('Term/session') || message.startsWith('Promotion applied');
  const kindIcon = META[kind].icon;
  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-[var(--app-text)]">School Registry</h1>
        <p className="mt-2 text-[var(--app-text-muted)]">
          Records here are saved to your school account and available when you sign in on another device.
        </p>
      </header>

      <nav aria-label="Registry collections" className="flex flex-wrap gap-2">
        {(Object.keys(META) as Kind[]).map(k => (
          <Button key={k} type="button" disabled={busy} aria-pressed={kind === k}
            variant={kind === k ? 'school' : 'outline'} size="sm"
            onClick={() => { setKind(k); setEditing(null); setForm({}); setMessage(''); }}
          >
            {META[k].label}
          </Button>
        ))}
      </nav>

      {message && <Alert tone={okTone ? 'success' : 'danger'}>{message}</Alert>}

      <section aria-label="Term and promotion tools" className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <CalendarClock className="w-5 h-5 text-[var(--brand-primary,#2563EB)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="font-bold text-[var(--app-text)]">Term / session rollover</h2>
              <p className="text-sm text-[var(--app-text-muted)]">
                Currently: Term {data?.termInfo?.currentTerm ?? '—'} · {data?.termInfo?.currentSession || '—'}.
                Preview keeps the roster intact and only advances the academic period.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" loading={rolloverBusy} disabled={!data || busy || promotionBusy} onClick={previewRollover}>
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Preview next period
            </Button>
            {rollover && (
              <Button type="button" variant="school" size="sm" loading={rolloverBusy} disabled={busy || promotionBusy} onClick={applyRollover}>
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Apply {rollover.to.term}·{rollover.to.session}
              </Button>
            )}
          </div>
          {rollover && (
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4 text-sm space-y-2">
              <p className="font-semibold text-[var(--app-text)]">
                {rollover.from.term}·{rollover.from.session} → {rollover.to.term}·{rollover.to.session}
                {rollover.isSameSession ? ' (same session)' : ' (new session — promotions available)'}
              </p>
              <p className="text-[var(--app-text-muted)]">
                {rollover.rollover.classes.length} class(es) · {rollover.rollover.studentCount} student(s) · {rollover.rollover.teacherCount} teacher(s) carry into the next period.
              </p>
              {rollover.rollover.classesWithoutTeacher.length > 0 && (
                <p className="text-amber-600 dark:text-amber-400">
                  Classes without a teacher: {rollover.rollover.classesWithoutTeacher.join(', ')}.
                </p>
              )}
              {rollover.rollover.studentsNotInClass > 0 && (
                <p className="text-amber-600 dark:text-amber-400">{rollover.rollover.studentsNotInClass} student(s) are not assigned to any class.</p>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-[var(--brand-primary,#2563EB)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="font-bold text-[var(--app-text)]">Next-session promotion</h2>
              <p className="text-sm text-[var(--app-text-muted)]">
                Preview which students move to the next class for a new session. Students can be kept as exceptions before you apply.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" loading={promotionBusy} disabled={!data || busy || rolloverBusy} onClick={() => previewPromotion('')}>
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Preview promotions
            </Button>
            {promotion && (
              <Button type="button" variant="school" size="sm" loading={promotionBusy} disabled={busy || rolloverBusy} onClick={applyPromotion}>
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Apply plan
              </Button>
            )}
          </div>
          {promotion && (
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4 text-sm space-y-2 max-h-72 overflow-y-auto">
              <p className="font-semibold text-[var(--app-text)]">
                {promotion.fromSession} → {promotion.toSession} · {promotion.summary.promote} promote, {promotion.summary.graduate} graduate, {promotion.summary.skip} kept
              </p>
              {promotion.moves.length === 0 && <p className="text-[var(--app-text-muted)]">No students to promote yet.</p>}
              {promotion.moves.map(move => (
                <div key={move.studentId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--app-surface)] px-3 py-2 border border-[var(--app-border)]">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--app-text)] truncate">
                      {move.fullName}
                      {promotionExceptions[move.studentId] && (
                        <span className="ml-2 text-[0.625rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">kept</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--app-text-muted)]">
                      {move.fromClass?.className || 'No class'} → {move.action === 'graduate' ? 'Graduate' : move.toClass?.className || 'No class'} ({move.reason})
                    </p>
                  </div>
                  <Button type="button" variant={promotionExceptions[move.studentId] ? 'school' : 'outline'} size="sm" disabled={promotionBusy} onClick={() => togglePromotionException(move.studentId)}>
                    {promotionExceptions[move.studentId] ? 'Remove exception' : 'Keep as exception'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {kind === 'teachers' && (
        <p className="text-sm text-[var(--app-text-muted)]">
          Adding a teacher creates a registry record. It does not issue login credentials. Email activation is currently unavailable.
        </p>
      )}

      <Card className="p-5">
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4 items-start">
          {fields.map(([key, label]) => (
            <Field key={key} label={label}>
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} required={key !== 'phone'}
                  type={key === 'email' ? 'email' : 'text'} value={form[key] || ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              )}
            </Field>
          ))}
          {kind === 'students' && (
            <>
              <Field label="Gender">
                {({ id, describedBy }) => (
                  <Select id={id} aria-describedby={describedBy} value={form.gender || 'Female'}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option>Female</option><option>Male</option>
                  </Select>
                )}
              </Field>
              <Field label="Class" hint="Choose a class belonging to your school.">
                {({ id, describedBy }) => (
                  <Select id={id} aria-describedby={describedBy} required value={form.classId || ''}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                    <option value="">Choose a class</option>
                    {data?.classes.map(row => <option key={row.id} value={row.id}>{row.className}</option>)}
                  </Select>
                )}
              </Field>
            </>
          )}
          {kind === 'subjects' && (
            <Field label="Core subject">
              {({ id, describedBy }) => (
                <Select id={id} aria-describedby={describedBy} value={form.isCore || 'true'}
                  onChange={(e) => setForm({ ...form, isCore: e.target.value })}>
                  <option value="true">Core (required for every student)</option>
                  <option value="false">Elective</option>
                </Select>
              )}
            </Field>
          )}
          {kind === 'classes' && (
            <div className="sm:col-span-2">
              <p className="text-xs text-[var(--app-text-muted)]">
                Registered classes also flow into the academic Classes list so teachers can use them for rosters and reports.
              </p>
            </div>
          )}
          {kind === 'subjects' && (
            <div className="sm:col-span-2">
              <p className="text-xs text-[var(--app-text-muted)]">
                Registered subjects also flow into the academic Subjects list used by score sheets and report cards.
              </p>
            </div>
          )}
          {kind === 'students' && !editing && (
            <div className="sm:col-span-2">
              <p className="text-xs text-[var(--app-text-muted)]">
                Leave the admission number empty to auto-generate one from the school abbreviation
                {data?.schoolInfo?.abbreviation ? <> (<strong>{data.schoolInfo.abbreviation}-0001</strong>, then increasing)</> : null}. Existing numbers are never changed.
              </p>
            </div>
          )}
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" variant="school" disabled={busy || !data} loading={busy}>
              {editing ? 'Save changes' : 'Add record'}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => { setEditing(null); setForm({}); }}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </Card>

      <section aria-label={`${META[kind].label} records`} className="space-y-3">
        {data === null ? (
          <div aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : data[kind].length === 0 ? (
          <EmptyState icon={kindIcon} title={`No ${kind} recorded yet`}
            message="Use the form above to add the first record." />
        ) : (
          data[kind].map(row => (
            <Card key={row.id} className="p-4 flex flex-wrap justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-bold text-[var(--app-text)]">{row.className || row.fullName || row.subjectName}</h2>
                <p className="text-sm text-[var(--app-text-muted)]">{row.level || row.email || row.admissionNumber || (row.isCore ? 'Core subject' : 'Elective')}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" size="sm" disabled={busy}
                  onClick={() => { setEditing(row.id); setForm(Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))); }}>
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                </Button>
                <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => remove(row)}>
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </section>
    </main>
  );
}
