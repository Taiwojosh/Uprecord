import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  BookOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { db, type IClass, type ISubject } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface FileTreeProps {
  classes: IClass[];
  subjects: ISubject[];
  selectedClassId: number | null;
  selectedSubjectId: number | null;
  activeWeek: number;
  onSelect: (classId: number, subjectId: number, week: number) => void;
  userRole: 'admin' | 'teacher' | 'student';
  currentTerm: 1 | 2 | 3;
  currentSession: string;
  borderless?: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({
  classes,
  subjects,
  selectedClassId,
  selectedSubjectId,
  activeWeek,
  onSelect,
  userRole,
  currentTerm,
  currentSession,
  borderless = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>(() => {
    // If there is a pre-selected class, keep it open initially
    if (selectedClassId) {
      return { [selectedClassId]: true };
    }
    return {};
  });

  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(() => {
    // Key format: "classId-subjectId"
    if (selectedClassId && selectedSubjectId) {
      return { [`${selectedClassId}-${selectedSubjectId}`]: true };
    }
    return {};
  });

  // Query all curriculum records to show correct live week titles in the file tree nodes reactively
  const curriculums = useLiveQuery(() => db.curriculum.toArray()) || [];
  const lessonNotes = useLiveQuery(() => db.lessonNotes.toArray()) || [];

  // Map of curriculum week titles
  const curriculumMap = useMemo(() => {
    const map: Record<string, Record<number, string>> = {};
    curriculums.forEach(curr => {
      if (curr.term === currentTerm && curr.session === currentSession) {
        const key = `${curr.classId}-${curr.subjectId}`;
        map[key] = {};
        curr.topics?.forEach(t => {
          map[key][t.week] = t.title;
        });
      }
    });
    return map;
  }, [curriculums, currentTerm, currentSession]);

  // Map of completed lesson notes stats or indicators
  const notesMap = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    lessonNotes.forEach(note => {
      if (note.term === currentTerm && note.session === currentSession) {
        const key = `${note.classId}-${note.subjectId}`;
        map[key] = new Set();
        note.weeks?.forEach(w => {
          if (w.content && w.content.trim().length > 15) {
            map[key].add(w.week);
          }
        });
      }
    });
    return map;
  }, [lessonNotes, currentTerm, currentSession]);

  const toggleClass = (classId: number) => {
    setExpandedClasses(prev => ({
      ...prev,
      [classId]: !prev[classId]
    }));
  };

  const toggleSubject = (classId: number, subjectId: number) => {
    const key = `${classId}-${subjectId}`;
    setExpandedSubjects(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleWeekSelect = (classId: number, subjectId: number, week: number) => {
    onSelect(classId, subjectId, week);
  };

  // Build high-performance filtered tree data
  const filteredTreeData = useMemo(() => {
    return classes.map(cls => {
      // Find subjects mapped to this class
      const classSubjects = subjects.filter(sub => {
        const isDirectClass = sub.classId === cls.id || sub.classIds?.includes(cls.id!);
        const isGeneral = (!sub.classId && (!sub.classIds || sub.classIds.length === 0));
        const isCoreMatch = sub.isCore && (!sub.coreLevels || sub.coreLevels.includes(cls.level as any));
        const isDeptMatch = sub.departmentIds?.length > 0 && cls.departmentId ? sub.departmentIds.includes(cls.departmentId) : false;
        return isDirectClass || isGeneral || isCoreMatch || isDeptMatch;
      });

      // Filter subjects based on search text
      const filteredSubjects = classSubjects.filter(sub => {
        const subName = sub.subjectName.toLowerCase();
        const search = searchTerm.toLowerCase();
        if (subName.includes(search)) return true;
        
        // Also match class name
        if (cls.className.toLowerCase().includes(search)) return true;

        // Try matching week titles
        const key = `${cls.id}-${sub.id}`;
        const weekTitles = curriculumMap[key];
        if (weekTitles) {
          const matchWeek = Object.values(weekTitles).some(title => 
            title.toLowerCase().includes(search)
          );
          if (matchWeek) return true;
        }

        return false;
      });

      const hasSubjects = filteredSubjects.length > 0;
      const matchesSearchText = searchTerm !== '' && cls.className.toLowerCase().includes(searchTerm.toLowerCase());

      return {
        ...cls,
        subjects: filteredSubjects,
        hasMatches: hasSubjects || matchesSearchText
      };
    }).filter(cls => cls.hasMatches);
  }, [classes, subjects, searchTerm, curriculumMap, selectedSubjectId]);

  return (
    <div className={borderless ? "flex flex-col w-full gap-1" : "bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full min-h-[500px]"}>
      {!borderless && (
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Explorer</h4>
            <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Classes & Subject Trees</p>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search subjects or weeks..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-200 text-xs font-bold text-slate-700 placeholder:text-slate-400 rounded-xl"
        />
      </div>

      {/* Scrollable Tree View */}
      <div className={`flex-1 ${borderless ? "" : "overflow-y-auto max-h-[600px]"} pr-1 space-y-1 scrollbar-thin`}>
        {filteredTreeData.length === 0 ? (
          <div className="text-center py-10 px-2">
            <p className="text-xs italic font-bold text-slate-400">No courses or classes match search.</p>
          </div>
        ) : (
          filteredTreeData.map((cls) => {
            const classOpen = expandedClasses[cls.id!] || searchTerm.length > 0;
            const isClassSelected = selectedClassId === cls.id;

            return (
              <div key={cls.id} className="space-y-0.5">
                {/* Class node */}
                <button
                  type="button"
                  onClick={() => toggleClass(cls.id!)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    isClassSelected 
                      ? 'bg-blue-50/50 border border-blue-100 text-blue-600' 
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0 text-slate-400">
                      {classOpen ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-500" />}
                    </span>
                    <span className="text-xs font-black uppercase italic tracking-tight truncate leading-none">
                      {cls.className}
                    </span>
                  </div>
                  <span className="shrink-0 text-slate-400 hover:text-slate-600">
                    {classOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {/* Subjects under Class */}
                {classOpen && (
                  <div className="ml-4 pl-3 border-l border-slate-100 space-y-0.5 pt-0.5">
                    {cls.subjects.length === 0 ? (
                      <p className="text-[10px] italic font-bold text-slate-400 py-1 pl-2">
                        No subjects registered for this class
                      </p>
                    ) : (
                      cls.subjects.map((sub) => {
                        const key = `${cls.id}-${sub.id}`;
                        const subjectOpen = expandedSubjects[key] || searchTerm.length > 0;
                        const isSelectedCourse = selectedClassId === cls.id && selectedSubjectId === sub.id;

                        // Check notes stats for matching badges
                        const notesCount = notesMap[key]?.size || 0;

                        return (
                          <div key={sub.id} className="space-y-0.5">
                            {/* Subject node */}
                            <button
                              type="button"
                              onClick={() => toggleSubject(cls.id!, sub.id!)}
                              className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left ${
                                isSelectedCourse 
                                  ? 'bg-slate-900 text-white shadow-md' 
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="shrink-0 text-slate-400">
                                  <BookOpen className={`w-3.5 h-3.5 ${isSelectedCourse ? 'text-white' : 'text-slate-500'}`} />
                                </span>
                                <span className="text-[11px] font-bold truncate leading-none">
                                  {sub.subjectName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {notesCount > 0 && !isSelectedCourse && (
                                  <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black tracking-tighter px-1.5 py-0.5 rounded-full border border-emerald-100">
                                    {notesCount}
                                  </span>
                                )}
                                <span className="shrink-0 text-slate-400">
                                  {subjectOpen ? <ChevronDown className="w-3" /> : <ChevronRight className="w-3" />}
                                </span>
                              </div>
                            </button>

                            {/* Weeks list inside Subject */}
                            {subjectOpen && (
                              <div className="ml-3 pl-2.5 border-l border-slate-100 space-y-0.5 pt-0.5">
                                {Array.from({ length: 12 }, (_, i) => {
                                  const week = i + 1;
                                  const isSelectedWeek = selectedClassId === cls.id && selectedSubjectId === sub.id && activeWeek === week;
                                  
                                  const savedTitle = curriculumMap[key]?.[week];
                                  const labelStr = savedTitle ? `W${week}: ${savedTitle}` : `Week ${week} Topic`;

                                  const weekHasNotes = notesMap[key]?.has(week);

                                  if (userRole === 'student' && !weekHasNotes) {
                                    return null;
                                  }

                                  return (
                                    <button
                                      key={week}
                                      type="button"
                                      onClick={() => handleWeekSelect(cls.id!, sub.id!, week)}
                                      className={`w-full flex items-center justify-between p-1.5 rounded-md text-left text-[11px] transition-all ${
                                        isSelectedWeek 
                                          ? 'bg-blue-600 text-white font-black' 
                                          : 'text-slate-500 hover:bg-slate-50 font-semibold'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <FileText className={`w-3 h-3 shrink-0 ${isSelectedWeek ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="truncate pr-1">
                                          {labelStr}
                                        </span>
                                      </div>
                                      {weekHasNotes && (
                                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelectedWeek ? 'text-white' : 'text-emerald-500'}`} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
