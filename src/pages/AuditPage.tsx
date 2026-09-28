import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { 
  History, 
  ShieldCheck, 
  Search, 
  Filter, 
  User, 
  Clock, 
  Activity,
  ChevronRight,
  Database,
  Trash2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const AuditPage: React.FC = () => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const logs = useLiveQuery(async () => {
    let collection = db.auditLogs.orderBy('timestamp').reverse();
    const allLogs = await collection.toArray();
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      return allLogs.filter(l => 
        l.userName.toLowerCase().includes(lower) || 
        l.action.toLowerCase().includes(lower) || 
        l.details.toLowerCase().includes(lower)
      );
    }
    return allLogs;
  }, [searchTerm]) ?? [];

  const handleClearLogs = async () => {
    try {
      await db.auditLogs.clear();
      showToast('Audit trail cleared successfully', 'success');
    } catch (e) {
      showToast('Failed to clear logs', 'error');
    } finally {
      setIsClearConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <PageHeader 
          title="System Audit Trail" 
          subtitle="Transparent history of all administrative and registry actions" 
        />
        <button 
          onClick={() => setIsClearConfirmOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border border-rose-200/60 dark:border-rose-900/60 shadow-sm"
        >
          <Trash2 size={14} />
          Clear Audit Trail
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
         <AuditStatsCard 
           icon={Activity} 
           label="Total Events" 
           value={logs.length} 
           detail="Indexed Actions"
           color="blue"
         />
         <AuditStatsCard 
           icon={ShieldCheck} 
           label="Security Triggers" 
           value={logs.filter(l => l.action.toLowerCase().includes('admin') || l.action.toLowerCase().includes('delete')).length} 
           detail="Critical Events"
           color="amber"
         />
         <AuditStatsCard 
           icon={Clock} 
           label="Uptime" 
           value="100%" 
           detail="System Health"
           color="emerald"
         />
         <AuditStatsCard 
           icon={Database} 
           label="Storage" 
           value={`${(JSON.stringify(logs).length / 1024).toFixed(1)} KB`} 
           detail="Local Registry"
           color="slate"
         />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by actor, action, or specific details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/50">
                     <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                     <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actor</th>
                     <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action Command</th>
                     <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registry Details</th>
                     <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Channel</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {logs.map(log => (
                    <tr key={log.id} className="group hover:bg-gray-50/50 transition-colors">
                       <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-xs">
                             <Clock size={12} />
                             {new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                       </td>
                       <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[0.625rem] font-black italic">
                                {log.userName[0]}
                             </div>
                             <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{log.userName}</p>
                          </div>
                       </td>
                       <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            log.action.toLowerCase().includes('delete') ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 
                            log.action.toLowerCase().includes('add') || log.action.toLowerCase().includes('create') ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          }`}>
                             {log.action}
                          </span>
                       </td>
                       <td className="px-5 py-3.5">
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm truncate group-hover:whitespace-normal group-hover:max-w-none transition-all">
                             {log.details}
                          </p>
                       </td>
                       <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg text-[0.5625rem] font-black text-gray-400 uppercase tracking-widest border border-gray-100">
                             Local Master
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {logs.length === 0 && (
           <div className="p-24 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto">
                 <History size={40} />
              </div>
              <div className="max-w-xs mx-auto">
                 <h3 className="text-lg font-black text-gray-900 uppercase italic">Clean Registry</h3>
                 <p className="text-gray-400 text-sm font-medium leading-relaxed">No actions have been recorded in the audit trail yet.</p>
              </div>
           </div>
         )}
      </div>

      <ConfirmDialog 
        isOpen={isClearConfirmOpen}
        title="Wipe Audit Registry"
        message="This will permanently delete all event logs. This action cannot be reversed and should only be performed for system maintenance."
        onConfirm={handleClearLogs}
        onClose={() => setIsClearConfirmOpen(false)}
      />
    </div>
  );
};

const AuditStatsCard: React.FC<{ icon: any, label: string, value: string | number, detail: string, color: string }> = ({ icon: Icon, label, value, detail, color }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5 transition-all">
       <div className="flex items-center justify-between">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colors[color]}`}>
             <Icon size={16} />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
       </div>
       <div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">{detail}</p>
       </div>
    </div>
  );
};

