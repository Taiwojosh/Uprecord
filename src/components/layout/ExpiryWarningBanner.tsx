import React, { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { verifyLicense } from '../../lib/licensing';

export const ExpiryWarningBanner: React.FC = () => {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const check = async () => {
      const email = localStorage.getItem('uprecord_license_email') || localStorage.getItem('scholarsync_license_email') || localStorage.getItem('kardian_license_email');
      const key = localStorage.getItem('uprecord_license_key') || localStorage.getItem('scholarsync_license_key') || localStorage.getItem('kardian_license_key');
      
      if (email && key) {
        const status = await verifyLicense(email, key);
        if (status.isValid && status.expiresAt && status.expiresAt !== 'lifetime') {
          const days = Math.ceil((new Date(status.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          setDaysRemaining(days);
        }
      }
    };
    check();
  }, []);

  if (daysRemaining === null || daysRemaining > 7 || !isVisible) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium">
              Your license expires in <span className="font-bold">{daysRemaining} days</span>. 
              Renew now to avoid service interruption.
            </p>
          </div>
        <div className="flex items-center gap-4">
          <a 
            href="/license" 
            className="inline-flex items-center gap-1 text-sm font-bold text-amber-900 hover:text-amber-700 transition-colors"
          >
            Renew License
            <ArrowRight className="w-4 h-4" />
          </a>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
