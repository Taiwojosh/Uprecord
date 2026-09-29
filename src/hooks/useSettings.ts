import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useBrand } from '../context/BrandContext';
import type { SchoolIdentityResponse } from '../../server/src/contracts/branding';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ISettings, type CAComponent } from '../db/db';
import { detectCurrentSession, detectCurrentTerm } from '../lib/sessionDetector';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SETTINGS: Omit<ISettings, 'id'> = {
  schoolId: '',
  schoolName: '',
  schoolSlogan: '',
  address: '',
  logoBase64: '',
  principalName: '',
  principalSignatureBase64: '',
  brandColor: '#1d4ed8',
  secondaryColor: '#1E293B',
  portalTitle: '',
  nextTermDate: '',
  termClosingDate: '',
  resumptionDate: '',
  currentTerm: detectCurrentTerm(),
  currentSession: detectCurrentSession(),
  totalSubjectScore: 100,
  examMaxScore: 60,
  caMaxScore: 40,
  caComponents: [
    { id: 'ca1', name: '1st Test', maxScore: 20 },
    { id: 'ca2', name: '2nd Test', maxScore: 20 },
  ],
  daysSchoolOpen: 0,
  department1Name: 'Arts and Humanities',
  department2Name: 'Business',
  department3Name: 'Science',
  gradingScale: [
    { grade: 'A', minScore: 70, remark: 'EXCELLENT' },
    { grade: 'B', minScore: 60, remark: 'VERY GOOD' },
    { grade: 'C', minScore: 50, remark: 'CREDIT' },
    { grade: 'D', minScore: 40, remark: 'PASS' },
    { grade: 'E', minScore: 30, remark: 'POOR' },
    { grade: 'F', minScore: 0, remark: 'FAIL' },
  ],
  restrictTeacherActionsNoAttendance: false,
  allowTeachersViewFeeStatus: false,
  restrictUnpaidStudentsAccess: false,
};

type AcademicPeriod = { currentTerm: 1 | 2 | 3; currentSession: string };
const periodRequests = new Map<string, Promise<AcademicPeriod>>();

/** Refresh the school period from the tenant-scoped server record. */
export function refreshSchoolAcademicPeriod(schoolId: string): Promise<AcademicPeriod> {
  const pending = periodRequests.get(schoolId);
  if (pending) return pending;
  const request = (async () => {
    const { data } = await api.get<{ settings: (AcademicPeriod & { schoolId: string }) | null }>('/settings');
    const period = data.settings;
    if (!period || period.schoolId !== schoolId || ![1, 2, 3].includes(period.currentTerm) || !period.currentSession) {
      throw new Error('School academic period is unavailable');
    }
    await db.transaction('rw', db.settings, async () => {
      const current = await db.settings.where('schoolId').equals(schoolId).first();
      const values = { currentTerm: period.currentTerm, currentSession: period.currentSession };
      if (current?.id) {
        if (current.currentTerm !== values.currentTerm || current.currentSession !== values.currentSession) {
          await db.settings.update(current.id, values);
        }
      } else {
        await db.settings.add({ ...DEFAULT_SETTINGS, schoolId, ...values } as ISettings);
      }
    });
    return { currentTerm: period.currentTerm, currentSession: period.currentSession };
  })();
  periodRequests.set(schoolId, request);
  void request.finally(() => { if (periodRequests.get(schoolId) === request) periodRequests.delete(schoolId); }).catch(() => {});
  return request;
}

/**
 * Hook for managing application-wide settings.
 * Automatically seeds default settings if none exist.
 */
