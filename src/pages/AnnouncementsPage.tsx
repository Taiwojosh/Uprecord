import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Pin, 
  Search, 
  Calendar,
  User,
  MoreVertical,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db, type IAnnouncement } from '../db/db';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const schoolId = user?.schoolId;
  const canManage = Boolean(schoolId && (user?.role === 'admin' || user?.isAdmin));
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canManage && searchParams.get('draft') === 'new') {
      setIsAddModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('draft');
      setSearchParams(next, { replace: true });
    }
  }, [canManage, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAddModalOpen(false);
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [isAddModalOpen]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPinned: false,
    authorName: 'Administrator'
  });

  const announcements = useLiveQuery(
    () => schoolId ? db.announcements.where('schoolId').equals(schoolId).toArray() : Promise.resolve([]),
    [schoolId]
  );

  const filteredAnnouncements = announcements?.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdAt.localeCompare(a.createdAt)) || [];

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !schoolId || !formData.title.trim() || !formData.content.trim()) return;

    setIsSubmitting(true);
    try {
      await db.announcements.add({
        ...formData,
        schoolId,
        title: formData.title.trim(),
        content: formData.content.trim(),
        authorName: user?.fullName || 'School administrator',
        createdAt: new Date().toISOString()
      });
      showToast('Draft saved on this device', 'success');
      setIsAddModalOpen(false);
      setFormData({ title: '', content: '', isPinned: false, authorName: 'Administrator' });
    } catch (error) {
      showToast('Failed to post announcement', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!announcementToDelete || !canManage) return;
    try {
      const draft = await db.announcements.get(announcementToDelete);
      if (draft?.schoolId !== schoolId) return;
      await db.announcements.delete(announcementToDelete);
      showToast('Announcement deleted', 'success');
    } catch (error) {
      showToast('Failed to delete announcement', 'error');
    } finally {
      setAnnouncementToDelete(null);
    }
  };

  const togglePin = async (id: number, currentStatus: boolean) => {
    if (!canManage) return;
    try {
      const draft = await db.announcements.get(id);
      if (draft?.schoolId !== schoolId) return;
      await db.announcements.update(id, { isPinned: !currentStatus });
    } catch (error) {
      showToast('Failed to update pin status', 'error');
    }
  };

  if (announcements === undefined) return <Spinner size="lg" />;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1"><h2 className="text-xl font-semibold">Announcement drafts</h2><p className="text-sm text-muted-foreground">Prepare school updates for later sharing.</p></div>
        {(user?.role === 'admin' || user?.isAdmin) && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New draft
          </button>
        )}
      </div>

      <p role="note" className="rounded-xl border border-border bg-surface-strong px-4 py-3 text-sm text-muted-foreground">Drafts are saved in this browser for this school. They are not published or delivered to staff, students or parents.</p>
      <p className="text-sm text-muted-foreground">{announcements.length} saved drafts · {announcements.filter(a => a.isPinned).length} pinned</p>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-card flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            aria-label="Search announcement drafts"
            placeholder="Search drafts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all text-sm font-medium"
          />
        </div>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <EmptyState 
          icon="Bell" 
          message={searchTerm ? "No drafts match your search. Try another word." : "No announcement drafts yet. Create a draft to prepare your next school update."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredAnnouncements.map((announcement) => (
            <motion.div 
              layout
              key={announcement.id}
              className={`bg-white rounded-[2rem] border transition-all p-8 shadow-card flex flex-col md:flex-row gap-6 relative ${
                announcement.isPinned ? 'border-emerald-500' : 'border-slate-200'
              }`}
            >
              {announcement.isPinned && (
                <div className="self-start shrink-0 flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                  <Pin className="w-3.5 h-3.5" />
                  <span className="text-[0.625rem] font-bold uppercase tracking-widest">Pinned</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0 space-y-4 break-words">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">{announcement.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-slate-400">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[0.625rem]">
                      <User className="w-3 h-3" />
                      {announcement.authorName}
                    </div>
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[0.625rem]">
                      <Calendar className="w-3 h-3" />
                      {new Date(announcement.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {announcement.content}
                </div>
              </div>

              {(user?.role === 'admin' || user?.isAdmin) && (
                <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-end md:justify-start">
                  <button 
                    onClick={() => togglePin(announcement.id!, announcement.isPinned)}
                    className={`p-3 rounded-xl transition-all ${
                      announcement.isPinned 
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                        : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                    title={announcement.isPinned ? "Unpin" : "Pin to top"}
                  >
                    <Pin className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setAnnouncementToDelete(announcement.id!)}
                    className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {createPortal(<AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              role="dialog"
              ref={dialogRef}
              aria-modal="true"
              aria-labelledby="announcement-draft-heading"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                    <Bell className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h2 id="announcement-draft-heading" className="text-xl font-bold text-slate-800 tracking-tight">New announcement draft</h2>
                    <p className="text-sm text-slate-500">Saved on this device only</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                    className="p-3 shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Close draft"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddAnnouncement} className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                <div className="space-y-2">
                  <label htmlFor="draft-title" className="text-sm font-semibold">Title</label>
                  <input
                    id="draft-title"
                    autoFocus
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium text-slate-800"
                    placeholder="e.g., School Resumption Date"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="draft-content" className="text-sm font-semibold">Announcement</label>
                  <textarea
                    id="draft-content"
                    required
                    rows={5}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium text-slate-800 resize-none"
                    placeholder="Type your announcement here..."
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <button
                    type="button"
                    aria-label="Pin draft to top"
                    aria-pressed={formData.isPinned}
                    onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                    className={`w-12 h-6 rounded-full relative transition-colors ${formData.isPinned ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isPinned ? 'left-7' : 'left-1'}`} />
                  </button>
                  <span className="text-sm text-slate-600">Pin to top of drafts</span>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-4 text-slate-600 font-bold text-sm bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-3 py-4 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Spinner size="sm" /> : <Plus className="w-5 h-5" />}
                    Save draft
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>, document.body)}

      <ConfirmDialog 
        isOpen={!!announcementToDelete}
        title="Delete draft?"
        message="This removes the saved draft from this browser. It has not been sent to anyone."
        onConfirm={handleDelete}
        onClose={() => setAnnouncementToDelete(null)}
      />
    </div>
  );
};

const StatCard: React.FC<{ icon: any, label: string, value: number, className?: string }> = ({ icon: Icon, label, value, className = "" }) => (
  <div className={`bg-white p-4 md:p-5 rounded-2xl md:rounded-md border border-slate-200 shadow-card flex items-center gap-3 md:gap-5 transition-all hover:border-slate-300 ${className}`}>
    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-md flex items-center justify-center shrink-0 text-slate-700">
      <Icon className="w-5 h-5 md:w-6 md:h-6" />
    </div>
    <div className="space-y-1">
      <p className="text-[0.55rem] md:text-[0.6875rem] font-black text-slate-400 uppercase tracking-wider leading-none">{label}</p>
      <p className="text-lg md:text-2xl font-bold text-slate-800 tracking-tight leading-none">{value}</p>
    </div>
  </div>
);
