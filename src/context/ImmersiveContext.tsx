import React, { createContext, useContext, useState, useEffect } from 'react';

interface ImmersiveContextType {
  isImmersive: boolean;
  setImmersive: (value: boolean) => void;
  toggleImmersive: () => void;
}

const ImmersiveContext = createContext<ImmersiveContextType | undefined>(undefined);

export const ImmersiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isImmersive, setIsImmersive] = useState<boolean>(() => {
    return localStorage.getItem('immersive_mode') === 'true';
  });

  const setImmersive = (value: boolean) => {
    setIsImmersive(value);
    localStorage.setItem('immersive_mode', String(value));
  };

  const toggleImmersive = () => {
    setImmersive(!isImmersive);
  };

  // Keyboard shortcut Listener: Escape key to exit immersive mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImmersive) {
        setImmersive(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImmersive]);

  return (
    <ImmersiveContext.Provider value={{ isImmersive, setImmersive, toggleImmersive }}>
      {children}
    </ImmersiveContext.Provider>
  );
};

export const useImmersiveMode = () => {
  const context = useContext(ImmersiveContext);
  if (context === undefined) {
    throw new Error('useImmersiveMode must be used within an ImmersiveProvider');
  }
  return context;
};
