import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
type Kind = 'classes' | 'students' | 'teachers';
type Row = { id: number; className?: string; level?: string; fullName?: string; admissionNumber?: string; gender?: string; classId?: number; email?: string; phone?: string };
type Registry = { schoolId: string; classes: Row[]; students: Row[]; teachers: Row[] };
export function RegistryPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Registry | null>(null);
  const [kind, setKind] = useState<Kind>('classes');
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
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
    api.get<Registry>('/registry', { signal: controller.signal }).then(({ data }) => {
      if (data.schoolId !== schoolId) throw new Error('School context mismatch');
      setData(data);
    }).catch(e => { if (!controller.signal.aborted) setMessage(e.response?.data?.error || 'Registry could not be loaded.'); });
    return () => controller.abort();
  }, [schoolId]);
  const fields = kind === 'classes' ? [['className', 'Class name'], ['level', 'Level']] : kind === 'teachers' ? [['fullName', 'Full name'], ['email', 'Email'], ['phone', 'Phone (optional)']] : [['fullName', 'Full name'], ['admissionNumber', 'Admission number']];
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
  if (user?.role !== 'admin') return <main className="p-8">The school registry is available to school administrators.</main>;
  return <main className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
    <header><h1 className="text-3xl font-bold">School Registry</h1><p className="mt-2 text-gray-600">Records here are saved to your school account and available when you sign in on another device.</p></header>
    <nav aria-label="Registry collections" className="flex flex-wrap gap-3">{(['classes','students','teachers'] as Kind[]).map(k => <button key={k} disabled={busy} aria-pressed={kind === k} className={`rounded-lg px-5 py-3 capitalize ${kind === k ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-900'}`} onClick={() => { setKind(k); setEditing(null); setForm({}); setMessage(''); }}>{k}</button>)}</nav>
    {message && <p role="status" className="p-4 rounded-lg bg-blue-50 text-blue-950">{message}</p>}
    {kind === 'teachers' && <p className="text-sm text-gray-600">Adding a teacher creates a registry record. It does not issue login credentials. Email activation is currently unavailable.</p>}
    <form onSubmit={submit} className="rounded-xl border p-5 grid sm:grid-cols-2 gap-4 bg-white text-gray-900">
      {fields.map(([key,label]) => <label key={key} className="grid gap-2">{label}<input className="border rounded-lg p-3" required={key !== 'phone'} type={key === 'email' ? 'email' : 'text'} value={form[key] || ''} onChange={e => setForm({...form,[key]:e.target.value})} /></label>)}
      {kind === 'students' && <><label className="grid gap-2">Gender<select className="border rounded-lg p-3" value={form.gender || 'Female'} onChange={e => setForm({...form,gender:e.target.value})}><option>Female</option><option>Male</option></select></label><label className="grid gap-2">Class<select required className="border rounded-lg p-3" value={form.classId || ''} onChange={e => setForm({...form,classId:e.target.value})}><option value="">Choose a class</option>{data?.classes.map(row => <option key={row.id} value={row.id}>{row.className}</option>)}</select></label></>}
      <div className="flex gap-3 items-end"><button disabled={busy || !data} className="bg-blue-700 text-white rounded-lg px-5 py-3 disabled:opacity-50">{busy ? 'Saving…' : editing ? 'Save changes' : 'Add record'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm({}); }}>Cancel edit</button>}</div>
    </form>
    {!data ? <p aria-busy="true">Loading registry…</p> : <section aria-label={`${kind} records`} className="space-y-3">{data[kind].length === 0 && <p>No {kind} recorded yet.</p>}{data[kind].map(row => <article key={row.id} className="border rounded-xl p-4 flex flex-wrap justify-between gap-4 bg-white text-gray-900"><div><h2 className="font-bold">{row.className || row.fullName}</h2><p className="text-sm text-gray-600">{row.level || row.email || row.admissionNumber}</p></div><div className="flex gap-4"><button disabled={busy} className="underline" onClick={() => { setEditing(row.id); setForm(Object.fromEntries(Object.entries(row).map(([k,v])=>[k,String(v ?? '')]))); }}>Edit</button><button disabled={busy} className="text-red-700 underline" onClick={() => remove(row)}>Delete</button></div></article>)}</section>}
  </main>;
}
