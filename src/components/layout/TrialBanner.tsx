import React, { useState, useEffect } from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { verifyLicense } from '../../lib/licensing';

export const TrialBanner: React.FC = () => {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      const email = localStorage.getItem('uprecord_license_email') || localStorage.getItem('scholarsync_license_email') || localStorage.getItem('kardian_license_email');
      const key = localStorage.getItem('uprecord_license_key') || localStorage.getItem('scholarsync_license_key') || localStorage.getItem('kardian_license_key');
      
      if (email && key) {
        const status = await verifyLicense(email, key);
        // We can assume if it's a short duration it might be a trial
        if (status.isValid && status.expiresAt && status.expiresAt !== 'lifetime') {
          const days = Math.ceil((new Date(status.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          // If it's a trial, it's usually 5 days
          if (days <= 5) {
            setDaysRemaining(days);
          }
        }
      }
    };
    check();
  }, []);

  if (daysRemaining === null) {
    return null;
  }

  return (
    <div className="bg-indigo-600 px-4 py-2 sm:px-6 lg:px-8 shadow-sm border-b border-indigo-500/20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-white">
          <div className="p-1 bg-white/20 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
          </div>
          <p className="text-sm font-bold tracking-tight">
            Free Trial Mode: <span className="text-indigo-100 font-medium">{daysRemaining} days remaining</span>. 
            Unlock full features today!
          </p>
        </div>
        <div className="flex items-center">
          <a 
            href="/license" 
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-700 text-xs font-black uppercase tracking-widest rounded-full hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
          >
            Upgrade Now
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
