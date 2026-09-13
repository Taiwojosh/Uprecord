cat << 'INNER_EOF' > fix.txt
              <div className="space-y-3">
                <label className="text-[0.625rem] font-bold uppercase text-slate-400 tracking-widest ml-1">Target Term</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTerm(t)}
                      className={`py-3 rounded-xl font-bold text-[0.625rem] uppercase tracking-widest transition-all ${
                        selectedTerm === t ? 'bg-white text-slate-900 shadow-xl' : 'bg-slate-800 text-slate-500 hover:text-white'
                      }`}
                    >
                      Term {t}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => navigate('/report-cards')}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-[0.625rem] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95">
                <Download size={16} />
                Generate Transcript
              </button>
              <button 
                onClick={() => navigate('/lesson-notes')}
                className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-[0.625rem] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95">
                <BookOpen size={16} />
                Read Lesson Notes
              </button>
INNER_EOF
sed -i '250,263c\
'"$(cat fix.txt | sed 's/$/\\/')"'' src/pages/StudentPortalPage.tsx
