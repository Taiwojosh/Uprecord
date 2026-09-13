sed -i '/if (currentKey !== loadedKey) {/a\
      const draftKey = `draft_lesson_notes_${selectedSubjectId}_${selectedClassId}_${term}_${session}`;\
      let draftWeeks = null;\
      try { const draftData = localStorage.getItem(draftKey); if (draftData) draftWeeks = JSON.parse(draftData); } catch (e) {}' src/pages/LessonNotesPage.tsx
