import React, { useState, useEffect } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { motion, AnimatePresence } from "motion/react";
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
  ShieldCheck,
  Layout,
  Sheet,
  Play,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCurrentSession } from "../hooks/useCurrentSession";
import { useToast } from "../context/ToastContext";
import { db, type ICurriculum, type ISubject, type IClass } from "../db/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Spinner } from "../components/ui/Spinner";
import { useLocation } from "react-router-dom";
import { FileTree } from "../components/FileTree";

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
  // Parse sub-topics. If empty, default to one empty item for editing.
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

  // Helper to focus with retries to handle React state sync latency
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
      // insert a new empty item right after itemIndex
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

      // Auto-focus the previous one
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
                className="flex-1 bg-slate-50 border border-slate-100/70 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-200 font-semibold italic text-slate-600 placeholder:text-slate-300 text-xs px-3 py-2 rounded-xl"
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
      <button
        type="button"
        onClick={handleAddItem}
        className="text-[0.625rem] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1.5 mt-1 px-1 py-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Item
      </button>
    </div>
  );
};

export const getEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = url.match(youtubeRegex);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  const vimeoRegex =
    /(?:vimeo\.com\/(?:channels\/[^\/]+\/|groups\/[^\/]+\/album\/\d+\/video\/|video\/|showcase\/[^\/]+\/video\/)?|vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
};

export const VideoEmbed: React.FC<{ url?: string }> = ({ url }) => {
  const embedUrl = React.useMemo(() => getEmbedUrl(url), [url]);
  if (!embedUrl) {
    if (url) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-bold py-1 px-2 bg-blue-50/50 rounded-lg border border-blue-100/50"
        >
          View Video Link <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    return null;
  }
  return (
    <div className="relative aspect-video w-full max-w-md rounded-2xl overflow-hidden border border-slate-100/70 shadow-sm mt-3">
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Instructional Video"
      />
    </div>
  );
};

