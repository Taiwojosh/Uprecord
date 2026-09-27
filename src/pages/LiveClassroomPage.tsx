import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Video, Plus, RefreshCw } from 'lucide-react';
import api from '../lib/api';
const EmbeddedClassroom = lazy(() => import('../components/EmbeddedClassroom'));
type Lesson = { id: string; title: string; classId: number; startsAt: string; durationMinutes: number; mode: 'external' | 'embedded'; status: string };
type Listing = { classes: { id: number; className: string }[]; lessons: Lesson[]; canManage: boolean; embeddedAvailable: boolean };
type Connection = { token: string; serverUrl: string; title: string };
const field = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm';
const button = 'rounded-xl px-4 py-2.5 text-sm font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50';
export function LiveClassroomPage() {
  const [data, setData] = useState<Listing>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState('external');
  const [connection, setConnection] = useState<Connection>();
  const [externalUrl, setExternalUrl] = useState('');
  const load = async () => { const { data } = await api.get('/live'); setData(data); };
  const run = async (fn: () => Promise<void>) => {
    setError(''); setBusy(true);
    try { await fn(); } catch (e: any) { setError(e.response?.data?.error || 'Could not connect. Please try again.'); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    let active = true;
    const refresh = () => api.get('/live').then(r => { if (active) setData(r.data); }).catch(() => { if (active) setError('Could not load classes. Check your connection and refresh.'); });
    void refresh(); const timer = setInterval(refresh, 30_000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const join = (lesson: Lesson) => run(async () => {
    const { data } = await api.post(`/live/${lesson.id}/join`);
    if (data.mode === 'external') setExternalUrl(data.url);
    else setConnection(data);
  });
  return <section className="mx-auto max-w-5xl space-y-6 text-slate-900 dark:text-slate-100">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Live classroom</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your classes, together in one place.</p></div>
      <div className="flex gap-2"><button className={button} disabled={busy} onClick={() => run(load)} aria-label="Refresh classes"><RefreshCw size={18} /></button>
        {data?.canManage && <button className={button} onClick={() => setAdding(!adding)}><Plus size={16} className="mr-1 inline" />Schedule class</button>}</div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">{error}</p>}
    {!data && !error && <p role="status">Loading classes…</p>}
    {connection && <Suspense fallback={<p role="status">Opening classroom…</p>}><EmbeddedClassroom {...connection} onLeave={() => setConnection(undefined)} /></Suspense>}
    {externalUrl && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950"><p className="mb-3">Your class is ready. The meeting opens in a new tab.</p><a href={externalUrl} target="_blank" rel="noopener noreferrer" className={button}>Open meeting</a><button className="ml-4 text-sm underline" onClick={() => setExternalUrl('')}>Dismiss</button></div>}
    {adding && data?.canManage && <form className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5" onSubmit={e => {
      e.preventDefault(); const form = e.currentTarget; const values = new FormData(form);
      void run(async () => {
        await api.post('/live', { title: values.get('title'), classId: Number(values.get('classId')), startsAt: new Date(String(values.get('startsAt'))).toISOString(), durationMinutes: Number(values.get('durationMinutes')), mode, meetingUrl: values.get('meetingUrl') || undefined });
        setAdding(false); await load();
      });
    }}>
      <h2 className="text-lg font-semibold">Schedule a class</h2>
      <label className="block space-y-1"><span>Topic</span><input name="title" required minLength={3} maxLength={150} className={field} placeholder="e.g. Fractions revision" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1"><span>Class</span><select className={field} name="classId" required><option value="">Choose a class</option>{data.classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}</select></label>
        <label className="block space-y-1"><span>Start time (your local time)</span><input className={field} name="startsAt" type="datetime-local" required /></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1"><span>Duration in minutes</span><input className={field} name="durationMinutes" type="number" min={5} max={240} defaultValue={40} required /></label>
        <label className="block space-y-1"><span>Meeting type</span><select className={field} value={mode} onChange={e => setMode(e.target.value)}><option value="external">Google Meet or Zoom</option><option value="embedded" disabled={!data.embeddedAvailable}>Video inside SeferNote{!data.embeddedAvailable ? ' — setup pending' : ''}</option></select></label></div>
      {mode === 'external' && <label className="block space-y-1"><span>Meeting link</span><input className={field} name="meetingUrl" type="url" required placeholder="https://meet.google.com/…" /><span className="block text-xs text-slate-500">Create the meeting in Google Meet or Zoom, then paste its participant link here.</span></label>}
      {!data.classes.length && <p role="status">An administrator needs to assign you a class in the School Registry first.</p>}
      <div className="flex gap-3"><button className={button} disabled={busy || !data.classes.length}>{busy ? 'Saving…' : 'Save class'}</button><button type="button" className="px-4 py-2 text-sm" onClick={() => setAdding(false)}>Cancel</button></div>
    </form>}
    {data && !data.lessons.length && <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center"><Video className="mx-auto mb-3 text-slate-400" size={32} /><h2 className="font-semibold">No classes scheduled yet</h2><p className="mt-2 text-sm text-slate-500">{data.canManage ? 'Schedule your first class to give students one place to join.' : 'Classes scheduled for you will appear here.'}</p></div>}
    <div className="grid gap-4 sm:grid-cols-2">{data?.lessons.map(lesson => <article key={lesson.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3"><h2 className="font-semibold break-words">{lesson.title}</h2><span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs capitalize">{lesson.status}</span></div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{data.classes.find(c => c.id === lesson.classId)?.className} · {lesson.durationMinutes} minutes</p>
      <p className="text-sm">{new Date(lesson.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{lesson.mode === 'embedded' ? 'Video inside SeferNote' : 'Google Meet / Zoom'}</p>
      <div className="flex flex-wrap gap-2">
        {data.canManage && lesson.status === 'scheduled' && <button disabled={busy} className={button} onClick={() => run(async () => { await api.post(`/live/${lesson.id}/start`); await load(); })}>Start class</button>}
        {lesson.status === 'live' && <button disabled={busy} className={button} onClick={() => join(lesson)}>Join class</button>}
        {data.canManage && lesson.status !== 'ended' && <button disabled={busy} className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm" onClick={() => { if (window.confirm(lesson.status === 'live' ? 'End this class for everyone?' : 'Cancel this scheduled class?')) void run(async () => { await api.post(`/live/${lesson.id}/end`); setConnection(undefined); await load(); }); }}>{lesson.status === 'live' ? 'End class' : 'Cancel class'}</button>}
        {!data.canManage && lesson.status === 'scheduled' && <p className="text-sm text-slate-500">Your teacher will open the classroom.</p>}
      </div>
    </article>)}</div>
  </section>;
}
