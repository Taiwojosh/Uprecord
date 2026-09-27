import React, { useEffect, useRef, useState } from 'react';
import api from '../lib/api';

type Question = { prompt: string; options: string[]; correct: number };
type Assessment = { id: string; title: string; classId: number; durationMinutes: number; published: boolean; questionCount: number };
type Draft = { title: string; classId: number; durationMinutes: number; questions: Question[] };
type Attempt = { id: string; title: string; questions: Omit<Question, 'correct'>[]; answers: Record<string, number>; expiresAt: string; submittedAt: string | null; score: number | null; serverNow: string };
const blankQuestion = (): Question => ({ prompt: '', options: ['', '', '', ''], correct: 0 });
const fresh = (): Draft => ({ title: '', classId: 0, durationMinutes: 30, questions: [blankQuestion()] });
const input = 'w-full rounded-lg border border-border bg-surface p-3 text-text-primary';
const button = 'rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-50';

export function CbtPage() {
  const [data, setData] = useState<{ staff: boolean; classes: { id: number; className: string }[]; assessments: Assessment[] }>();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [results, setResults] = useState<{ total: number; results: { id: string; studentName: string; score: number | null; submittedAt: string | null }[] } | null>(null);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0); const offset = useRef(0); const saving = useRef(false);
  const fail = (e: any) => setError(e.response?.data?.error || 'Could not connect. Check your connection and try again.');
  const load = () => api.get('/cbt').then(r => setData(r.data)).catch(fail);
  useEffect(() => { void load(); }, []);
  const saveAttempt = async (answers: Record<string, number>, submit = false) => {
    if (!activeId || !attempt || saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try { const { data: saved } = await api.put(`/cbt/${activeId}/attempt`, { answers, submit }); setAttempt(previous => previous && ({ ...previous, ...saved })); setNotice(saved.submittedAt ? 'Assessment submitted.' : 'Answer saved'); }
    catch (e) { fail(e); } finally { saving.current = false; setBusy(false); }
  };
  useEffect(() => {
    if (!attempt || attempt.submittedAt) return;
    const tick = () => { const left = Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now() - offset.current) / 1000)); setSeconds(left); if (!left && !saving.current) void saveAttempt(attempt.answers, true); };
    tick(); const interval = window.setInterval(tick, 1000); return () => window.clearInterval(interval);
  }, [attempt, activeId]);
  async function start(item: Assessment) {
    setBusy(true); setError(''); setNotice('');
    try { const { data: next } = await api.post(`/cbt/${item.id}/attempt`); offset.current = new Date(next.serverNow).getTime() - Date.now(); setAttempt(next); setActiveId(item.id); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function saveDraft(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { if (editId) await api.put(`/cbt/${editId}`, draft); else await api.post('/cbt', draft); setDraft(null); setEditId(null); setNotice('Draft saved. Review it before publishing.'); await load(); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }
  const updateQuestion = (index: number, change: Partial<Question>) => setDraft(previous => previous && ({ ...previous, questions: previous.questions.map((q, i) => i === index ? { ...q, ...change } : q) }));
  return <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Computer-based tests</h1><p className="text-text-secondary">{data?.staff ? 'Create assessments for your classes and see their results.' : 'Your class assessments. Answers are saved to your school account.'}</p></div>{data?.staff && !draft && <button className={button} onClick={() => { setDraft(fresh()); setEditId(null); setResults(null); }}>New assessment</button>}</div>
    {error && <div role="alert" className="rounded-lg border border-red-400 p-3">{error}</div>}
    {notice && <p role="status" className="text-sm text-text-secondary">{notice}</p>}
    {!data && !error && <p>Loading assessments…</p>}
    {draft && <form onSubmit={saveDraft} className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-xl font-semibold">{editId ? 'Edit draft' : 'New assessment'}</h2>
      <label className="block">Title<input required maxLength={160} className={input} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label>Class<select required className={input} value={draft.classId || ''} onChange={e => setDraft({ ...draft, classId: Number(e.target.value) })}><option value="">Choose class</option>{data?.classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}</select></label><label>Duration (minutes)<input required type="number" min={1} max={180} className={input} value={draft.durationMinutes} onChange={e => setDraft({ ...draft, durationMinutes: Number(e.target.value) })} /></label></div>
      {!data?.classes.length && <p>Ask your administrator to assign a class to your teacher account before creating a test.</p>}
      {draft.questions.map((q, index) => <fieldset key={index} className="space-y-3 rounded-lg border border-border p-3"><legend className="font-semibold">Question {index + 1}</legend><label className="block">Question text<textarea required maxLength={2000} className={input} value={q.prompt} onChange={e => updateQuestion(index, { prompt: e.target.value })} /></label>{q.options.map((option, oi) => <label className="block" key={oi}>Option {String.fromCharCode(65 + oi)}<input required maxLength={500} className={input} value={option} onChange={e => updateQuestion(index, { options: q.options.map((v, i) => i === oi ? e.target.value : v) })} /></label>)}<label className="block">Correct answer<select className={input} value={q.correct} onChange={e => updateQuestion(index, { correct: Number(e.target.value) })}>{q.options.map((_, i) => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}</select></label>{draft.questions.length > 1 && <button type="button" className="underline" onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, i) => i !== index) })}>Remove question {index + 1}</button>}</fieldset>)}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={draft.questions.length >= 100} className="rounded-lg border border-border px-4 py-2" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion()] })}>Add question</button><button disabled={busy} className={button}>Save draft</button><button type="button" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}
    {attempt && <section className="space-y-4 rounded-xl border border-border bg-surface p-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">{attempt.title}</h2>{!attempt.submittedAt && <p role="timer">Time remaining: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p>}</div>{attempt.submittedAt ? <><p className="text-lg">Score: {attempt.score} / {attempt.questions.length}</p><p>This assessment has been submitted. Your teacher can see the result.</p><button className={button} onClick={() => setAttempt(null)}>Back to assessments</button></> : <><p className="text-sm text-text-secondary">Select an answer to save it. You can resume before the timer ends. Keep this page open while taking the test.</p>{attempt.questions.map((q, qi) => <fieldset key={qi} className="space-y-2 border-b border-border pb-4"><legend className="mb-2 font-semibold">{qi + 1}. {q.prompt}</legend>{q.options.map((option, oi) => <label key={oi} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"><input type="radio" name={`answer-${qi}`} checked={attempt.answers[String(qi)] === oi} disabled={busy || seconds <= 0} onChange={() => void saveAttempt({ ...attempt.answers, [qi]: oi })} />{option}</label>)}</fieldset>)}<button className={button} disabled={busy} onClick={() => { if (window.confirm(`Submit your test? You answered ${Object.keys(attempt.answers).length} of ${attempt.questions.length} questions. You cannot change answers after submitting.`)) void saveAttempt(attempt.answers, true); }}>Submit assessment</button></>}</section>}
    {results && <section className="rounded-xl border border-border bg-surface p-4"><h2 className="mb-3 text-xl font-semibold">Results</h2>{!results.results.length && <p>No students have started this assessment yet.</p>}<ul className="divide-y divide-border">{results.results.map(r => <li key={r.id} className="flex justify-between gap-3 py-3"><span>{r.studentName}</span><span>{r.submittedAt ? `${r.score} / ${results.total}` : 'In progress'}</span></li>)}</ul></section>}
    {!draft && !attempt && data?.assessments.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"><div><h2 className="text-lg font-semibold">{item.title}</h2><p className="text-sm text-text-secondary">{item.questionCount} questions · {item.durationMinutes} minutes · {item.published ? 'Published' : 'Draft'}</p></div><div className="flex flex-wrap gap-3">{data.staff ? <>{!item.published && <><button disabled={busy} className="underline" onClick={async () => { try { const response = await api.get(`/cbt/${item.id}/edit`); setDraft(response.data); setEditId(item.id); } catch (e) { fail(e); } }}>Edit</button><button disabled={busy} className={button} onClick={async () => { if (!window.confirm('Publish for your class? Questions and timing cannot be changed afterwards.')) return; setBusy(true); try { await api.post(`/cbt/${item.id}/publish`); await load(); } catch (e) { fail(e); } finally { setBusy(false); } }}>Publish</button></>}<button className="underline" onClick={async () => { try { setResults((await api.get(`/cbt/${item.id}/results`)).data); } catch (e) { fail(e); } }}>Results</button></> : <button disabled={busy} className={button} onClick={() => void start(item)}>Start / resume</button>}</div></article>)}
    {data && !data.assessments.length && !draft && <p className="rounded-xl border border-border p-6">{data.staff ? 'No assessments yet. Create your first class test above.' : 'Your teacher has not published an assessment for your class yet.'}</p>}
  </div>;
}
