import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BrandProvider } from './context/BrandContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext.tsx';
import { ImmersiveProvider } from './context/ImmersiveContext.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <BrandProvider>
            <ImmersiveProvider>
              <App />
            </ImmersiveProvider>
            </BrandProvider>
          </AuthProvider>
        </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
