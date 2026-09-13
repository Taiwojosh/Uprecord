import { db } from '../db/db';

// --- DIRECT GOOGLE SHEETS CONNECTION ---
// When compiling to APK/EXE, the app will use this URL directly instead of a backend server.
// If you change your Google Script URL, update it here before compiling!
const SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || 'https://script.google.com/macros/s/AKfycbw_010OUrzuiXUTn9V5rjDLzXbd-6ajWCZ4Y029esQJy-1FhCnLg-TGjc-n41fOGlmT/exec';

export interface LicenseStatus {
  isValid: boolean;
  expiresAt: string | null;
  plan?: string;
  error?: string;
}

// 1. Generate a unique Hardware ID for this machine
export const getHardwareId = (): string => {
  let hwid = localStorage.getItem('uprecord_hwid') || localStorage.getItem('scholarsync_hwid') || localStorage.getItem('kardian_hwid');
  if (!hwid) {
    const isCryptoValid = typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function';
    const uuid = isCryptoValid 
      ? window.crypto.randomUUID() 
      : 'xxxx-xxxx-xxxx-xxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }) + '-' + Date.now().toString(36);
    hwid = 'HWID-' + uuid;
    localStorage.setItem('uprecord_hwid', hwid);
  }
  return hwid;
};

// 2. Anti-Time-Travel Logic
export const checkTimeIntegrity = (): { isValid: boolean; lastSeen: string } => {
  const now = new Date().getTime();
  const lastSeenStr = localStorage.getItem('uprecord_last_seen') || localStorage.getItem('scholarsync_last_seen') || localStorage.getItem('kardian_last_seen');
  const lastSeen = lastSeenStr ? parseInt(lastSeenStr, 10) : 0;

  if (now < lastSeen) {
    return { isValid: false, lastSeen: new Date(lastSeen).toLocaleString() };
  }

  localStorage.setItem('uprecord_last_seen', now.toString());
  return { isValid: true, lastSeen: new Date(now).toLocaleString() };
};

// 3. Verify License (Direct to Google Sheets)
let lastFailureTime = 0;
const FAILURE_COOLDOWN = 30000;

export const getSheetUrl = () => SHEET_URL;

export const verifyLicense = async (email: string, key: string): Promise<LicenseStatus> => {
  // Always return verified premium status
  return { isValid: true, expiresAt: 'lifetime', plan: 'premium' };
};

// 4. Activate License (First time)
export const activateLicense = async (email: string, key: string): Promise<LicenseStatus> => {
  localStorage.setItem('uprecord_license_email', email);
  localStorage.setItem('uprecord_license_key', key);
  localStorage.setItem('uprecord_license_plan', 'premium');
  localStorage.setItem('uprecord_last_verified', new Date().getTime().toString());
  localStorage.setItem('uprecord_license_expires_at', 'lifetime');
  return { isValid: true, expiresAt: 'lifetime', plan: 'premium' };
};

// 5. Register Manual License Request
export const registerManualLicense = async (email: string, key: string, plan: string): Promise<{ success: boolean; error?: string }> => {
  const hwid = getHardwareId();
  
  if (SHEET_URL && !SHEET_URL.endsWith('/exec')) {
    return { 
      success: false, 
      error: 'Invalid Google Script URL. Your URL must end in "/exec". Please check your deployment settings.' 
    };
  }

  try {
    let response;
    
    if (SHEET_URL && SHEET_URL.includes('script.google.com')) {
      const fetchUrl = `${SHEET_URL}?action=register&email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}&hwid=${encodeURIComponent(hwid)}&plan=${encodeURIComponent(plan)}&cb=${Date.now()}`;
      response = await fetch(fetchUrl);
      const text = await response.text();
      
      console.log('Registration Response:', text);

      if (text.trim() === 'success') return { success: true };
      if (text.trim() === 'exists') return { success: false, error: 'License key already exists.' };
      
      // If the script returned an error message starting with "Error:"
      if (text.startsWith('Error:')) return { success: false, error: text };
      
      return { success: false, error: 'Registration failed: ' + text };
    } else {
      response = await fetch('/api/license/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, key, hwid, plan })
      });
      const data = await response.json();
      if (response.ok) return { success: true };
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
};

// 6. Start Trial (Generates a key and registers it)
export const startTrial = async (email: string): Promise<LicenseStatus & { licenseKey?: string }> => {
  try {
    const trialKey = 'UPR-TRIAL-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const result = await registerManualLicense(email, trialKey, 'trial');
    
    if (result.success) {
      // For trials, we assume it's active immediately for 5 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);
      
      // Attempt to activate it immediately
      const activation = await activateLicense(email, trialKey);
      if (activation.isValid) {
        return { isValid: true, expiresAt: activation.expiresAt, plan: 'trial', licenseKey: trialKey };
      }
      return { isValid: false, expiresAt: null, error: activation.error || 'Trial registered but activation failed.' };
    }
    return { isValid: false, expiresAt: null, error: result.error || 'Failed to start trial' };
  } catch (error) {
    return { isValid: false, expiresAt: null, error: 'Network error' };
  }
};
