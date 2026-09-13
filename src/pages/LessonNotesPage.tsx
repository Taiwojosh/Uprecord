import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Clock, 
  LayoutGrid,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  FileText,
  Heading,
  Bold,
  Italic,
  List,
  ListOrdered,
  RefreshCw,
  Play,
  Eye,
  Edit2,
  BookOpenCheck,
  Youtube,
  AlertTriangle,
  X,
  ImageIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrentSession } from '../hooks/useCurrentSession';
import { useToast } from '../context/ToastContext';
import { db, type ICurriculum, type ILessonNote, type ISubject, type IClass } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Spinner } from '../components/ui/Spinner';
import { useLocation } from 'react-router-dom';
import { FileTree } from '../components/FileTree';
import { useAttendanceRestriction } from '../hooks/useAttendanceRestriction';
import { AttendanceRestrictionBanner } from '../components/AttendanceRestrictionBanner';

const EMPTY_CLASSES_ARRAY: any[] = [];
const EMPTY_SUBJECTS_ARRAY: any[] = [];

// Self-contained embed URL parsers & video viewer components
export function getEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  const vimeoReg = /(?:vimeo)\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
  const vimeoMatch = url.match(vimeoReg);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }
  return null;
}

export const VideoEmbed: React.FC<{ url: string | undefined }> = ({ url }) => {
  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center">
        <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Invalid video URL</p>
        <p className="text-[10px] text-slate-550 font-medium mt-0.5 max-w-[280px] mx-auto truncate">
          {url}
        </p>
      </div>
    );
  }
  return (
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-black group">
      <iframe
        src={embedUrl}
        className="absolute top-0 left-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Instructional Video"
      />
    </div>
  );
};

// SubTopicsEditor component to edit the syllabus list
interface SubTopicsEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  isAdmin: boolean;
  topicIndex: number;
  idPrefix?: string;
}

