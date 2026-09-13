import { useAuth } from '../context/AuthContext';

export function useScopedDb() {
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  return { schoolId };
}
