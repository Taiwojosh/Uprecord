import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

import { auth as firebaseAuth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';

interface User {
  id: string;
  email: string;
  role: string;
  schoolId: string;
  fullName?: string;
  studentId?: number;
  isAdmin?: boolean;
}

interface School {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  school: School | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Validate the current session by calling GET /api/auth/me.
   * HttpOnly cookies are automatically sent with withCredentials: true.
   * This is the ONLY source of truth — never trust unauthenticated localStorage.
   */
  const validateSession = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const { user: serverUser, school: serverSchool } = response.data;

      setUser({
        id: serverUser.id.toString(),
        email: serverUser.email,
        role: serverUser.role,
        schoolId: serverUser.schoolId,
        fullName: serverUser.fullName,
        studentId: serverUser.studentId,
        isAdmin: serverUser.isAdmin,
      });
      setSchool(serverSchool);

      localStorage.setItem('scholarSync_user', JSON.stringify(serverUser));
    } catch {
      // Unauthenticated or expired session
      localStorage.removeItem('scholarSync_user');
      setUser(null);
      setSchool(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ensure anonymous firebase authentication for firestore sync rules if configured
    if (firebaseAuth && !firebaseAuth.currentUser) {
      signInAnonymously(firebaseAuth).catch(err => console.warn('Firebase anonymous auth notice:', err?.message));
    }

    validateSession();
  }, [validateSession]);

  /**
   * Login: authenticates against the backend API.
   * The server sets an HttpOnly Secure SameSite cookie.
   */
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: serverUser, school: serverSchool } = response.data;

      localStorage.setItem('scholarSync_user', JSON.stringify(serverUser));

      setUser({
        id: serverUser.id.toString(),
        email: serverUser.email,
        role: serverUser.role,
        schoolId: serverUser.schoolId,
        fullName: serverUser.fullName,
        studentId: serverUser.studentId,
        isAdmin: serverUser.isAdmin,
      });
      setSchool(serverSchool);

      return { success: true };
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Login failed. Please check your credentials.';
      return { success: false, error: message };
    }
  }, []);

  /**
   * Logout: informs the backend to clear the HttpOnly cookie and clears local state.
   */
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Backend logout call error:', err);
    } finally {
      localStorage.removeItem('scholarSync_user');
      setUser(null);
      setSchool(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, school, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
