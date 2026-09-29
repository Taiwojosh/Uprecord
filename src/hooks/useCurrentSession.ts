import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { detectCurrentSession, detectCurrentTerm } from '../lib/sessionDetector';
import { useAuth } from '../context/AuthContext';
import { refreshSchoolAcademicPeriod } from './useSettings';

/**
 * Hook to get the current academic session and term.
 * It prioritizes values from the settings table in Dexie.
 * If settings are not found or fields are empty, it falls back to auto-detection.
 */
export function useCurrentSession() {
  const { user } = useAuth();
  const schoolId = user?.schoolId;
  const [attemptedSchool, setAttemptedSchool] = useState<string | null>(null);
  const [staleSchool, setStaleSchool] = useState<string | null>(null);
  const settings = useLiveQuery(async () => {
    if (!schoolId) return null;
    const s = await db.settings.where('schoolId').equals(schoolId).first();
    return s || null;
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void refreshSchoolAcademicPeriod(schoolId)
          .then(() => {
            if (active) { setAttemptedSchool(schoolId); setStaleSchool(null); }
          })
          .catch(() => {
            if (active) { setAttemptedSchool(schoolId); setStaleSchool(schoolId); }
          });
      }
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [schoolId]);

  const isLoading = Boolean(schoolId) && (settings === undefined || attemptedSchool !== schoolId);
  // Hide the previous cached period while the first network read is pending.
  // If offline, the scoped Dexie row becomes available after the attempt.
  const currentSession = isLoading ? '' : settings?.currentSession || detectCurrentSession();
  const currentTerm = isLoading ? detectCurrentTerm() : settings?.currentTerm || detectCurrentTerm();

  const getTermLabel = (term: 1 | 2 | 3): string => {
    switch (term) {
      case 1: return 'First Term';
      case 2: return 'Second Term';
      case 3: return 'Third Term';
      default: return 'Unknown Term';
    }
  };

  const getShortTermLabel = (term: 1 | 2 | 3): string => {
    switch (term) {
      case 1: return '1st Term';
      case 2: return '2nd Term';
      case 3: return '3rd Term';
      default: return 'Term';
    }
  };

  return {
    session: currentSession,
    term: currentTerm,
    termLabel: isLoading ? 'Loading term' : getTermLabel(currentTerm),
    shortTermLabel: isLoading ? 'Loading term' : getShortTermLabel(currentTerm),
    isLoading,
    isStale: staleSchool === schoolId,
  };
}
