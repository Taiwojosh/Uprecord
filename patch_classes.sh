sed -i 's/if (isStudent && user?.studentId) {/if (isStudent) {/' src/pages/LessonNotesPage.tsx
sed -i 's/return classes.slice(0, 1); \/\/ standard mockup limit/if (studentData?.classId) return classes.filter(c => c.id === studentData.classId); return EMPTY_CLASSES_ARRAY;/' src/pages/LessonNotesPage.tsx