export function useSettings() {
  const { user } = useAuth();
  const schoolId = user?.schoolId;
  const { refreshBranding } = useBrand();
  const [loadedSchool, setLoadedSchool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadIdentity = useCallback(async () => {
    if (!schoolId) return;
    setError(null);
    try {
      const { data } = await api.get<SchoolIdentityResponse>('/schools/identity');
      // Refuse a stale response after a session/tenant change.
      if (data.branding.schoolId !== schoolId) throw new Error('School identity mismatch');
      const b = data.branding;
      await db.transaction('rw', db.settings, async () => {
        const current = await db.settings.where('schoolId').equals(schoolId).first();
        const identity = { schoolName: b.schoolName, schoolSlogan: b.slogan || '',
          address: data.address || '', logoBase64: b.logoUrl || '', brandColor: b.brandColor,
          secondaryColor: b.secondaryColor, portalTitle: b.portalTitle };
        if (current?.id) await db.settings.update(current.id, identity);
        else await db.settings.add({ ...DEFAULT_SETTINGS, schoolId, ...identity } as ISettings);
      });
      await refreshSchoolAcademicPeriod(schoolId);
      setLoadedSchool(schoolId);
    } catch {
      setError('Unable to load school settings. Check your connection and retry.');
    }
  }, [schoolId]);

  useEffect(() => { void loadIdentity(); }, [loadIdentity]);

  useEffect(() => {
    if (!schoolId) return;
    const refresh = () => { if (document.visibilityState === 'visible') void refreshSchoolAcademicPeriod(schoolId).catch(() => {}); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [schoolId]);

  const settings = useLiveQuery(async () => {
    if (!schoolId) return undefined;
    const existing = await db.settings.where('schoolId').equals(schoolId).first();
    if (!existing) {
      // Don't auto-create here to avoid race conditions or unnecessary creations
      // The RegisterPage/Admin setup should handle initial creation
      return undefined;
    }
    return existing;
  }, [schoolId]);

  const updateSettings = useCallback(async (updates: Partial<ISettings>) => {
    if (!schoolId) return;
    const existing = await db.settings.where('schoolId').equals(schoolId).first();
    const next = { ...updates };
    if (next.currentTerm !== undefined || next.currentSession !== undefined) {
      throw new Error('Change the school period through School Registry.');
    }
    
    const identityFields = { schoolName: 'name', schoolSlogan: 'slogan', address: 'address', logoBase64: 'logoUrl', brandColor: 'brandColor', secondaryColor: 'secondaryColor', portalTitle: 'portalTitle' } as const;
    const identity: Record<string, string | null> = {};
    for (const [local, remote] of Object.entries(identityFields)) {
      const key = local as keyof typeof identityFields;
      if (next[key] !== undefined && next[key] !== existing?.[key]) {
        identity[remote] = next[key] || null;
      }
    }
    // Persist public identity on the server before recording a successful local save.
    if (Object.keys(identity).length) {
      await api.put('/schools/branding', identity);
      await refreshBranding();
    }

    // If caComponents or examMaxScore changes, recalculate caMaxScore
    if (next.caComponents || next.examMaxScore !== undefined) {
      const components = next.caComponents || existing?.caComponents || DEFAULT_SETTINGS.caComponents;
      const caMax = components.reduce((sum, c) => sum + c.maxScore, 0);
      next.caMaxScore = caMax;
      
      // Also ensure totalSubjectScore is consistent
      const examMax = next.examMaxScore !== undefined ? next.examMaxScore : (existing?.examMaxScore || DEFAULT_SETTINGS.examMaxScore);
      next.totalSubjectScore = caMax + examMax;
    }

    if (existing?.id) {
      await db.settings.update(existing.id, next);
    } else {
      await db.settings.add({ ...DEFAULT_SETTINGS, schoolId, ...next } as ISettings);
    }
  }, [schoolId, refreshBranding]);

  const addCAComponent = async (component: CAComponent) => {
    const currentSettings = settings || DEFAULT_SETTINGS;
    if (currentSettings.caComponents.length >= 4) return;

    const newComponents = [...currentSettings.caComponents, component];
    await updateSettings({ caComponents: newComponents });
  };

  const removeCAComponent = async (id: string) => {
    const currentSettings = settings || DEFAULT_SETTINGS;
    if (currentSettings.caComponents.length <= 2) return;

    const newComponents = currentSettings.caComponents.filter(c => c.id !== id);
    await updateSettings({ caComponents: newComponents });
  };

  return {
    settings,
    updateSettings,
    addCAComponent,
    removeCAComponent,
    error,
    reload: loadIdentity,
    isLoading: Boolean(schoolId) && !error && (loadedSchool !== schoolId || settings === undefined)
  };
}
