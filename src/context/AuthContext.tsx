import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

import { db } from '../db/db';
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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const storedUser = localStorage.getItem('scholarSync_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Verify user still exists in DB
        const dbUser = await db.users.where('email').equalsIgnoreCase(parsedUser.email).first();
        if (dbUser) {
          setUser({
            ...dbUser,
            id: dbUser.id?.toString() || 'unknown'
          } as User);
        } else {
          // Fallback to stored user if DB is not updated yet (for new local setups)
          setUser(parsedUser);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to resolve local user', error);
      localStorage.removeItem('scholarSync_token');
      localStorage.removeItem('scholarSync_user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Ensure anonymous firebase authentication for firestore sync rules
    if (firebaseAuth && !firebaseAuth.currentUser) {
      signInAnonymously(firebaseAuth).catch(err => console.warn('Firebase anonymous auth failed', err));
    }

    const token = localStorage.getItem('scholarSync_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (token: string, user: User) => {
    localStorage.setItem('scholarSync_token', token);
    
    // Ensure ID is a string for the interface
    const authUser: User = {
      ...user,
      id: user.id.toString()
    };
    
    localStorage.setItem('scholarSync_user', JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem('scholarSync_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
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
