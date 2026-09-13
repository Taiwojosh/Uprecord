import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';

export function useAudit() {
  const { user } = useAuth();

  const logAction = async (action: string, details: string) => {
    if (!user) return;
    
    try {
      await db.auditLogs.add({
        userId: user.id?.toString() || 'unknown',
        userName: user.fullName || user.email,
        action,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  };

  return { logAction };
}
