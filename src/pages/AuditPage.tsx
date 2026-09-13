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
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <PageHeader 
          title="System Audit Trail" 
          subtitle="Transparent history of all administrative and registry actions" 
        />
        <button 
          onClick={() => setIsClearConfirmOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 text-[0.625rem] font-black uppercase tracking-widest rounded-2xl hover:bg-rose-100 transition-all border border-rose-100"
        >
          <Trash2 size={16} />
          Wipe Log Master
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            placeholder="Search by professional, action or specific details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm text-gray-900 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/50">
                     <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                     <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Actor</th>
                     <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Action Command</th>
                     <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Registry Details</th>
                     <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-right">Channel</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {logs.map(log => (
                    <tr key={log.id} className="group hover:bg-gray-50/50 transition-colors">
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-gray-400 font-mono text-[0.625rem]">
                             <Clock size={12} />
                             {new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[0.625rem] font-black italic">
                                {log.userName[0]}
                             </div>
                             <p className="text-xs font-black text-gray-900">{log.userName}</p>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-widest border ${
                            log.action.toLowerCase().includes('delete') ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                            log.action.toLowerCase().includes('add') || log.action.toLowerCase().includes('create') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                             {log.action}
                          </span>
                       </td>
                       <td className="px-8 py-6">
                          <p className="text-[0.6875rem] font-medium text-gray-500 leading-relaxed max-w-xs truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:max-w-none transition-all">
                             {log.details}
                          </p>
                       </td>
                       <td className="px-8 py-6 text-right">
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
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-50 text-slate-600'
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4 group hover:border-blue-100 transition-all">
       <div className="flex items-center justify-between">
          <div className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center`}>
             <Icon size={20} />
          </div>
          <p className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">{label}</p>
       </div>
       <div>
          <p className="text-2xl font-black text-gray-900 tracking-tight italic">{value}</p>
          <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mt-1">{detail}</p>
       </div>
    </div>
  );
}