const SubTopicsEditor: React.FC<SubTopicsEditorProps> = ({
  value,
  onChange,
  isAdmin,
  topicIndex,
  idPrefix = "editor",
}) => {
  const items = React.useMemo(() => {
    const split = value ? value.split("\n") : [];
    if (!isAdmin && split.length === 0) {
      return [""];
    }
    return split;
  }, [value, isAdmin]);

  const handleItemChange = (itemIndex: number, text: string) => {
    const updated = [...items];
    updated[itemIndex] = text;
    onChange(updated.join("\n"));
  };

  const focusElement = (id: string, attempts = 5) => {
    let count = 0;
    const tryFocus = () => {
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      } else if (count < attempts) {
        count++;
        setTimeout(tryFocus, 30);
      }
    };
    tryFocus();
  };

  const handleKeyDown = (
    itemIndex: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const updated = [...items];
      updated.splice(itemIndex + 1, 0, "");
      onChange(updated.join("\n"));

      const nextId = `${idPrefix}-subtopic-${topicIndex}-${itemIndex + 1}`;
      focusElement(nextId);
    } else if (
      e.key === "Backspace" &&
      items[itemIndex] === "" &&
      items.length > 1
    ) {
      e.preventDefault();
      const updated = [...items];
      updated.splice(itemIndex, 1);
      onChange(updated.join("\n"));

      const prevIndex = itemIndex > 0 ? itemIndex - 1 : 0;
      const prevId = `${idPrefix}-subtopic-${topicIndex}-${prevIndex}`;
      focusElement(prevId);
    }
  };

  const handleAddItem = () => {
    const updated = [...items, ""];
    onChange(updated.join("\n"));
    const nextId = `${idPrefix}-subtopic-${topicIndex}-${items.length}`;
    focusElement(nextId);
  };

  const handleRemoveItem = (itemIndex: number) => {
    const updated = [...items];
    updated.splice(itemIndex, 1);
    onChange(updated.join("\n"));
  };

  if (isAdmin) {
    const activeItems = items.filter(Boolean);
    if (activeItems.length === 0) {
      return (
        <p className="text-xs text-slate-400 italic font-bold">
          No sub-topics specified.
        </p>
      );
    }
    return (
      <ul className="space-y-1 my-1">
        {activeItems.map((item, idx) => (
          <li
            key={idx}
            className="text-xs text-slate-500 font-bold italic flex items-start gap-1.5 leading-normal"
          >
            <span className="text-blue-500 text-[10px] select-none pt-0.5">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2 mt-1.5">
      <div className="space-y-2">
        {items.map((item, itemIndex) => {
          const id = `${idPrefix}-subtopic-${topicIndex}-${itemIndex}`;
          return (
            <div key={itemIndex} className="flex items-center gap-2 group/item">
              <span className="text-slate-400 font-bold text-xs select-none">
                •
              </span>
              <input
                id={id}
                type="text"
                value={item}
                onChange={(e) => handleItemChange(itemIndex, e.target.value)}
                onKeyDown={(e) => handleKeyDown(itemIndex, e)}
                placeholder="Enter sub-topic... (Press Enter to add next)"
                className="flex-1 bg-slate-50 border border-slate-100/70 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-200 font-semibold italic text-slate-600 placeholder:text-slate-330 text-xs px-3 py-2 rounded-xl"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(itemIndex)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all duration-200 focus:opacity-100"
                  title="Remove sub-topic"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Standard template for lesson notes
const TEMPLATE_NOTE = `# Weekly Lesson Topic

## Learning Objectives
> At the end of this lesson, students should be able to:
1. Define the core concepts discussed in this lesson.
2. Explain the fundamental principles with examples.
3. Apply these concepts to solve basic problems.

---

## Introduction & Context
Provide an inviting explanation of the background of this lesson. Connect it to previous weeks' topics to maintain academic continuity.

---

## Lesson Content / Body
Write the detailed lesson materials here. Use subheadings and lists to break up dense paragraphs.

### Key Concept 1
Explain the first important concept. Give concrete examples and use bold weights to emphasize keywords.

### Key Concept 2
Detail the second concept. Use bullet lists to break down components or features.
- Point A: Description of point A.
- Point B: Description of point B.

---

## Summary & Classroom Assessment
1. What are the core differences between the concepts introduced today?
2. Mention two real-life applications.
`;

const renderMarkdown = (text: string = "") => {
  if (!text) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-slate-100 border-dashed rounded-[2rem] text-center space-y-4">
        <FileText className="w-10 h-10 text-slate-300 animate-pulse" />
        <p className="text-slate-400 italic text-sm font-semibold">No notes written for this week yet.</p>
      </div>
    );
  }

  const lines = text.split('\n');
  return (
    <div className="space-y-4 text-slate-705 leading-relaxed max-w-none">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Check for headings
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="text-sm font-black text-slate-800 uppercase italic mt-5 mb-1.5">{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} className="text-xs font-black italic uppercase tracking-tight text-slate-900 mt-7 mb-2.5">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={idx} className="text-lg font-black italic uppercase tracking-tighter text-slate-950 mt-8 mb-4 pb-2 border-b border-slate-103">{trimmed.slice(2)}</h2>;
        }

        // Check for separator
        if (trimmed === '---') {
          return <hr key={idx} className="my-6 border-t-2 border-slate-100 border-dashed" />;
        }

        // Check for bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <li key={idx} className="ml-6 list-disc font-semibold text-slate-600 mb-1">
              {parseInlineMarkdown(trimmed.slice(2))}
            </li>
          );
        }

        // Check for numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <li key={idx} className="ml-6 list-decimal font-semibold text-slate-600 mb-1">
              {parseInlineMarkdown(numMatch[2])}
            </li>
          );
        }

        // Check for bold block / objective highlights
        if (trimmed.startsWith('>')) {
          return (
            <blockquote key={idx} className="p-4 bg-blue-50/50 border-l-4 border-blue-500 rounded-r-2xl italic font-bold text-blue-700 my-4 text-[11px] tracking-wide leading-relaxed">
              {parseInlineMarkdown(trimmed.slice(1).trim())}
            </blockquote>
          );
        }

        // Check for images ![alt](url)
        const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imageMatch) {
          return (
            <div key={idx} className="my-6">
              <img src={imageMatch[2]} alt={imageMatch[1]} className="max-w-full h-auto rounded-2xl shadow-sm border border-slate-100" referrerPolicy="no-referrer" />
              {imageMatch[1] && <p className="text-center text-[10px] text-slate-400 font-bold mt-2">{imageMatch[1]}</p>}
            </div>
          );
        }

        return <p key={idx} className="text-xs font-semibold text-slate-600 leading-relaxed font-sans">{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
};

const parseInlineMarkdown = (text: string) => {
  return (
    <span dangerouslySetInnerHTML={{
      __html: text
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto inline-block rounded-xl shadow-sm border border-slate-100" referrerpolicy="no-referrer" />')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-red-600 font-mono text-xs">$1</code>')
    }} />
  );
};

interface LessonNotesPageProps {
  defaultTab?: 'sow' | 'note';
}

export const LessonNotesPage: React.FC<LessonNotesPageProps> = ({ defaultTab = 'note' }) => {
  const { user } = useAuth();
  const { session, term, termLabel } = useCurrentSession();
  const { showToast } = useToast();
  const location = useLocation();
  const routeState = location.state as { subjectId?: number; classId?: number; defaultTab?: 'sow' | 'note' } | null;

  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';

  const { isRestricted: isAttendanceRestricted } = useAttendanceRestriction();

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(routeState?.subjectId || null);
  // Get student details if student
  const studentData = useLiveQuery(async () => {
    if (!user || user.role !== 'student') return null;
    if (user.studentId) {
      return await db.students.get(user.studentId);
    }
    if (user.email) {
      const allStudents = await db.students.toArray();
      const byEmail = allStudents.find(s => s.email?.toLowerCase() === user.email.toLowerCase() || s.parentEmail?.toLowerCase() === user.email.toLowerCase());
      return byEmail || null;
    }
    return null;
  }, [user]);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(routeState?.classId || null);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');
  const [overlayMode, setOverlayMode] = useState<'view' | 'edit' | null>(null);
  const [overlaySubTab, setOverlaySubTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'synced' | 'error'>('idle');
  const [loadedKey, setLoadedKey] = useState<string>('');
  const [showRibbon, setShowRibbon] = useState<boolean>(true);

  // Active combined tab state (SOW or NOTES) defaulting to route Prop
  const [activeTab, setActiveTab ] = useState<'sow' | 'note'>(routeState?.defaultTab || defaultTab);

  // Sync activeTab whenever defaultTab prop changes or routeState defaultTab changes!
  useEffect(() => {
    setActiveTab(routeState?.defaultTab || defaultTab);
  }, [defaultTab, routeState?.defaultTab]);

  // Toggle body class when overlay is active to hide floating quick actions or format properly
  useEffect(() => {
    if (overlayMode) {
      document.body.classList.add('editor-overlay-active');
    } else {
      document.body.classList.remove('editor-overlay-active');
    }
    return () => {
      document.body.classList.remove('editor-overlay-active');
    };
  }, [overlayMode]);

  // Lesson Note Weeks state containing BOTH Scheme details AND Notes markdown content
  const [noteWeeks, setNoteWeeks] = useState<{
    week: number;
    title: string;
    description?: string;
    content: string;
    videoUrl?: string;
    updatedAt?: string;
    completed?: boolean;
  }[]>([]);

  // DB queries: classes, subjects, curriculum, and existing notes
  const classes = useLiveQuery(() => db.classes.toArray()) || EMPTY_CLASSES_ARRAY;
  const subjects = useLiveQuery(() => db.subjects.toArray()) || EMPTY_SUBJECTS_ARRAY;

  const curriculum = useLiveQuery(async () => {
    if (!selectedSubjectId || !selectedClassId || !session) return null;
    const res = await db.curriculum
      .where('[subjectId+classId+term+session]')
      .equals([selectedSubjectId, selectedClassId, term, session])
      .first();
    return res || { notFound: true };
  }, [selectedSubjectId, selectedClassId, term, session]);

  const existingNotes = useLiveQuery(async () => {
    if (!selectedSubjectId || !selectedClassId || !session) return null;
    const res = await db.lessonNotes
      .where('[subjectId+classId+term+session]')
      .equals([selectedSubjectId, selectedClassId, term, session])
      .first();
    return res || { notFound: true };
  }, [selectedSubjectId, selectedClassId, term, session]);

  // Base pool of subjects for teacher vs admin/student
  const teacherSubjects = useMemo(() => {
    if (isTeacher && user?.id) {
      const teacherIdNum = Number(user.id);
      return subjects.filter(s => s.teacherId === teacherIdNum || s.assistantTeacherIds?.includes(teacherIdNum));
    }
    return subjects;
  }, [subjects, isTeacher, user]);

  // Interactive selectors
  const filteredClasses = useMemo(() => {
    if (isStudent) {
      if (studentData?.classId) return classes.filter(c => c.id === studentData.classId);
      return EMPTY_CLASSES_ARRAY;
    }
    if (isTeacher && user?.id) {
      const teacherIdNum = Number(user.id);
      return classes.filter(c => 
        c.teacherId === teacherIdNum || 
        subjects.some(s => {
          const isAssigned = s.teacherId === teacherIdNum || s.assistantTeacherIds?.includes(teacherIdNum);
          if (!isAssigned) return false;
          const isDirectClass = s.classId === c.id || s.classIds?.includes(c.id!);
          const isGeneral = (!s.classId && (!s.classIds || s.classIds.length === 0));
          const isCoreMatch = s.isCore && (!s.coreLevels || s.coreLevels.includes(c.level as any));
          const isDeptMatch = s.departmentIds?.length > 0 && c.departmentId ? s.departmentIds.includes(c.departmentId) : false;
          return isDirectClass || isGeneral || isCoreMatch || isDeptMatch;
        })
      );
    }
    return classes;
  }, [classes, isStudent, isTeacher, user, subjects, studentData]);

  const filteredSubjects = useMemo(() => {
    if (!selectedClassId) return EMPTY_SUBJECTS_ARRAY;
    const targetClass = classes.find(c => c.id === selectedClassId);
    
    return teacherSubjects.filter(s => {
      const isDirectClass = s.classId === selectedClassId || s.classIds?.includes(selectedClassId);
      const isGeneral = (!s.classId && (!s.classIds || s.classIds.length === 0));
      const isCoreMatch = s.isCore && (!s.coreLevels || (targetClass && s.coreLevels.includes(targetClass.level as any)));
      const isDeptMatch = s.departmentIds?.length > 0 && targetClass?.departmentId ? s.departmentIds.includes(targetClass.departmentId) : false;
      
      return isDirectClass || isGeneral || isCoreMatch || isDeptMatch;
    });
  }, [teacherSubjects, selectedClassId, classes]);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const selectedSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId]);

  // Set default selectors safely with equality checks
  useEffect(() => {
    if (filteredClasses.length > 0) {
      if (!selectedClassId || !filteredClasses.some(c => c.id === selectedClassId)) {
        const nextId = filteredClasses[0].id || null;
        if (selectedClassId !== nextId) {
          setSelectedClassId(nextId);
        }
      }
    }
  }, [filteredClasses, selectedClassId]);

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!selectedSubjectId || !filteredSubjects.some(s => s.id === selectedSubjectId)) {
        const nextId = filteredSubjects[0].id || null;
        if (selectedSubjectId !== nextId) {
          setSelectedSubjectId(nextId);
        }
      }
    } else {
      if (selectedSubjectId !== null) {
        setSelectedSubjectId(null);
      }
    }
  }, [filteredSubjects, selectedSubjectId]);

  // Open modal overlay with selected details
  const handleSelectWeekAndOpenModal = async (cId: number, sId: number, wk: number) => {
    setSelectedClassId(cId);
    setSelectedSubjectId(sId);
    setActiveWeek(wk);
    setOverlayMode(isStudent || isAdmin ? 'view' : 'edit');
  };

  // Sync / Merge data when curriculum or existing notes load or change
  useEffect(() => {
    if (!selectedSubjectId || !selectedClassId || !session) return;
    const currentKey = `${selectedSubjectId}-${selectedClassId}-${term}-${session}`;
    
    if (currentKey !== loadedKey) {
      const draftKey = `draft_lesson_notes_${selectedSubjectId}_${selectedClassId}_${term}_${session}`;
      let draftWeeks = null;
      try { const draftData = localStorage.getItem(draftKey); if (draftData) draftWeeks = JSON.parse(draftData); } catch (e) {}
      if (curriculum && !('notFound' in curriculum)) {
        // Sync topics and SOW video links into lesson notes
        const matchedWeeks = existingNotes && !('notFound' in existingNotes) ? existingNotes.weeks : null;
        const merged = curriculum.topics.map(t => {
          const matchedNote = matchedWeeks?.find(w => w.week === t.week);
          return {
            week: t.week,
            title: t.title || `Week ${t.week} Topic`,
            description: t.description || "",
            content: matchedNote?.content || "",
            videoUrl: matchedNote?.videoUrl || t.videoUrl || "",
            updatedAt: matchedNote?.updatedAt || new Date().toISOString(),
            completed: !!t.completed
          };
        });
        setNoteWeeks(draftWeeks || merged);
        setLoadedKey(currentKey);
        setAutosaveStatus('idle');
      } else if (curriculum && 'notFound' in curriculum) {
        // No scheme of work setup yet, initialize a skeleton of 12 weeks
        const matchedWeeks = existingNotes && !('notFound' in existingNotes) ? existingNotes.weeks : null;
        const skeleton = Array.from({ length: 12 }, (_, i) => {
          const matchedNote = matchedWeeks?.find(w => w.week === (i + 1));
          return {
            week: i + 1,
            title: matchedNote?.title || `Week ${i + 1} Topic`,
            description: matchedNote?.description || "",
            content: matchedNote?.content || "",
            videoUrl: matchedNote?.videoUrl || "",
            updatedAt: matchedNote?.updatedAt || new Date().toISOString(),
            completed: false
          };
        });
        setNoteWeeks(draftWeeks || skeleton);
        setLoadedKey(currentKey);
        setAutosaveStatus('idle');
      }
    }
  }, [curriculum, existingNotes, selectedSubjectId, selectedClassId, term, session, loadedKey]);

  // Debounced Autosave effect for Lesson Notes and Scheme of Work concurrently!
  useEffect(() => {
    if (autosaveStatus !== 'dirty') return;

    if (selectedSubjectId && selectedClassId && session && noteWeeks.length > 0) {
      const draftKey = `draft_lesson_notes_${selectedSubjectId}_${selectedClassId}_${term}_${session}`;
      localStorage.setItem(draftKey, JSON.stringify(noteWeeks));
    }

    if (isStudent || isAdmin || isAttendanceRestricted) return;

    const timeoutId = setTimeout(async () => {
      if (!selectedSubjectId || !selectedClassId || !session || noteWeeks.length === 0) return;
      
      // Strict validation: Note content cannot be saved without Topic Title and Scope
      const invalidWeeks = noteWeeks.filter(w => {
        const hasContent = w.content && w.content.trim().length > 15;
        const isMissingTopic = !w.title || w.title.trim() === `Week ${w.week} Topic` || w.title.trim() === '';
        const isMissingScope = !w.description || w.description.trim() === '';
        return hasContent && (isMissingTopic || isMissingScope);
      });

      if (invalidWeeks.length > 0) {
        setAutosaveStatus('error');
        return;
      }
      
      setAutosaveStatus('saving');
      try {
        // 1. Save Lesson Notes
        const notesData: Omit<ILessonNote, 'id'> = {
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          term: term as 1 | 2 | 3,
          session,
          weeks: noteWeeks.map(w => ({
            week: w.week,
            title: w.title,
            description: w.description || "",
            content: w.content,
            videoUrl: w.videoUrl || "",
            updatedAt: w.updatedAt || new Date().toISOString()
          })),
          updatedAt: new Date().toISOString()
        };

        const existingRecord = await db.lessonNotes
          .where('[subjectId+classId+term+session]')
          .equals([selectedSubjectId, selectedClassId, term, session])
          .first();

        if (existingRecord?.id) {
          await db.lessonNotes.update(existingRecord.id, notesData);
        } else {
          await db.lessonNotes.add(notesData);
        }

        // 2. Concurrently Save Curriculum SOW (Scheme of Work) topics
        const existingCurr = await db.curriculum
          .where('[subjectId+classId+term+session]')
          .equals([selectedSubjectId, selectedClassId, term, session])
          .first();

        const curriculumTopics = noteWeeks.map(w => ({
          week: w.week,
          title: w.title || `Week ${w.week} Topic`,
          description: w.description || "",
          completed: !!w.completed,
          videoUrl: w.videoUrl || ""
        }));

        const currData: Omit<ICurriculum, 'id'> = {
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          term: term as 1 | 2 | 3,
          session,
          topics: curriculumTopics,
          updatedAt: new Date().toISOString()
        };

        if (existingCurr?.id) {
          await db.curriculum.update(existingCurr.id, currData);
        } else {
          await db.curriculum.add(currData);
        }

        setAutosaveStatus('synced');
        localStorage.removeItem(`draft_lesson_notes_${selectedSubjectId}_${selectedClassId}_${term}_${session}`);
      } catch (error) {
        console.error('Autosave failed:', error);
        setAutosaveStatus('error');
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timeoutId);
  }, [noteWeeks, autosaveStatus, selectedSubjectId, selectedClassId, term, session, isStudent, isAdmin, isAttendanceRestricted]);

  // Handle manual saving
  const handleManualSave = async () => {
    if (isAttendanceRestricted) {
      showToast('You must complete pending attendance checks first.', 'error');
      return;
    }
    if (!selectedSubjectId || !selectedClassId || !session || noteWeeks.length === 0) return;

    // Strict validation: Note content cannot be saved without Topic Title and Scope
    const invalidWeeks = noteWeeks.filter(w => {
      const hasContent = w.content && w.content.trim().length > 15;
      const isMissingTopic = !w.title || w.title.trim() === `Week ${w.week} Topic` || w.title.trim() === '';
      const isMissingScope = !w.description || w.description.trim() === '';
      return hasContent && (isMissingTopic || isMissingScope);
    });

    if (invalidWeeks.length > 0) {
      const invalidWeekNums = invalidWeeks.map(w => w.week).join(', ');
      showToast(`Please set 'Topic Title' and 'Scope & Syllabus' for Week ${invalidWeekNums} before saving lesson notes.`, 'error');
      setAutosaveStatus('error');
      return;
    }
    
    setIsSaving(true);
    setAutosaveStatus('saving');
    try {
      // 1. Save Lesson Notes
      const notesData: Omit<ILessonNote, 'id'> = {
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        term: term as 1 | 2 | 3,
        session,
        weeks: noteWeeks.map(w => ({
          week: w.week,
          title: w.title,
          description: w.description || "",
          content: w.content,
          videoUrl: w.videoUrl || "",
          updatedAt: w.updatedAt || new Date().toISOString()
        })),
        updatedAt: new Date().toISOString()
      };

      const existingRecord = await db.lessonNotes
        .where('[subjectId+classId+term+session]')
        .equals([selectedSubjectId, selectedClassId, term, session])
        .first();

      if (existingRecord?.id) {
        await db.lessonNotes.update(existingRecord.id, notesData);
      } else {
        await db.lessonNotes.add(notesData);
      }

      // 2. Concurrently Save Curriculum SOW (Scheme of Work) topics
      const existingCurr = await db.curriculum
        .where('[subjectId+classId+term+session]')
        .equals([selectedSubjectId, selectedClassId, term, session])
        .first();

      const curriculumTopics = noteWeeks.map(w => ({
        week: w.week,
        title: w.title || `Week ${w.week} Topic`,
        description: w.description || "",
        completed: !!w.completed,
        videoUrl: w.videoUrl || ""
      }));

      const currData: Omit<ICurriculum, 'id'> = {
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        term: term as 1 | 2 | 3,
        session,
        topics: curriculumTopics,
        updatedAt: new Date().toISOString()
      };

      if (existingCurr?.id) {
        await db.curriculum.update(existingCurr.id, currData);
      } else {
        await db.curriculum.add(currData);
      }

      await db.announcements.add({
        schoolId: user?.schoolId || 'school-1',
        title: `Lesson Notes Updated: ${selectedClass?.className || 'Class'} - ${selectedSubject?.subjectName || 'Subject'}`,
        content: `New class note/content has been updated for ${selectedClass?.className || 'Class'} in ${selectedSubject?.subjectName || 'Subject'} by ${user?.fullName || 'Teacher'}.`,
        isPinned: false,
        authorName: user?.fullName || user?.role || 'System',
        createdAt: new Date().toISOString()
      });

      showToast('Scheme and Lesson notes saved successfully', 'success');
      setAutosaveStatus('synced');
        localStorage.removeItem(`draft_lesson_notes_${selectedSubjectId}_${selectedClassId}_${term}_${session}`);
    } catch (error) {
      showToast('Failed to save data', 'error');
      setAutosaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Modify active week values
  const handleUpdateActiveWeekData = (field: 'title' | 'description' | 'content' | 'videoUrl', value: string) => {
    if (isStudent || isAdmin) return;
    const updated = [...noteWeeks];
    const index = updated.findIndex(w => w.week === activeWeek);
    if (index !== -1) {
      updated[index] = { ...updated[index], [field]: value, updatedAt: new Date().toISOString() };
      setNoteWeeks(updated);
      setAutosaveStatus('dirty');
    }
  };

  const handleUpdateActiveWeekCompleted = (done: boolean) => {
    if (isStudent || isAdmin) return;
    const updated = [...noteWeeks];
    const index = updated.findIndex(w => w.week === activeWeek);
    if (index !== -1) {
      updated[index] = { ...updated[index], completed: done, updatedAt: new Date().toISOString() };
      setNoteWeeks(updated);
      setAutosaveStatus('dirty');
    }
  };

  // Insert formatting markdown in editor textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleInsertFormat = (formatStr: string, placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = formatStr.includes('$')
      ? formatStr.replace('$', selectedText || placeholder)
      : formatStr + (selectedText || placeholder);

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateActiveWeekData('content', newValue);

    setTimeout(() => {
      textarea.focus();
      const newSelStart = start + replacement.indexOf(selectedText || placeholder);
      const newSelEnd = newSelStart + (selectedText || placeholder).length;
      textarea.setSelectionRange(newSelStart, newSelEnd);
    }, 50);
  };

  const activeWeekData = useMemo(() => {
    return noteWeeks.find(w => w.week === activeWeek);
  }, [noteWeeks, activeWeek]);

  const hasAnyNotes = useMemo(() => {
    return noteWeeks.some(w => w.content && w.content.trim().length > 15);
  }, [noteWeeks]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-fade-in font-sans">
      
      {/* Attendance Guard Block */}
      {isAttendanceRestricted && <AttendanceRestrictionBanner />}

      {/* Unified Main Navigation Tabs coming before PageHeader */}
      <div className="flex bg-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm gap-1 sm:gap-2 w-fit">
        <button
          onClick={() => setActiveTab('sow')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 ${
            activeTab === 'sow'
              ? 'bg-blue-50 text-blue-600 border border-blue-100/50'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Scheme of Work
        </button>
        <button
          onClick={() => setActiveTab('note')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 ${
            activeTab === 'note'
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Lesson Notes
        </button>
      </div>

      {/* Main Title Block */}
      <PageHeader 
        title={activeTab === 'sow' ? "Scheme of Work & Curriculum Planner" : "Weekly Lesson Notes"} 
        subtitle={
          isStudent 
            ? (activeTab === 'sow' ? "Track weekly curriculum progress, topics and sub-topics" : "Study notes and embedded learning video lectures")
            : isAdmin 
              ? (activeTab === 'sow' ? "Reviewing registered school curriculum layouts and terms" : "Reviewing curated instructional lessons and materials")
              : (activeTab === 'sow' ? "Design structured weekly topics, syllabus and curriculum checkmarkers" : "Develop full step-by-step notes and embed video materials")
        } 
      />

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Navigator Panel Panel */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest pl-1 mb-3">Academic Scope</h3>
            <div className="space-y-4">
              
              {/* Class Selection */}
              <div className="space-y-1.5Col">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Target Class Name</label>
                <select
                  value={selectedClassId || ""}
                  onChange={(e) => {
                    const cId = Number(e.target.value) || null;
                    setSelectedClassId(cId);
                    setSelectedSubjectId(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-100 focus:bg-white text-xs font-black uppercase tracking-tight py-3 px-4 rounded-2xl outline-none"
                >
                  <option value="">Select Class...</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selection */}
              <div className="space-y-1.5 select-wrapper">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Target Subject Name</label>
                <select
                  value={selectedSubjectId || ""}
                  onChange={(e) => setSelectedSubjectId(Number(e.target.value) || null)}
                  disabled={!selectedClassId}
                  className="w-full bg-slate-50 border border-slate-100 focus:bg-white text-xs font-black uppercase tracking-tight py-3 px-4 rounded-2xl outline-none disabled:opacity-50"
                >
                  <option value="">Select Subject...</option>
                  {filteredSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Active Weeks Syllabus Tree */}
          {selectedClassId && selectedSubjectId && (
            <div className="pt-4 border-t border-slate-50">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-4">Select Syllabus Week</h4>
              <div className="max-h-[380px] overflow-y-auto pr-1">
                <FileTree
                  classes={filteredClasses}
                  subjects={teacherSubjects}
                  selectedClassId={selectedClassId}
                  selectedSubjectId={selectedSubjectId}
                  activeWeek={activeWeek}
                  onSelect={(cId, sId, wk) => {
                    setSelectedClassId(cId);
                    setSelectedSubjectId(sId);
                    setActiveWeek(wk);
                    setOverlayMode(isStudent || isAdmin ? 'view' : 'edit');
                  }}
                  userRole={user?.role as 'admin' | 'teacher' | 'student'}
                  currentTerm={term as 1 | 2 | 3}
                  currentSession={session}
                  borderless={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Details Canvas Panel */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {!selectedClassId || !selectedSubjectId ? (
            <div className="bg-white p-16 lg:p-24 rounded-[3.5rem] border border-dashed border-slate-200/60 text-center flex items-center justify-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                  <FileText size={40} className="animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase text-gray-900 tracking-tight">Select Subject & Class</h3>
                  <p className="text-gray-400 text-sm font-semibold">
                    Choose a class and offered subject from the Explorer tree on the left or selectors above to access and curate step-by-step instructional lesson notes.
                  </p>
                </div>
              </div>
            </div>
          ) : curriculum === undefined ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3.5rem] border border-slate-50/65">
              <Spinner size="lg" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[0.625rem] mt-4">Loading Scheme & Lesson Notes...</p>
            </div>
          ) : (
            <>
              {/* Tab 1: Scheme of Work Card */}
              {activeTab === 'sow' && (
                <div className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-fade-in">
                  
                  {/* Header details */}
                  <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
                          {selectedClass?.className} • {selectedSubject?.subjectName}
                        </span>
                        <span className="text-slate-500 text-[10px] font-bold font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          Week {activeWeek} SOW
                        </span>
                      </div>
                      <h2 className="text-lg font-black italic uppercase text-slate-950 tracking-tight mt-1 leading-tight">
                        {activeWeekData?.title || 'No Topic Set'}
                      </h2>
                    </div>

                    {/* Checkmark Status control widget */}
                    <div className="flex items-center gap-2.5">
                      {isStudent || isAdmin ? (
                        activeWeekData?.completed ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100/50 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                            <CheckCircle2 size={11} /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-100/50 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                            <Clock size={11} /> Pending SOW
                          </span>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateActiveWeekCompleted(!activeWeekData?.completed)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            activeWeekData?.completed
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CheckCircle2 size={12} className={activeWeekData?.completed ? 'text-emerald-500' : 'text-slate-400'} />
                          <span>{activeWeekData?.completed ? 'SOW Done' : 'Mark Done'}</span>
                        </button>
                      )}

                      {!isStudent && !isAdmin && (
                        <button
                          onClick={() => {
                            setOverlayMode('edit');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl uppercase tracking-wider text-[10px] font-black transition-all flex items-center gap-1 shadow-md shadow-blue-100"
                        >
                          <Edit2 size={11} />
                          Edit Week
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scope description text block */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Scope & Detail Syllabus Items (Sub-Topics)</h4>
                    <div className="p-6 bg-slate-50/50 border border-slate-100/40 rounded-[2rem]">
                      {activeWeekData?.description ? (
                        <ul className="space-y-4">
                          {activeWeekData.description.split('\n').filter(Boolean).map((sub, i) => (
                            <li key={i} className="text-xs font-semibold text-slate-655 italic flex items-start gap-2.5 leading-normal">
                              <span className="text-blue-500 text-[10px] select-none pt-0.5">•</span>
                              <span>{sub}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic font-semibold">No syllabus elements listed for this week's chapter yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Syllabus instructional video url inline box */}
                  {activeWeekData?.videoUrl && (
                    <div className="border-t border-slate-100 pt-8 space-y-4">
                      <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <Youtube className="w-4 h-4 text-rose-500" />
                        Instructional Video Lecture Previews
                      </h4>
                      <VideoEmbed url={activeWeekData.videoUrl} />
                    </div>
                  )}

                </div>
              )}

              {/* Tab 2: Detailed Lesson Notes Card */}
              {activeTab === 'note' && (
                <div className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-fade-in">
                  
                  {/* Notes Header Details */}
                  <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
                          {selectedClass?.className} • {selectedSubject?.subjectName}
                        </span>
                        <span className="text-slate-500 text-[10px] font-bold font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                          Week {activeWeek} Notebook
                        </span>
                      </div>
                      <h3 className="text-lg font-black italic uppercase text-slate-800 tracking-tight mt-1 leading-tight">
                        {activeWeekData?.title || 'No Topic Set'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isStudent && !isAdmin && (
                        <button
                          onClick={() => {
                            setOverlayMode('edit');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl uppercase tracking-wider text-[10px] font-black transition-all flex items-center gap-1.5 shadow-md shadow-indigo-100"
                        >
                          <Edit2 size={11} />
                          Edit Note
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Render compiled notebook layout */}
                  <div className="prose max-w-none">
                    {renderMarkdown(activeWeekData?.content)}
                  </div>

                  {/* Render notes video URL */}
                  {activeWeekData?.videoUrl && (
                    <div className="border-t border-slate-100 pt-8 space-y-4">
                      <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <Youtube className="w-4 h-4 text-rose-500" />
                        Accompanying Video Lecture Tutorial
                      </h4>
                      <VideoEmbed url={activeWeekData.videoUrl} />
                    </div>
                  )}

                </div>
              )}

            </>
          )}
        </div>

      </div>

      {/* Note & SOW Editor Overlay Modal for Desktop & Large Tablet */}
      {overlayMode && (
        <div 
          id="notes-curation-overlay"
          className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden animate-slide-up"
        >
          {/* Modal header details */}
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    {selectedClass?.className} • {selectedSubject?.subjectName}
                  </span>
                  <span className="text-slate-450 text-xs font-bold font-mono bg-slate-200/50 px-1.5 py-0.5 rounded">
                    Week {activeWeek}
                  </span>

                  {/* Autosaving metadata tag status updates */}
                  {overlayMode === 'edit' && (
                    <div className="shrink-0 text-[9px] font-bold select-none">
                      {autosaveStatus === 'saving' && (
                        <span className="flex items-center gap-1 text-blue-500 bg-blue-50/75 px-1.5 py-0.5 rounded-md border border-blue-105/10">
                          <span className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
                          Autosaving
                        </span>
                      )}
                      {autosaveStatus === 'synced' && (
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50/75 px-1.5 py-0.5 rounded-md border border-emerald-105/10">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                          Synced
                        </span>
                      )}
                      {autosaveStatus === 'dirty' && (
                        <span className="flex items-center gap-1 text-amber-500 bg-amber-50/75 px-1.5 py-0.5 rounded-md border border-amber-105/10">
                          <span className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
                          Pending
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* Close controls inside indicator header on mobile */}
                <div className="sm:hidden flex items-center gap-1.5">
                  {overlayMode === 'edit' && (
                    <button
                      type="button"
                      onClick={() => setOverlaySubTab(overlaySubTab === 'edit' ? 'preview' : 'edit')}
                      className={`p-1.5 rounded-lg transition-all ${
                        overlaySubTab === 'preview'
                          ? 'bg-indigo-55 text-indigo-600 bg-indigo-50'
                          : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200/60'
                      }`}
                      title={overlaySubTab === 'edit' ? "Switch to Preview" : "Switch to Editor"}
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setOverlayMode(null)}
                    className="p-1 px-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-all"
                    title="Close overlay"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight mt-0.5 truncate">
                {activeWeekData?.title || 'No Topic Set'}
              </h3>
            </div>

              {/* Close controls (desktop view only) */}
              <div className="hidden sm:flex items-center gap-1.5">
                {overlayMode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => setOverlaySubTab(overlaySubTab === 'edit' ? 'preview' : 'edit')}
                    className={`p-2 rounded-xl transition-all ${
                      overlaySubTab === 'preview'
                        ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                        : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                    title={overlaySubTab === 'edit' ? "Switch to Preview" : "Switch to Editor"}
                  >
                    <Eye size={18} />
                  </button>
                )}
                <button
                  onClick={() => setOverlayMode(null)}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                  title="Close overlay"
                >
                  <X size={18} />
                </button>
              </div>
          </div>

          {/* Large Split Editing Space */}
          {overlayMode === 'view' ? (
            <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full space-y-8">
              <div className="prose max-w-none">
                {renderMarkdown(activeWeekData?.content)}
              </div>
              {activeWeekData?.videoUrl && (
                <div className="border-t border-slate-100 pt-8 space-y-4">
                  <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-rose-500" />
                    Lecture Video Resource
                  </h4>
                  <VideoEmbed url={activeWeekData.videoUrl} />
                </div>
              )}
            </div>
          ) : (
            /* Interactive Workspace depending on overlaySubTab selection */
            <div className="flex-1 min-h-0 flex flex-col bg-white">
              {overlaySubTab === 'edit' ? (
                /* Left Pane: Interactive Editor Inputs */
                <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden max-w-4xl mx-auto w-full border-x border-slate-101">
                  
                  {/* Editor Local Tabs */}
                  <div className="bg-slate-50 border-b border-slate-100 px-5 py-2 flex items-center gap-2 justify-between shrink-0">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab('sow')}
                        className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          activeTab === 'sow'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <BookOpen size={10} />
                        Scheme of Work
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('note')}
                        className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          activeTab === 'note'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <FileText size={10} />
                        Lesson Notes
                      </button>
                    </div>

                    {/* Completed toggle checkbox inside editorial area */}
                    <div className="flex items-center gap-1.5">
                      {activeTab === 'note' && (
                        <button
                          type="button"
                          onClick={() => setShowRibbon(!showRibbon)}
                          className={`flex items-center justify-center w-6 h-6 rounded-md transition-all border ${
                            showRibbon
                              ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100/80'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-250'
                          }`}
                          title={showRibbon ? 'Hide rich markdown formatting ribbon' : 'Show rich markdown formatting ribbon'}
                        >
                          <ChevronUp size={12} className={`transition-transform duration-350 shrink-0 ${showRibbon ? 'rotate-0' : 'rotate-180'}`} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleUpdateActiveWeekCompleted(!activeWeekData?.completed)}
                        className={`flex items-center justify-center transition-all border rounded-md ${
                          activeWeekData?.completed
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-slate-150 text-slate-500 border-slate-200 hover:bg-slate-200'
                        } w-6 h-6 p-0 sm:w-auto sm:h-auto sm:px-2.5 sm:py-0.5 sm:gap-1 text-[8px] font-black uppercase tracking-wider`}
                        title={activeWeekData?.completed ? 'Mark as Pending' : 'Mark as Done'}
                      >
                        <CheckCircle2 size={11} className={activeWeekData?.completed ? 'text-emerald-500' : 'text-slate-400'} />
                        <span className="hidden sm:inline">{activeWeekData?.completed ? 'Done' : 'Pending'}</span>
                      </button>
                    </div>
                  </div>

                  {/* SOW Tab Inputs */}
                  {activeTab === 'sow' && (
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                          Topic Title Of Active Week
                        </label>
                        <input
                          type="text"
                          value={activeWeekData?.title || ''}
                          onChange={(e) => handleUpdateActiveWeekData('title', e.target.value)}
                          placeholder="Topic title... (e.g. Simultaneous Algebraic Equations)"
                          className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none px-4 py-3 rounded-2xl text-xs font-black uppercase italic text-slate-700 transition-all placeholder:text-slate-330"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                          Scope & Syllabus Sub-Topics (Separate Bullet Lines)
                        </label>
                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                          <SubTopicsEditor
                            value={activeWeekData?.description || ''}
                            onChange={(val) => handleUpdateActiveWeekData('description', val)}
                            isAdmin={isAdmin}
                            topicIndex={activeWeek - 1}
                            idPrefix="combined-editor"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                          <Youtube className="w-3.5 h-3.5 text-rose-500" />
                          Instructional Video Link reference
                        </label>
                        <input 
                          type="url"
                          value={activeWeekData?.videoUrl || ''}
                          onChange={(e) => handleUpdateActiveWeekData('videoUrl', e.target.value)}
                          placeholder="YouTube video link... e.g. https://www.youtube.com/watch?v=..."
                          className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-200 font-semibold text-slate-600 placeholder:text-slate-300 text-[11px] px-3.5 py-2.5 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes Tab Inputs */}
                  {activeTab === 'note' && (
                    <>
                      {/* Rich text formatting bar helper */}
                      {showRibbon && (
                        <div className="bg-slate-50 border-b border-slate-100 py-2.5 px-5 flex items-center justify-between gap-4 shrink-0 overflow-x-auto">
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleInsertFormat('# $\n', 'Main Title')}
                              className="p-1.5 hover:bg-slate-200 rounded text-[10px] font-extrabold text-slate-600 flex items-center gap-1 transition-all"
                              title="Heading 1"
                            >
                              <Heading size={11} /> 1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertFormat('## $\n', 'Section Title')}
                              className="p-1.5 hover:bg-slate-200 rounded text-[10px] font-extrabold text-slate-600 flex items-center gap-1 transition-all"
                              title="Heading 2"
                            >
                              <Heading size={11} /> 2
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertFormat('### $\n', 'Subsection')}
                              className="p-1.5 hover:bg-slate-200 rounded text-[10px] font-extrabold text-slate-600 flex items-center gap-1 transition-all"
                              title="Heading 3"
                            >
                              <Heading size={11} /> 3
                            </button>
                            <span className="w-px h-4 bg-slate-200 mx-1 block" />
                            <button
                              type="button"
                              onClick={() => handleInsertFormat('**$**', 'Bold Highlight')}
                              className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-all"
                              title="Bold"
                            >
                              <Bold size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertFormat('*$*', 'Italic Text')}
                              className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-all"
                              title="Italic"
                            >
                              <Italic size={11} />
                            </button>
                            <span className="w-px h-4 bg-slate-200 mx-1 block" />
                            <button
                              type="button"
                              onClick={() => handleInsertFormat('- $\n', 'Bullet Item')}
                              className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-all"
                              title="Bullet List"
                            >
                              <List size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertFormat('1. $\n', 'Numbered Item')}
                              className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-all"
                              title="Numbered List"
                            >
                              <ListOrdered size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertFormat('> $', 'Important Learning Objective')}
                              className="p-1.5 hover:bg-slate-200 rounded text-slate-600 font-serif italic text-xs transition-all"
                              title="Assessed Learning Objective blockquote block"
                            >
                              "Objective" Block
                            </button>
                            <span className="w-px h-4 bg-slate-200 mx-1 block" />
                            <button
                              type="button"
                              onClick={() => {
                                handleInsertFormat(`![Image Description](https://example.com/image.png)\n`, '');
                              }}
                              className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-all flex items-center gap-1"
                              title="Insert Image"
                            >
                              <ImageIcon size={11} /> Image
                            </button>
                          </div>

                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Load pre-formatted structured syllabus notes template? This will replace any content currently typed.')) {
                                  handleUpdateActiveWeekData('content', TEMPLATE_NOTE);
                                }
                              }}
                              className="bg-blue-50 text-blue-600 border border-blue-105/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm"
                            >
                              <Sparkles size={9} /> Load Structure Template
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Standard Text Editor Area */}
                      <div className="flex-1 p-6 flex flex-col min-h-0 bg-white">
                        <textarea
                          ref={textareaRef}
                          value={activeWeekData?.content || ''}
                          onChange={(e) => handleUpdateActiveWeekData('content', e.target.value)}
                          placeholder="Draft your detailed lesson curriculum notes here in Markdown format..."
                          className="flex-1 w-full min-h-[300px] p-5 border border-slate-100 rounded-2xl outline-none text-xs font-semibold font-sans bg-slate-50/25 placeholder:text-slate-300 focus:bg-white resize-none"
                        />
                      </div>
                    </>
                  )}

                  {/* Footer Save Button controls */}
                  <div className="bg-slate-50 border-t border-slate-100/50 p-3 flex items-center justify-between gap-4 shrink-0">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                      Content saves automatically on keystroke
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleManualSave}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-900/40 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-black transition-all flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <Save size={10} />
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                /* Right Pane: Live Student View Rendering */
                <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30 overflow-y-auto p-6 md:p-12">
                  <div className="flex items-center gap-1.5 mb-4 select-none text-slate-400 text-[9px] font-black uppercase tracking-wider border-b border-slate-100/80 pb-2 max-w-4xl mx-auto w-full">
                    <Eye size={12} className="text-slate-400" />
                    Live Student Preview Frame
                  </div>
                  
                  <div className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm grow overflow-y-auto max-w-4xl mx-auto w-full">
                    {activeTab === 'sow' ? (
                      <div className="space-y-6">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Week {activeWeek} Scheme Layout
                          </span>
                          <h3 className="text-base font-black italic uppercase text-slate-900 tracking-tight leading-tight mt-1">
                            {activeWeekData?.title || 'No Topic Set'}
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Syllabus Sub-Topics</h4>
                          <ul className="space-y-2.5 pl-1">
                            {activeWeekData?.description ? (
                              activeWeekData.description.split('\n').filter(Boolean).map((sub, i) => (
                                <li key={i} className="text-xs font-semibold text-slate-650 italic flex items-start gap-1.5 leading-relaxed">
                                  <span className="text-blue-500 text-[10px] select-none pt-0.5">•</span>
                                  <span>{sub}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs text-slate-400 italic">No sub-topics formulated yet.</li>
                            )}
                          </ul>
                        </div>

                        {activeWeekData?.videoUrl && (
                          <div className="border-t border-slate-100 pt-4 space-y-2">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Youtube className="w-3.5 h-3.5 text-rose-500" />
                              Embedded Video Preview
                            </h4>
                            <VideoEmbed url={activeWeekData.videoUrl} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="prose max-w-none">
                        {renderMarkdown(activeWeekData?.content)}
                      </div>
                    )}

                    {activeTab === 'note' && activeWeekData?.videoUrl && (
                      <div className="border-t border-slate-100 mt-6 pt-6 space-y-3">
                        <h4 className="text-[0.55rem] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                          <Youtube className="w-3.5 h-3.5 text-rose-500" />
                          Accompanying Video Previews
                        </h4>
                        <VideoEmbed url={activeWeekData.videoUrl} />
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
};
