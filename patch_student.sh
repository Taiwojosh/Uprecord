cat << 'INNER_EOF' > patch.txt
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

INNER_EOF
sed -i '/const \[selectedSubjectId/r patch.txt' src/pages/LessonNotesPage.tsx
