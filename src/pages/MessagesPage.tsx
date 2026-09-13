import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { 
  Bell, 
  Send, 
  Plus, 
  Search, 
  Filter, 
  Users, 
  GraduationCap, 
  Megaphone,
  Trash2,
  MoreVertical,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'broadcast' | 'alerts'>('broadcast');

  const handleSend = () => {
    showToast('Broadcast dispatched successfully', 'success');
  };

  const dummyMessages = [
    { id: 1, title: 'Term 2 Opening Notice', target: 'Everyone', date: '2 hours ago', status: 'delivered' },
    { id: 2, title: 'Staff Briefing: New Results Protocol', target: 'Teachers only', date: 'Yesterday', status: 'seen' },
    { id: 3, title: 'Fee Payment Reminders', target: 'Parents/Students', date: '3 days ago', status: 'delivered' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <PageHeader 
          title="Global Broadcasts" 
          subtitle="Communicate important protocols and notices across the school network" 
        />
        {(user?.role === 'admin' || user?.isAdmin) && (
          <button 
            onClick={handleSend}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white text-[0.625rem] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
          >
            <Plus size={18} />
            New Announcement
          </button>
        )}
      </div>

      <div className="flex items-center gap-6 border-b border-gray-100 overflow-x-auto scrollbar-none flex-nowrap whitespace-nowrap">
         {(['broadcast', 'alerts'] as const).map(tab => (
           <button 
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`pb-4 text-[0.625rem] font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === tab ? 'text-gray-900 border-b-2 border-slate-900' : 'text-gray-400 hover:text-gray-600'}`}
           >
             {tab === 'broadcast' ? 'Announcement Log' : 'System Alerts'}
           </button>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         <div className={`lg:col-span-${(user?.role === 'admin' || user?.isAdmin) ? '8' : '12'} space-y-6`}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Filter communications by subject or recipient..."
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none font-bold text-sm"
                />
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
               <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-[0.625rem] font-black uppercase tracking-widest text-gray-400">Communication History</p>
                  <Filter size={14} className="text-gray-300" />
               </div>
               <div className="divide-y divide-gray-50">
                  {dummyMessages.map(msg => (
                    <div key={msg.id} className="p-8 hover:bg-gray-50/50 transition-all group flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 group-hover:border-blue-100 transition-all shadow-sm">
                             <Megaphone size={24} />
                          </div>
                          <div>
                             <h4 className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase italic">{msg.title}</h4>
                             <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                                   <Users size={12} />
                                   {msg.target}
                                </span>
                                <span className="flex items-center gap-1 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                                   <Calendar size={12} />
                                   {msg.date}
                                </span>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-6">
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.5rem] font-black uppercase tracking-widest ${msg.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                             {msg.status === 'delivered' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                             {msg.status}
                          </div>
                          <button className="p-2 text-gray-300 hover:text-gray-900 transition-colors">
                             <MoreVertical size={18} />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {(user?.role === 'admin' || user?.isAdmin) && (
           <div className="lg:col-span-4">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-8 sticky top-8 shadow-2xl">
                 <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase italic">Fast Dispatch</h3>
                    <p className="text-[0.625rem] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Instantly blast a notification to your entire school ecosystem</p>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Dispatch Target</label>
                       <select className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all text-sm">
                          <option className="bg-slate-900">All Professionals & Students</option>
                          <option className="bg-slate-900">Faculty Only</option>
                          <option className="bg-slate-900">Parents/Guardians Only</option>
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Message Content</label>
                       <textarea 
                         rows={4}
                         placeholder="Compose broadcast protocol..."
                         className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all text-sm resize-none"
                       />
                    </div>

                    <button 
                      onClick={handleSend}
                      className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-3xl transition-all uppercase tracking-[0.2em] italic text-xs shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
                    >
                       <Send size={18} strokeWidth={3} />
                       Dispatch Protocol
                    </button>
                 </div>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

