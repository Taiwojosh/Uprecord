sed -i "s/setNoteWeeks(merged);/setNoteWeeks(draftWeeks || merged);/g" src/pages/LessonNotesPage.tsx
sed -i "s/setNoteWeeks(skeleton);/setNoteWeeks(draftWeeks || skeleton);/g" src/pages/LessonNotesPage.tsx