export const CurriculumPage: React.FC = () => {
  const { user } = useAuth();
  const { session, term, termLabel } = useCurrentSession();
  const { showToast } = useToast();
  const location = useLocation();
  const routeState = location.state as {
    subjectId?: number;
    classId?: number;
  } | null;

  const isAdmin = user?.role === "admin";

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
    routeState?.subjectId || null,
  );
  const [selectedClassId, setSelectedClassId] = useState<number | null>(
    routeState?.classId || null,
  );
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [viewLayout, setViewLayout] = useState<"single_week" | "full_sheet">(
    "single_week",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "dirty" | "saving" | "synced" | "error"
  >("idle");
  const [loadedKey, setLoadedKey] = useState<string>("");
  const [topics, setTopics] = useState<
    {
      week: number;
      title: string;
      description?: string;
      completed: boolean;
      videoUrl?: string;
    }[]
  >([]);
  const [mobileEditingIndex, setMobileEditingIndex] = useState<number | null>(
    null,
  );
  const [mobileDrawerTab, setMobileDrawerTab] = useState<
    "editor" | "timesheet"
  >("editor");

  // Get subjects assigned to teacher or all for admin
  const subjects =
    useLiveQuery(async () => {
      const all = await db.subjects.toArray();
      if (isAdmin) return all;
      return all.filter(
        (s) =>
          s.teacherId === Number(user?.id) ||
          s.assistantTeacherIds?.includes(Number(user?.id)),
      );
    }) || [];

  const classes = useLiveQuery(async () => {
    const all = await db.classes.toArray();
    if (isAdmin) return all;
    const teacherIdNum = Number(user?.id);
    const allSubjects = await db.subjects.toArray();
    const teacherSubjects = allSubjects.filter(
      (s) => s.teacherId === teacherIdNum || s.assistantTeacherIds?.includes(teacherIdNum)
    );
    return all.filter(c => 
      c.teacherId === teacherIdNum || 
      teacherSubjects.some(s => {
        const isDirectClass = s.classId === c.id || s.classIds?.includes(c.id!);
        const isGeneral = (!s.classId && (!s.classIds || s.classIds.length === 0));
        const isCoreMatch = s.isCore && (!s.coreLevels || s.coreLevels.includes(c.level as any));
        const isDeptMatch = s.departmentIds?.length > 0 && c.departmentId ? s.departmentIds.includes(c.departmentId) : false;
        return isDirectClass || isGeneral || isCoreMatch || isDeptMatch;
      })
    );
  }, [isAdmin, user]) || [];

  // Auto-select subject if there is only exactly one subject available
  useEffect(() => {
    if (subjects && subjects.length === 1 && !selectedSubjectId) {
      const firstId = subjects[0].id;
      if (firstId && selectedSubjectId !== firstId) {
        setSelectedSubjectId(firstId);
      }
    }
  }, [subjects, selectedSubjectId]);

  const currentCurriculum = useLiveQuery(async () => {
    if (!selectedSubjectId || !selectedClassId || !session) return null;
    const res = await db.curriculum
      .where("[subjectId+classId+term+session]")
      .equals([selectedSubjectId, selectedClassId, term, session])
      .first();
    return res || { notFound: true };
  }, [selectedSubjectId, selectedClassId, term, session]);

  // Load curriculum from DB when key selection actually changes
  useEffect(() => {
    if (!selectedSubjectId || !selectedClassId || !session) return;
    const currentKey = `${selectedSubjectId}-${selectedClassId}-${term}-${session}`;
    if (currentKey !== loadedKey) {
      if (currentCurriculum && !('notFound' in currentCurriculum)) {
        setTopics(currentCurriculum.topics);
        setLoadedKey(currentKey);
        setAutosaveStatus("idle");
      } else if (currentCurriculum && 'notFound' in currentCurriculum) {
        // Default skeleton for new curriculum
        const initial = Array.from({ length: 12 }, (_, i) => ({
          week: i + 1,
          title: "",
          completed: false,
        }));
        setTopics(initial);
        setLoadedKey(currentKey);
        setAutosaveStatus("idle");
      }
    }
  }, [
    currentCurriculum,
    selectedSubjectId,
    selectedClassId,
    term,
    session,
    loadedKey,
  ]);

  // Debounced Autosave effect
  useEffect(() => {
    if (autosaveStatus !== "dirty") return;

    const timeoutId = setTimeout(async () => {
      if (!selectedSubjectId || !selectedClassId || !session) return;

      setAutosaveStatus("saving");
      try {
        const data: Omit<ICurriculum, "id"> = {
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          term: term as 1 | 2 | 3,
          session,
          topics,
          updatedAt: new Date().toISOString(),
        };

        const existingRecord = await db.curriculum
          .where("[subjectId+classId+term+session]")
          .equals([selectedSubjectId, selectedClassId, term, session])
          .first();

        if (existingRecord?.id) {
          await db.curriculum.update(existingRecord.id, data);
        } else {
          await db.curriculum.add(data);
        }
        setAutosaveStatus("synced");
      } catch (error) {
        console.error("Autosave failed:", error);
        setAutosaveStatus("error");
      }
    }, 1500); // 1.5 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [
    topics,
    autosaveStatus,
    selectedSubjectId,
    selectedClassId,
    term,
    session,
  ]);

  const handleSave = async () => {
    if (!selectedSubjectId || !selectedClassId || !session) return;

    setIsSaving(true);
    setAutosaveStatus("saving");
    try {
      const data: Omit<ICurriculum, "id"> = {
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        term: term as 1 | 2 | 3,
        session,
        topics,
        updatedAt: new Date().toISOString(),
      };

      const existingRecord = await db.curriculum
        .where("[subjectId+classId+term+session]")
        .equals([selectedSubjectId, selectedClassId, term, session])
        .first();

      if (existingRecord?.id) {
        await db.curriculum.update(existingRecord.id, data);
      } else {
        await db.curriculum.add(data);
      }
      showToast("Curriculum scheme updated successfully", "success");
      setAutosaveStatus("synced");
    } catch (error) {
      showToast("Failed to save scheme", "error");
      setAutosaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTopic = (index: number, field: string, value: any) => {
    if (isAdmin) return; // Admin can't edit
    const newTopics = [...topics];
    newTopics[index] = { ...newTopics[index], [field]: value };
    setTopics(newTopics);
    setAutosaveStatus("dirty");
  };

  const selectedSubject = React.useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId);
  }, [subjects, selectedSubjectId]);

  const selectedClass = React.useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Restrict Class List to classes assigned to the selected subject
  const filteredClasses = React.useMemo(() => {
    if (!selectedSubject) return [];

    const targetClassIds: number[] = [];
    if (selectedSubject.classId) {
      targetClassIds.push(selectedSubject.classId);
    }
    if (selectedSubject.classIds && selectedSubject.classIds.length > 0) {
      selectedSubject.classIds.forEach((id) => {
        if (!targetClassIds.includes(id)) targetClassIds.push(id);
      });
    }

    return classes.filter((c) => c.id && targetClassIds.includes(c.id));
  }, [selectedSubject, classes]);

  // Adjust selected class id if it becomes invalid for the newly selected subject
  useEffect(() => {
    if (selectedSubjectId && subjects.length > 0 && classes.length > 0) {
      const subject = subjects.find((s) => s.id === selectedSubjectId);
      if (subject) {
        const targetClassIds: number[] = [];
        if (subject.classId) {
          targetClassIds.push(subject.classId);
        }
        if (subject.classIds && subject.classIds.length > 0) {
          subject.classIds.forEach((id) => {
            if (!targetClassIds.includes(id)) targetClassIds.push(id);
          });
        }

        if (selectedClassId && !targetClassIds.includes(selectedClassId)) {
          setSelectedClassId(null);
        }
      }
    } else if (!selectedSubjectId) {
      if (selectedClassId !== null) {
        setSelectedClassId(null);
      }
    }
  }, [selectedSubjectId, subjects, classes, selectedClassId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <PageHeader
          title="Scheme of Work"
          subtitle={
            isAdmin
              ? "Monitoring academic curriculum coverage"
              : "Planning your termly lesson topics"
          }
        />
        {!isAdmin && selectedSubjectId && selectedClassId && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center text-xs font-semibold select-none">
              {autosaveStatus === "saving" && (
                <span className="flex items-center gap-1.5 text-blue-500 bg-blue-50/75 px-3 py-1.5 rounded-full border border-blue-100 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                  Autosaving...
                </span>
              )}
              {autosaveStatus === "synced" && (
                <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50/75 px-3 py-1.5 rounded-full border border-emerald-100">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Saved
                </span>
              )}
              {autosaveStatus === "dirty" && (
                <span className="flex items-center gap-1.5 text-amber-500 bg-amber-50/75 px-3 py-1.5 rounded-full border border-amber-100">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  Saving draft...
                </span>
              )}
              {autosaveStatus === "error" && (
                <span className="flex items-center gap-1.5 text-rose-500 bg-rose-50/75 px-3 py-1.5 rounded-full border border-rose-100">
                  Autosave failed
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all shadow-lg disabled:opacity-50"
            >
              {isSaving ? <Spinner size="sm" /> : <Save size={18} />}
              Finalize Scheme
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Explorer Left Sidebar & Context Editor Right Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Explorer Sidebar Section */}
        <div className="lg:col-span-3">
          <FileTree
            classes={classes}
            subjects={subjects}
            selectedClassId={selectedClassId}
            selectedSubjectId={selectedSubjectId}
            activeWeek={activeWeek}
            onSelect={(cId, sId, wk) => {
              setSelectedClassId(cId);
              setSelectedSubjectId(sId);
              setActiveWeek(wk);
              setLoadedKey(""); // clear cache trigger re-load of SOW
              setMobileEditingIndex(wk - 1);
              setMobileDrawerTab("editor");
            }}
            userRole={isAdmin ? "admin" : "teacher"}
            currentTerm={term as 1 | 2 | 3}
            currentSession={session}
          />
        </div>

        {/* Workspace Canvas Panel */}
        <div className="lg:col-span-9 space-y-6">
          {/* Top selection drop downs inside workspace panel for dual synchronization */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">
                Select Subject
              </label>
              <div className="relative">
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedSubjectId || ""}
                  onChange={(e) => {
                    setSelectedSubjectId(Number(e.target.value) || null);
                    setLoadedKey(""); // trigger merged cache clearing
                  }}
                  className="w-full pl-11 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none"
                >
                  <option value="">Select Subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">
                Academic Class
              </label>
              <div className="relative">
                <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedClassId || ""}
                  onChange={(e) => {
                    setSelectedClassId(Number(e.target.value) || null);
                    setLoadedKey(""); // trigger merged cache clearing
                  }}
                  className="w-full pl-11 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none"
                >
                  <option value="">
                    {selectedSubjectId
                      ? "Select Class..."
                      : "Select Subject First..."}
                  </option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!selectedSubjectId || !selectedClassId ? (
            <div className="bg-white p-20 rounded-[2.5rem] border border-gray-100 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-[2rem] flex items-center justify-center">
                <BookOpen size={40} />
              </div>
              <div className="max-w-md">
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  Curriculum Planner
                </h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Choose a class and offered subject from the Explorer tree on
                  the left or selectors above to build the academic scheme of
                  work for {termLabel}.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Controls Bar: Selector for Card style vs entire full sheet table (Desktop only, hidden on mobile) */}
              <div className="hidden md:flex bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm md:flex-row md:items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase">
                      Coverage Audit
                    </h4>
                    <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {selectedSubject?.subjectName} •{" "}
                      {selectedClass?.className}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* View layout Toggle widgets */}
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewLayout("single_week")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[0.625rem] font-black uppercase tracking-widest rounded-lg transition-all ${
                        viewLayout === "single_week"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Layout size={12} />
                      Active Week Page
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewLayout("full_sheet")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[0.625rem] font-black uppercase tracking-widest rounded-lg transition-all ${
                        viewLayout === "full_sheet"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Sheet size={12} />
                      Entire Term Sheet
                    </button>
                  </div>

                  <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                        Completed
                      </p>
                      <p className="text-sm font-black text-blue-600 italic mt-0.5">
                        {topics.filter((t) => t.completed).length} /{" "}
                        {topics.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Main Canvas: Always show 12-week timesheet list (No redundant cards, opens drawer directly) */}
              <div className="md:hidden space-y-4">
                {topics.map((topic, index) => {
                  const subtopicLines = topic.description
                    ? topic.description.split("\n").filter(Boolean)
                    : [];
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        setMobileEditingIndex(index);
                        setMobileDrawerTab("editor");
                      }}
                      className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 hover:border-blue-200 transition-all duration-300 cursor-pointer animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-700 italic text-sm">
                            W{topic.week}
                          </div>
                          <div>
                            <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest block">
                              Week {topic.week}
                            </span>
                            {topic.title ? (
                              <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight italic mt-0.5 max-w-[185px] truncate">
                                {topic.title}
                              </h5>
                            ) : (
                              <span className="text-xs font-bold text-slate-300 italic mt-0.5 block">
                                No Topic Defined
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          {topic.completed ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-widest">
                              <CheckCircle2 size={10} /> Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-widest">
                              <Clock size={10} /> Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {subtopicLines.length > 0 && (
                        <div className="pt-3 border-t border-slate-50/50">
                          <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest block">
                            Sub-topics ({subtopicLines.length})
                          </span>
                          <ul className="mt-1 space-y-1">
                            {subtopicLines.slice(0, 3).map((sub, i) => (
                              <li
                                key={i}
                                className="text-[11px] font-semibold text-slate-500 italic block truncate"
                              >
                                • {sub}
                              </li>
                            ))}
                            {subtopicLines.length > 3 && (
                              <li className="text-[9px] font-black uppercase text-blue-500 tracking-widest pt-0.5">
                                + {subtopicLines.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {topic.videoUrl && (
                        <div className="pt-2 border-t border-slate-50/50 flex items-center gap-1.5 text-xs text-blue-500 bg-blue-50/30 px-2.5 py-1.5 rounded-xl border border-blue-100/30">
                          <Play size={10} className="fill-blue-500/20" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Video Attached
                          </span>
                        </div>
                      )}

                      {!isAdmin && (
                        <div className="pt-1 flex items-center justify-end text-[0.55rem] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 gap-1 mt-1">
                          <span>Edit</span>
                          <ChevronRight size={12} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Render Content: Hidden on mobile */}
              <div className="hidden md:block w-full">
                {viewLayout === "single_week" ? (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                  {/* Week details active title and completed checkpoint toggle status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-50">
                    <div
                      onClick={() => {
                        setMobileEditingIndex(activeWeek - 1);
                        setMobileDrawerTab("editor");
                      }}
                      className="flex items-center gap-3 cursor-pointer md:cursor-default"
                    >
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg italic">
                        W{activeWeek}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase">
                          Week {activeWeek} Topic Details
                        </h4>
                        <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                          Design subject scheme and subtopics
                        </p>
                      </div>
                    </div>

                    {/* Completion Checkmark Widget */}
                    <div>
                      {isAdmin ? (
                        topics[activeWeek - 1]?.completed ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/50">
                            <CheckCircle2 size={12} />
                            <span className="text-[0.55rem] font-black uppercase tracking-widest">
                              Completed
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100/50">
                            <Clock size={12} />
                            <span className="text-[0.55rem] font-black uppercase tracking-widest">
                              Pending
                            </span>
                          </div>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateTopic(
                              activeWeek - 1,
                              "completed",
                              !topics[activeWeek - 1]?.completed,
                            )
                          }
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${
                            topics[activeWeek - 1]?.completed
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100/30"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {topics[activeWeek - 1]?.completed ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
                          )}
                          <span>
                            {topics[activeWeek - 1]?.completed
                              ? "Completed"
                              : "Mark Done"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Mobile Preview / Edit Trigger Card */}
                  <div className="md:hidden space-y-6">
                    <div
                      onClick={() => {
                        setMobileEditingIndex(activeWeek - 1);
                        setMobileDrawerTab("editor");
                      }}
                      className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4 cursor-pointer hover:bg-slate-50 transition-all duration-200"
                    >
                      <div className="space-y-1">
                        <span className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest block">
                          Topic Title
                        </span>
                        {topics[activeWeek - 1]?.title ? (
                          <h4 className="text-sm font-black text-slate-800 uppercase italic">
                            {topics[activeWeek - 1]?.title}
                          </h4>
                        ) : (
                          <p className="text-xs font-bold text-slate-355 italic">
                            No Topic Specified. Tap to edit.
                          </p>
                        )}
                      </div>

                      <div className="h-px bg-slate-100" />

                      <div className="space-y-1">
                        <span className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest block">
                          Sub-topics List
                        </span>
                        {(() => {
                          const subs = topics[activeWeek - 1]?.description
                            ? topics[activeWeek - 1].description
                                .split("\n")
                                .filter(Boolean)
                            : [];
                          if (subs.length === 0) {
                            return (
                              <p className="text-xs font-bold text-slate-355 italic">
                                No sub-topics specified.
                              </p>
                            );
                          }
                          return (
                            <ul className="space-y-1.5 mt-1">
                              {subs.map((sub, i) => (
                                <li
                                  key={i}
                                  className="text-xs font-semibold text-slate-600 italic flex items-start gap-1.5 leading-relaxed"
                                >
                                  <span className="text-blue-500 text-[10px] select-none pt-0.5">
                                    •
                                  </span>
                                  <span>{sub}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>

                      {topics[activeWeek - 1]?.videoUrl && (
                        <>
                          <div className="h-px bg-slate-100" />
                          <div className="space-y-1">
                            <span className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest block">
                              Instructional Video
                            </span>
                            <VideoEmbed url={topics[activeWeek - 1].videoUrl} />
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileEditingIndex(activeWeek - 1);
                          setMobileDrawerTab("editor");
                        }}
                        className="w-full mt-2 py-3 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} />
                        {isAdmin ? "View" : "Edit"}
                      </button>
                    </div>
                  </div>
                  {/* Main Subject week Title field */}
                  <div className="hidden md:block space-y-6">
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Topic Title
                      </label>
                      {isAdmin ? (
                        <p
                          className={`text-sm font-black italic uppercase px-4 py-3 bg-slate-50 border border-slate-100/30 rounded-2xl ${topics[activeWeek - 1]?.title ? "text-slate-850" : "text-slate-300 italic"}`}
                        >
                          {topics[activeWeek - 1]?.title ||
                            "Week Topic Not Specified"}
                        </p>
                      ) : (
                        <input
                          type="text"
                          value={topics[activeWeek - 1]?.title || ""}
                          onChange={(e) =>
                            handleUpdateTopic(
                              activeWeek - 1,
                              "title",
                              e.target.value,
                            )
                          }
                          placeholder="Enter week topic title... (e.g. Simultaneous Algebraic Equations)"
                          className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none px-4 py-3.5 rounded-2xl text-xs font-black uppercase italic text-slate-700 transition-all placeholder:text-slate-300"
                        />
                      )}
                    </div>

                    {/* Subtopic editor details */}
                    <div className="space-y-2 pt-2">
                      <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Scope & Detail Syllabus Items (Sub-Topics)
                      </label>
                      <div className="p-5 bg-slate-50/40 rounded-2xl border border-slate-100/40">
                        <SubTopicsEditor
                          value={topics[activeWeek - 1]?.description || ""}
                          onChange={(val) =>
                            handleUpdateTopic(
                              activeWeek - 1,
                              "description",
                              val,
                            )
                          }
                          isAdmin={isAdmin}
                          topicIndex={activeWeek - 1}
                          idPrefix="single-editor"
                        />
                      </div>
                    </div>

                    {/* Embedded instructional video URLs */}
                    <div className="space-y-2 pt-4 border-t border-slate-100/60">
                      <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Instructional Video Link reference
                      </label>
                      {isAdmin ? (
                        topics[activeWeek - 1]?.videoUrl && (
                          <VideoEmbed url={topics[activeWeek - 1]?.videoUrl} />
                        )
                      ) : (
                        <div className="space-y-3">
                          <input
                            type="url"
                            value={topics[activeWeek - 1]?.videoUrl || ""}
                            onChange={(e) =>
                              handleUpdateTopic(
                                activeWeek - 1,
                                "videoUrl",
                                e.target.value,
                              )
                            }
                            placeholder="Paste YouTube or Vimeo video link resource..."
                            className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold px-4 py-2.5 rounded-xl text-slate-650 transition-all placeholder:text-slate-300"
                          />
                          {topics[activeWeek - 1]?.videoUrl && (
                            <VideoEmbed
                              url={topics[activeWeek - 1]?.videoUrl}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>{" "}
                  {/* End of hidden md:block wrapper */}
                  {/* Previous / Next active navigation controls */}
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100/60">
                    <button
                      type="button"
                      disabled={activeWeek === 1}
                      onClick={() =>
                        setActiveWeek((prev) => Math.max(1, prev - 1))
                      }
                      className="px-5 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-xs font-black uppercase tracking-widest text-slate-600 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Prev Week
                    </button>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                      Week {activeWeek} / 12
                    </span>
                    <button
                      type="button"
                      disabled={activeWeek === 12}
                      onClick={() =>
                        setActiveWeek((prev) => Math.min(12, prev + 1))
                      }
                      className="px-5 py-3 bg-slate-900 hover:bg-black text-xs font-black uppercase tracking-widest text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                    >
                      Next Week →
                    </button>
                  </div>
                </div>
              ) : (
                // Comprehensive multi-week sheet view
                <div className="space-y-6 animate-fade-in">
                  <div className="md:hidden space-y-4">
                    {topics.map((topic, index) => {
                      const subtopicLines = topic.description
                        ? topic.description.split("\n").filter(Boolean)
                        : [];
                      return (
                        <div
                          key={index}
                          onClick={() => {
                            setMobileEditingIndex(index);
                            setMobileDrawerTab("editor");
                          }}
                          className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 hover:border-blue-200 transition-all duration-300 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-700 italic text-sm">
                                W{topic.week}
                              </div>
                              <div>
                                <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest block">
                                  Week {topic.week}
                                </span>
                                {topic.title ? (
                                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight italic mt-0.5 max-w-[185px] truncate">
                                    {topic.title}
                                  </h5>
                                ) : (
                                  <span className="text-xs font-bold text-slate-300 italic mt-0.5 block">
                                    No Topic Defined
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              {topic.completed ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-widest">
                                  <CheckCircle2 size={10} /> Done
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-widest">
                                  <Clock size={10} /> Pending
                                </span>
                              )}
                            </div>
                          </div>

                          {subtopicLines.length > 0 && (
                            <div className="pt-3 border-t border-slate-50/50">
                              <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest block">
                                Sub-topics ({subtopicLines.length})
                              </span>
                              <ul className="mt-1 space-y-1">
                                {subtopicLines.slice(0, 3).map((sub, i) => (
                                  <li
                                    key={i}
                                    className="text-[11px] font-semibold text-slate-500 italic block truncate"
                                  >
                                    • {sub}
                                  </li>
                                ))}
                                {subtopicLines.length > 3 && (
                                  <li className="text-[9px] font-black uppercase text-blue-500 tracking-widest pt-0.5">
                                    + {subtopicLines.length - 3} more
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {topic.videoUrl && (
                            <div className="pt-2 border-t border-slate-50/50 flex items-center gap-1.5 text-xs text-blue-500 bg-blue-50/30 px-2.5 py-1.5 rounded-xl border border-blue-100/30">
                              <Play size={10} className="fill-blue-500/20" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Video Attached
                              </span>
                            </div>
                          )}

                          {!isAdmin && (
                            <div className="pt-1 flex items-center justify-end text-[0.55rem] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 gap-1 mt-1">
                              <span>Edit</span>
                              <ChevronRight size={12} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-50">
                          <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest w-24">
                            Week
                          </th>
                          <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">
                            Topic Title & Scope
                          </th>
                          <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-center w-32">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {topics.map((topic, index) => (
                          <tr
                            key={index}
                            className="group hover:bg-gray-50/30 transition-colors"
                          >
                            <td className="px-8 py-6">
                              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center font-black text-gray-600 italic group-hover:bg-white group-hover:shadow-sm transition-all animate-none">
                                {topic.week}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="space-y-4">
                                {isAdmin ? (
                                  <p
                                    className={`text-sm font-black italic uppercase ${topic.title ? "text-gray-900" : "text-gray-300 italic"}`}
                                  >
                                    {topic.title || "Topic Not Defined"}
                                  </p>
                                ) : (
                                  <input
                                    type="text"
                                    value={topic.title}
                                    onChange={(e) =>
                                      handleUpdateTopic(
                                        index,
                                        "title",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Enter main topic..."
                                    className="w-full bg-slate-50/50 border border-slate-100/50 leading-relaxed font-black uppercase text-xs italic px-3 py-2 rounded-lg text-slate-700"
                                  />
                                )}
                                <div className="pt-2 border-t border-slate-50 max-w-lg">
                                  <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Sub-Topics
                                  </p>
                                  <SubTopicsEditor
                                    value={topic.description || ""}
                                    onChange={(val) =>
                                      handleUpdateTopic(
                                        index,
                                        "description",
                                        val,
                                      )
                                    }
                                    isAdmin={isAdmin}
                                    topicIndex={index}
                                    idPrefix="sheet-desktop"
                                  />
                                </div>

                                <div className="pt-2 border-t border-slate-50 max-w-lg">
                                  <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Video Resource
                                  </p>
                                  {isAdmin ? (
                                    topic.videoUrl && (
                                      <VideoEmbed url={topic.videoUrl} />
                                    )
                                  ) : (
                                    <div className="space-y-2">
                                      <input
                                        type="url"
                                        value={topic.videoUrl || ""}
                                        onChange={(e) =>
                                          handleUpdateTopic(
                                            index,
                                            "videoUrl",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Paste video link..."
                                        className="w-full bg-slate-50/50 border border-slate-100/30 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-200 font-semibold text-slate-600 placeholder:text-slate-300 text-xs px-3 py-1.5 rounded-lg"
                                      />
                                      {topic.videoUrl && (
                                        <VideoEmbed url={topic.videoUrl} />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex justify-center">
                                {isAdmin ? (
                                  topic.completed ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full">
                                      <CheckCircle2 size={12} />
                                      <span className="text-[0.625rem] font-black uppercase tracking-widest">
                                        Done
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full">
                                      <Clock size={12} />
                                      <span className="text-[0.625rem] font-black uppercase tracking-widest">
                                        Pending
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateTopic(
                                        index,
                                        "completed",
                                        !topic.completed,
                                      )
                                    }
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                                      topic.completed
                                        ? "bg-emerald-600 text-white shadow-lg"
                                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                    }`}
                                  >
                                    {topic.completed ? (
                                      <CheckCircle2 size={16} />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                    )}
                                    <span className="text-[0.625rem] font-black uppercase tracking-widest">
                                      {topic.completed
                                        ? "Completed"
                                        : "Mark Done"}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

      <AnimatePresence>
        {mobileEditingIndex !== null && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileEditingIndex(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 md:hidden"
            />

            {/* Bottom Pop-up Drawer Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[88vh] bg-white rounded-t-[2.5rem] border-t border-slate-100 z-50 p-6 pb-12 shadow-2xl flex flex-col md:hidden"
            >
              {/* Native Drag/Close Indicator Bar */}
              <div className="flex justify-center -mt-2 pb-4">
                <div
                  onClick={() => setMobileEditingIndex(null)}
                  className="w-16 h-1.5 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 rounded-full cursor-pointer transition-colors"
                />
              </div>

              {/* Google Maps-style Tab Selector at the VERY top */}
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setMobileDrawerTab("editor")}
                  className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                    mobileDrawerTab === "editor"
                      ? "bg-white text-blue-600 shadow-sm font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Active Week Page
                </button>
                <button
                  type="button"
                  onClick={() => setMobileDrawerTab("timesheet")}
                  className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                    mobileDrawerTab === "timesheet"
                      ? "bg-white text-blue-600 shadow-sm font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Entire Term Sheet
                </button>
              </div>

              {/* Header Info */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-50 flex-shrink-0 mb-4">
                <div className="flex items-center gap-2.5 flex-1 select-none">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black italic text-sm">
                    W{mobileEditingIndex + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase">
                      Week {mobileEditingIndex + 1} {isAdmin ? "Viewer" : "Editor"}
                    </h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      Switch weeks or browse the timesheet below
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileEditingIndex(null)}
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold hover:bg-slate-100 active:scale-95 transition-all text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Body depending on Tab */}
              <div className="flex-1 overflow-y-auto py-1 space-y-6">
                {mobileDrawerTab === "editor" ? (
                  <>
                    {/* Horizontal Week Scroller */}
                    <div className="space-y-1.5 pb-2 shrink-0">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Jump to Week
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x select-none">
                        {topics.map((t, idx) => {
                          const isSelected = idx === mobileEditingIndex;
                          return (
                            <button
                              key={`week-chip-${idx}`}
                              type="button"
                              onClick={() => setMobileEditingIndex(idx)}
                              className={`snap-center flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider italic flex items-center gap-1.5 transition-all border ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                                  : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                              }`}
                            >
                              <span>W{idx + 1}</span>
                              {t.completed && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? "bg-white" : "bg-emerald-500"
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Topic Title */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Topic Title {isAdmin && "(Read-Only Mode)"}
                      </label>
                      {isAdmin ? (
                        <div className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-black uppercase italic text-slate-600 border-dashed">
                          {topics[mobileEditingIndex]?.title || "No Topic Defined"}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={topics[mobileEditingIndex]?.title || ""}
                          onChange={(e) =>
                            handleUpdateTopic(
                              mobileEditingIndex,
                              "title",
                              e.target.value,
                            )
                          }
                          placeholder="Enter week topic title... (e.g. Simple Fractions)"
                          className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none px-4 py-3.5 rounded-2xl text-xs font-black uppercase italic text-slate-700 transition-all placeholder:text-slate-300"
                        />
                      )}
                    </div>

                    {/* Subtopics Editor */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Scope & Detail Syllabus Items
                      </label>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <SubTopicsEditor
                          value={topics[mobileEditingIndex]?.description || ""}
                          onChange={(val) =>
                            handleUpdateTopic(
                              mobileEditingIndex,
                              "description",
                              val,
                            )
                          }
                          isAdmin={isAdmin}
                          topicIndex={mobileEditingIndex}
                          idPrefix="mobile-popup"
                        />
                      </div>
                    </div>

                    {/* Video Reference */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Instructional Video Resource Link
                      </label>
                      {isAdmin ? (
                        topics[mobileEditingIndex]?.videoUrl ? (
                          <div className="mt-1">
                            <VideoEmbed url={topics[mobileEditingIndex].videoUrl} />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-450 italic block py-2 ml-1">
                            No instructional video attached.
                          </span>
                        )
                      ) : (
                        <>
                          <input
                            type="url"
                            value={topics[mobileEditingIndex]?.videoUrl || ""}
                            onChange={(e) =>
                              handleUpdateTopic(
                                mobileEditingIndex,
                                "videoUrl",
                                e.target.value,
                              )
                            }
                            placeholder="Paste YouTube or Vimeo video link resource..."
                            className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold px-4 py-2.5 rounded-xl text-slate-650 transition-all placeholder:text-slate-300"
                          />
                          {topics[mobileEditingIndex]?.videoUrl && (
                            <div className="mt-2">
                              <VideoEmbed url={topics[mobileEditingIndex].videoUrl} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  /* Vertical Timesheet view in drawer */
                  <div className="space-y-3 py-1">
                    <div className="flex items-center justify-between px-1 mb-1 select-none shrink-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Academic Coverage
                      </span>
                      <span className="text-xs font-black text-blue-600 italic">
                        {topics.filter((t) => t.completed).length} / {topics.length} Covered
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                      {topics.map((t, idx) => {
                        const isCurrentlySelected = idx === mobileEditingIndex;
                        const subList = t.description
                          ? t.description.split("\n").filter(Boolean)
                          : [];
                        return (
                          <button
                            key={`sheet-chip-${idx}`}
                            type="button"
                            onClick={() => {
                              setMobileEditingIndex(idx);
                              setMobileDrawerTab("editor");
                            }}
                            className={`w-full text-left p-4 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                              isCurrentlySelected
                                ? "bg-blue-50/70 border-blue-200 ring-4 ring-blue-500/5 shadow-sm"
                                : "bg-slate-50/60 border-slate-100 hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black italic text-xs flex-shrink-0 ${
                                  t.completed
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-slate-200 text-slate-600 border border-slate-300/30"
                                }`}
                              >
                                W{idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">
                                  {t.title || (
                                    <span className="text-slate-300 italic font-bold">
                                      No Topic Setup
                                    </span>
                                  )}
                                </h5>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                  {subList.length} Scope Items{" "}
                                  {t.videoUrl ? "• Video Attached" : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {t.completed ? (
                                <span className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 flex items-center justify-center">
                                  <CheckCircle2 size={12} />
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-slate-300 bg-white block" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Footer depending on current tab */}
              <div className="pt-4 border-t border-slate-100/80 flex gap-3 flex-shrink-0">
                {mobileDrawerTab === "editor" ? (
                  <>
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTopic(
                            mobileEditingIndex,
                            "completed",
                            !topics[mobileEditingIndex]?.completed,
                          )
                        }
                        className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                          topics[mobileEditingIndex]?.completed
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-150"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {topics[mobileEditingIndex]?.completed ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                        )}
                        <span>
                          {topics[mobileEditingIndex]?.completed
                            ? "Completed"
                            : "Mark Done"}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMobileEditingIndex(null)}
                      className="flex-1 py-3.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Save size={13} />
                      {isAdmin ? "Close Viewer" : "Save & Close"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMobileEditingIndex(null)}
                    className="w-full py-3.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    Close Sheet
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
