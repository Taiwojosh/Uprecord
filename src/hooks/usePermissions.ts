import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const canManageRegistry = isAdmin || (isTeacher && user?.isAdmin);
  
  return {
    isAdmin,
    isTeacher,
    canManageRegistry,
    user
  };
}
