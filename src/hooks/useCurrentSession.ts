import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { detectCurrentSession, detectCurrentTerm } from '../lib/sessionDetector';

/**
 * Hook to get the current academic session and term.
 * It prioritizes values from the settings table in Dexie.
 * If settings are not found or fields are empty, it falls back to auto-detection.
 */
export function useCurrentSession() {
  const settings = useLiveQuery(async () => {
    const s = await db.settings.toCollection().first();
    return s || null;
  });

  const currentSession = settings?.currentSession || detectCurrentSession();
  const currentTerm = settings?.currentTerm || detectCurrentTerm();

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
    termLabel: getTermLabel(currentTerm),
    shortTermLabel: getShortTermLabel(currentTerm),
    isLoading: settings === undefined
  };
}
