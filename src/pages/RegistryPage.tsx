import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, Users, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Skeleton';
import { Field, Input, Select } from '../components/ui/Field';

type Kind = 'classes' | 'students' | 'teachers';
type Row = { id: number; className?: string; level?: string; fullName?: string; admissionNumber?: string; gender?: string; classId?: number; email?: string; phone?: string };
type Registry = { schoolId: string; classes: Row[]; students: Row[]; teachers: Row[] };

const META: Record<Kind, { label: string; icon: string }> = {
  classes: { label: 'Classes', icon: 'LayoutGrid' },
  students: { label: 'Students', icon: 'Users' },
  teachers: { label: 'Teachers', icon: 'GraduationCap' },
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
  const schoolId = user?.schoolId;
  const load = async () => {
    const response = await api.get<Registry>('/registry');
    if (response.data.schoolId !== schoolId) throw new Error('School context changed. Reload the page.');
    setData(response.data);
  };
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setLoading(true);
    setMessage('');
    api.get<Registry>('/registry', { signal: controller.signal })
      .then(({ data }) => {
        if (data.schoolId !== schoolId) throw new Error('School context mismatch');
        setData(data);
      })
      .catch(e => { if (!controller.signal.aborted) setMessage(e.response?.data?.error || 'Registry could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [schoolId]);
  const fields: [string, string][] = kind === 'classes' ? [['className', 'Class name'], ['level', 'Level']] : kind === 'teachers' ? [['fullName', 'Full name'], ['email', 'Email'], ['phone', 'Phone (optional)']] : [['fullName', 'Full name'], ['admissionNumber', 'Admission number']];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const body: Record<string, unknown> = Object.fromEntries(fields.map(([key]) => [key, form[key] || '']));
      if (kind === 'students') { body.gender = form.gender || 'Female'; body.classId = Number(form.classId); }
      if (editing) await api.put(`/registry/${kind}/${editing}`, body);
      else await api.post(`/registry/${kind}`, body);
      setForm({}); setEditing(null); await load(); setMessage('Saved to your school registry.');
    } catch (e: any) { setMessage(e.response?.data?.error || 'Could not save. Please retry.'); }
    finally { setBusy(false); }
  };
  const remove = async (row: Row) => {
    if (!window.confirm(`Delete ${row.className || row.fullName}? This removes the record from the school registry.`)) return;
    setBusy(true);
    try { await api.delete(`/registry/${kind}/${row.id}`); await load(); setMessage('Record deleted.'); }
    catch (e: any) { setMessage(e.response?.data?.error || 'Could not delete this record.'); }
    finally { setBusy(false); }
  };
  if (user?.role !== 'admin') return (
    <main className="p-8">
      <EmptyState icon="ShieldCheck" title="Administrators only" message="The school registry is available to school administrators." />
    </main>
  );
  const okTone = message.startsWith('Saved') || message.startsWith('Record deleted');
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
                <h2 className="font-bold text-[var(--app-text)]">{row.className || row.fullName}</h2>
                <p className="text-sm text-[var(--app-text-muted)]">{row.level || row.email || row.admissionNumber}</p>
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
