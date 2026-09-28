import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';

type GuideRole = 'admin' | 'teacher' | 'student';
type GuideStep = { title: string; description: string; to: string; link: string };

const guides: Record<GuideRole, GuideStep[]> = {
  admin: [
    { title: 'Set up your school', description: 'Check the school name, logo, colours, current term and session.', to: '/settings', link: 'Open settings' },
    { title: 'Add people', description: 'Register students and teachers, or review their school records.', to: '/registry', link: 'Open School Registry' },
    { title: 'Prepare teaching', description: 'Review classes and subjects before teachers start lesson plans.', to: '/classes', link: 'Open classes' },
    { title: 'Give portal access', description: 'Create accounts and share each person’s private setup link.', to: '/account-creator', link: 'Open portal accounts' },
    { title: 'Check results', description: 'Review scores and reports before sharing them with families.', to: '/results', link: 'Open results' },
  ],
  teacher: [
    { title: 'Find your class', description: 'See the pupils and subjects assigned to you.', to: '/teacher-portal', link: 'Open teacher portal' },
    { title: 'Plan a lesson', description: 'Choose a class, subject and week, then write or review your plan.', to: '/lesson-planner', link: 'Open lesson planner' },
    { title: 'Take attendance', description: 'Record who is present for the selected date and class.', to: '/attendance', link: 'Open attendance' },
    { title: 'Enter scores', description: 'Select the class and assessment, then check entries before leaving.', to: '/data-entry', link: 'Open score entry' },
    { title: 'Teach and assess', description: 'Schedule a live class or prepare a computer-based test.', to: '/live-classroom', link: 'Open live classroom' },
  ],
  student: [
    { title: 'Start here', description: 'See your class and the school information available to you.', to: '/student-portal', link: 'Open my portal' },
    { title: 'Join a class', description: 'Open a scheduled live lesson when your teacher shares it.', to: '/live-classroom', link: 'Open live classroom' },
    { title: 'Take a test', description: 'Find tests assigned to your class and submit your answers.', to: '/cbt', link: 'Open tests' },
    { title: 'See your results', description: 'View results after the school publishes them.', to: '/results', link: 'Open results' },
  ],
};

const roleLabels: Record<GuideRole, string> = {
  admin: 'School admin',
  teacher: 'Teacher',
  student: 'Student',
};

export const UserManualPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<GuideRole>('admin');
  const roles: GuideRole[] = user?.role === 'admin' || user?.isAdmin
    ? ['admin', 'teacher', 'student']
    : user?.role === 'teacher' ? ['teacher', 'student'] : ['student'];
  const activeRole = roles.includes(selectedRole) ? selectedRole : roles[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-1 py-4 pb-16 sm:px-4 lg:px-8">
      <PageHeader title="Help & guide" subtitle="Quick steps for everyday school tasks" />

      {roles.length > 1 && (
        <div role="group" aria-label="Choose a guide" className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button key={role} type="button" aria-pressed={activeRole === role}
              onClick={() => setSelectedRole(role)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${activeRole === role
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>
              {roleLabels[role]}
            </button>
          ))}
        </div>
      )}

      <section aria-label={`${roleLabels[activeRole]} steps`} className="grid gap-3 sm:grid-cols-2">
        {guides[activeRole].map((step, index) => (
          <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{index + 1}</span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{step.title}</h2>
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</p>
            <Link to={step.to} className="mt-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">
              {step.link}<ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <BookOpen className="h-4 w-4" /><h2 className="text-sm font-semibold">Where your records are kept</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          School Registry and portal accounts use the school server. Some academic drafts are saved in this browser.
          A local download covers only records on this device; it is not a full school backup.
        </p>
        {(user?.role === 'admin' || user?.isAdmin) && (
          <Link to="/backup" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">
            <Info className="h-4 w-4" /> About local records
          </Link>
        )}
      </section>
    </div>
  );
};
