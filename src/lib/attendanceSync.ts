import { db as dexieDb } from '../db/db';
import { db as firestoreDb, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error sync exception: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check network status helper
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  offline: boolean;
}

// Master sync engine for attendance
export async function syncAttendanceWithServer(): Promise<SyncResult> {
  if (!isOnline()) {
    return { success: false, syncedCount: 0, failedCount: 0, offline: true };
  }

  let syncedCount = 0;
  let failedCount = 0;

  try {
    // 1. Sync daily attendance logs
    // We fetch any records from Dexie that have not been successfully synced yet
    const pendingDaily = await dexieDb.dailyAttendance
      .filter((item) => !item.syncStatus || item.syncStatus === 'pending')
      .toArray();

    for (const record of pendingDaily) {
      if (!record.id) continue;
      
      const docId = `${record.studentId}_${record.date}_term${record.term}_${record.session.replace(/\//g, '_')}`;
      const path = `dailyAttendance/${docId}`;
      
      try {
        await setDoc(doc(firestoreDb, 'dailyAttendance', docId), {
          studentId: record.studentId,
          date: record.date,
          status: record.status,
          teacherId: record.teacherId,
          classId: record.classId,
          term: record.term,
          session: record.session,
          markedByRole: record.markedByRole || 'teacher',
          markedByName: record.markedByName || 'User',
          schoolId: record.schoolId || '',
        });

        // Update local status to synced in IndexedDB
        await dexieDb.dailyAttendance.update(record.id, { syncStatus: 'synced' });
        syncedCount++;
      } catch (error) {
        failedCount++;
        console.error(`Error syncing daily attendance record ${record.id}:`, error);
        
        // Throw specific FirestoreErrorInfo JSON structured error for permission errors
        if (error instanceof Error && (error.message.includes('permission') || error.message.includes('denied'))) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
    }

    // 2. Sync cumulative attendance records
    const pendingCumulative = await dexieDb.attendance
      .filter((item) => !item.syncStatus || item.syncStatus === 'pending')
      .toArray();

    for (const record of pendingCumulative) {
      if (!record.id) continue;
      
      const docId = `${record.studentId}_term${record.term}_${record.session.replace(/\//g, '_')}`;
      const path = `attendance/${docId}`;
      
      try {
        const payload: any = {
          studentId: record.studentId,
          term: record.term,
          session: record.session,
          daysPresent: record.daysPresent,
          totalDays: record.totalDays,
          schoolId: record.schoolId || '',
          updatedAt: record.updatedAt || new Date().toISOString(),
        };

        if (record.teacherRemark) payload.teacherRemark = record.teacherRemark;
        if (record.principalRemark) payload.principalRemark = record.principalRemark;

        await setDoc(doc(firestoreDb, 'attendance', docId), payload);

        // Update local status to synced in IndexedDB
        await dexieDb.attendance.update(record.id, { syncStatus: 'synced' });
        syncedCount++;
      } catch (error) {
        failedCount++;
        console.error(`Error syncing cumulative attendance record ${record.id}:`, error);
        
        if (error instanceof Error && (error.message.includes('permission') || error.message.includes('denied'))) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
    }

    return { 
      success: failedCount === 0, 
      syncedCount, 
      failedCount,
      offline: false 
    };
  } catch (error) {
    console.error('Fatal sync execution failure:', error);
    return { 
      success: false, 
      syncedCount, 
      failedCount,
      offline: false 
    };
  }
}

// Function to attach auto-syncer callbacks
export function initAutoSync(onSyncFinished?: (result: SyncResult) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    console.log('App is back online. Starting auto sync of attendance data...');
    const result = await syncAttendanceWithServer();
    if (onSyncFinished) {
      onSyncFinished(result);
    }
  };

  window.addEventListener('online', handleOnline);
  
  // Return cleanup method
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
