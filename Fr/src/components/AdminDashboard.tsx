import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Newspaper, Ban, CheckCircle, Search, Loader2, Plus, Trash2, ShoppingBag, X, Save, FileText, Edit, Flag, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData { _id: string; name: string; email: string; role: string; isBanned: boolean; avatar?: string; strikes?: number; }
interface ListingData { _id: string; title: string; category: string; price: string; seller: string; sellerEmail: string; images: string[]; posted: string; reportedBy?: string[]; }
interface StoryData { _id: string; title: string; role: string; organization: string; excerpt: string; content: string; date: string; postedAt: string; }
interface ReportedMessage { _id: string; author: string; message: string; imageUrl?: string; room: string; reportedBy: string[]; timestamp: string; }

const API_URL = (import.meta as any).env.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/api` : 'https://football-backend-m2a4.onrender.com/api';

export function AdminDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'news' | 'reports'>('users');
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [stories, setStories] = useState<StoryData[]>([]);
  const [reportedMessages, setReportedMessages] = useState<ReportedMessage[]>([]);
  const [reportedListings, setReportedListings] = useState<ListingData[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showStoryModal, setShowStoryModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStory, setNewStory] = useState({ title: '', role: '', organization: '', excerpt: '', content: '', date: '' });

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
        setLoading(true);
        const resUsers = await fetch(`${API_URL}/admin/users`);
        if (resUsers.ok) setUsers(await resUsers.json());
        
        const resListings = await fetch(`${API_URL}/listings`);
        if (resListings.ok) setListings(await resListings.json());
        
        const resStories = await fetch(`${API_URL}/stories`);
        if (resStories.ok) setStories(await resStories.json());

        const resReports = await fetch(`${API_URL}/admin/reported-messages`);
        if (resReports.ok) setReportedMessages(await resReports.json());

        const resRepListings = await fetch(`${API_URL}/admin/reported-listings`);
        if (resRepListings.ok) setReportedListings(await resRepListings.json());

    } catch (err) { toast.error("Eroare la încărcarea datelor."); } 
    finally { setLoading(false); }
  };

  const handleToggleBan = async (id: string, currentStatus: boolean, name: string) => {
    if (!window.confirm(`Schimbi statusul pentru ${name}?`)) return;
    try {
        const res = await fetch(`${API_URL}/admin/users/${id}/ban`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
            setUsers(prev => prev.map(u => u._id === id ? { ...u, isBanned: !u.isBanned } : u));
            toast.success("Status actualizat!");
        }
    } catch (err) { toast.error("Eroare server."); }
  };

  const handleDeleteListing = async (id: string, title: string) => {
      if(!window.confirm(`Ștergi anunțul "${title}"?`)) return;
      try {
          const res = await fetch(`${API_URL}/listings/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) });
          if(res.ok) {
              setListings(prev => prev.filter(l => l._id !== id));
              setReportedListings(prev => prev.filter(l => l._id !== id));
              toast.success("Anunț șters.");
          }
      } catch (err) { toast.error("Eroare server."); }
  };

  const handleAddStrike = async (authorName: string) => {
      if(!window.confirm(`Adaugi o abatere permanentă pentru ${authorName}?`)) return;
      try {
          const res = await fetch(`${API_URL}/admin/users/strike`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: authorName })
          });
          if(res.ok) {
              toast.success(`Abatere (Cartonaș Galben) adăugată pentru ${authorName}!`);
              fetchInitialData();
          }
      } catch (err) { toast.error("Eroare la adăugarea abaterii."); }
  };

  const handleDeleteReportedMessage = async (id: string) => {
      if(!window.confirm("Ștergi definitiv acest mesaj? Autorul va primi un avertisment automat.")) return;
      try {
          const res = await fetch(`${API_URL}/messages/${id}`, { 
              method: 'DELETE', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user: user.name, userRole: user.role, email: user.email })
          });
          if(res.ok) {
              setReportedMessages(prev => prev.filter(m => m._id !== id));
              toast.success("Mesaj șters! Autorul a primit cartonașul.");
          }
      } catch (err) { toast.error("Eroare la ștergerea mesajului."); }
  };

  const handleDismissReport = async (id: string) => {
      try {
          const res = await fetch(`${API_URL}/messages/${id}/dismiss-report`, { method: 'POST' });
          if(res.ok) {
              setReportedMessages(prev => prev.filter(m => m._id !== id));
              toast.success("Avantaj lăsat (Raport ignorat).");
          }
      } catch (err) { toast.error("Eroare la procesare."); }
  };

  const handleDismissListingReport = async (id: string) => {
      try {
          const res = await fetch(`${API_URL}/listings/${id}/dismiss-report`, { method: 'POST' });
          if(res.ok) {
              setReportedListings(prev => prev.filter(l => l._id !== id));
              toast.success("Avantaj lăsat (Raport ignorat).");
          }
      } catch (err) { toast.error("Eroare la procesare."); }
  };

  const openAddModal = () => {
      setEditingId(null);
      setNewStory({ title: '', role: '', organization: '', excerpt: '', content: '', date: '' });
      setShowStoryModal(true);
  };

  const openEditModal = (story: StoryData) => {
      setEditingId(story._id);
      setNewStory({ title: story.title, role: story.role, organization: story.organization, excerpt: story.excerpt, content: story.content, date: story.date });
      setShowStoryModal(true);
  };

  const handleSaveStory = async () => {
      if(!newStory.title || !newStory.excerpt) return toast.error("Completează datele esențiale!");
      try {
          let res;
          if (editingId) {
              res = await fetch(`${API_URL}/admin/stories/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newStory) });
          } else {
              res = await fetch(`${API_URL}/admin/stories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newStory) });
          }

          if(res.ok) {
              const savedStory = await res.json();
              if (editingId) {
                  setStories(prev => prev.map(s => s._id === editingId ? savedStory : s));
                  toast.success("Erou actualizat pe panou!");
              } else {
                  setStories([savedStory, ...stories]);
                  toast.success("Erou transferat pe teren!");
              }
              setShowStoryModal(false);
          }
      } catch(err) { toast.error("Eroare la transfer."); }
  };

  const handleDeleteStory = async (id: string) => {
      if(!window.confirm("Ștergi acest erou de pe teren?")) return;
      try {
          const res = await fetch(`${API_URL}/admin/stories/${id}`, { method: 'DELETE' });
          if(res.ok) {
              setStories(prev => prev.filter(s => s._id !== id));
              toast.success("Erou retras.");
          }
      } catch(err) { toast.error("Eroare."); }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredListings = listings.filter(l => l.title.toLowerCase().includes(searchTerm.toLowerCase()) || l.seller.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredStories = stories.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalReports = reportedMessages.length + reportedListings.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 relative">
        
        {/* FUNDAL SPORTIV (Sediul Central) */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-3xl opacity-[0.03] dark:opacity-[0.05]">
           <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,#000_20px,#000_22px)]"></div>
        </div>

        {/* HEADER TACTIC */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border-b-4 border-rose-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,rgba(225,29,72,0.3),transparent_70%)]"></div>
            
            <div className="relative z-10 text-center md:text-left">
                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-2 flex items-center justify-center md:justify-start gap-3 drop-shadow-md">
                    <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-rose-500" /> 
                    Comisia <span className="text-rose-500">Centrală</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs sm:text-sm">
                    Panoul de control / Arbitraj și Transferuri
                </p>
            </div>

            <div className="flex gap-2 sm:gap-3 flex-wrap mt-6 md:mt-0 justify-center relative z-10">
                <div className="bg-slate-950 p-2 sm:p-3 rounded-2xl border-2 border-slate-800 text-center min-w-[70px] sm:min-w-[80px] shadow-inner">
                    <div className="text-xl sm:text-2xl font-black">{users.length}</div>
                    <div className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Useri</div>
                </div>
                <div className="bg-slate-950 p-2 sm:p-3 rounded-2xl border-2 border-slate-800 text-center min-w-[70px] sm:min-w-[80px] shadow-inner">
                    <div className="text-xl sm:text-2xl font-black text-blue-500">{listings.length}</div>
                    <div className="text-[9px] sm:text-[10px] font-black text-blue-500/70 uppercase tracking-widest mt-1">Anunțuri</div>
                </div>
                <div className="bg-slate-950 p-2 sm:p-3 rounded-2xl border-2 border-slate-800 text-center min-w-[70px] sm:min-w-[80px] shadow-inner">
                    <div className="text-xl sm:text-2xl font-black text-emerald-500">{stories.length}</div>
                    <div className="text-[9px] sm:text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mt-1">Articole</div>
                </div>
                <div className="bg-rose-950/40 p-2 sm:p-3 rounded-2xl border-2 border-rose-900/50 text-center min-w-[70px] sm:min-w-[80px] relative shadow-inner">
                    {totalReports > 0 && <span className="absolute -top-2 -right-2 bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.8)] border border-rose-400">{totalReports}</span>}
                    <div className="text-xl sm:text-2xl font-black text-amber-500">{totalReports}</div>
                    <div className="text-[9px] sm:text-[10px] font-black text-amber-500/70 uppercase tracking-widest mt-1">VAR</div>
                </div>
            </div>
        </div>

        {/* MENIU TACTIC */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 border-b-2 border-slate-200 dark:border-slate-800 scrollbar-hide">
            {[
                { id: 'users', label: 'Echipe / Lot', icon: Users },
                { id: 'listings', label: 'Piața Transferuri', icon: ShoppingBag },
                { id: 'news', label: 'Sala Trofeelor', icon: Newspaper },
                { id: 'reports', label: `Camera VAR (${totalReports})`, icon: AlertTriangle }
            ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`px-4 sm:px-6 py-3 font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2.5 whitespace-nowrap text-xs sm:text-sm border-2 ${
                            isActive 
                            ? 'bg-rose-600 border-rose-500 text-white shadow-[0_4px_15px_rgba(225,29,72,0.3)] translate-y-[-2px]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-rose-500/50 hover:text-rose-500'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-white' : (tab.id === 'reports' && totalReports > 0 ? 'text-amber-500 animate-pulse' : '')}`}/>
                        {tab.label}
                    </button>
                )
            })}
        </div>

        {/* CONTENT */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-6 min-h-[500px]">
            {activeTab !== 'reports' && (
                <div className="relative max-w-lg mb-6 mx-auto sm:mx-0">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="text-slate-400 w-5 h-5" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="CAUTĂ (NUME, EMAIL SAU TITLU)..." 
                        className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-rose-500 dark:focus:border-rose-500 transition-colors font-black uppercase tracking-widest text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            {loading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-4">
                    <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-black uppercase tracking-widest text-slate-500">Se preiau datele oficiale...</p>
                </div>
            ) : (
                <>
                {/* 1. USERS TAB (Lista de jucători) */}
                {activeTab === 'users' && (
                    <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] sm:text-xs">
                                <tr>
                                    <th className="p-4 sm:p-5">Jucător / Cont</th>
                                    <th className="p-4 sm:p-5 hidden md:table-cell">Contact</th>
                                    <th className="p-4 sm:p-5 text-center">Cartonașe</th>
                                    <th className="p-4 sm:p-5">Eligibilitate</th>
                                    <th className="p-4 sm:p-5 text-right">Arbitraj</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                                {filteredUsers.map(u => (
                                    <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 sm:p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-slate-600 dark:text-slate-300 overflow-hidden border border-slate-300 dark:border-slate-600 shadow-sm shrink-0">
                                                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover"/> : u.name[0].toUpperCase()}
                                                </div>
                                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs sm:text-sm">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 sm:p-5 text-slate-500 font-bold text-xs hidden md:table-cell">{u.email}</td>
                                        <td className="p-4 sm:p-5 text-center">
                                            <span className={`inline-flex items-center justify-center w-6 h-8 rounded-sm font-black shadow-sm border ${u.strikes && u.strikes > 0 ? 'bg-amber-400 text-slate-900 border-amber-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent'}`}>
                                                {u.strikes || 0}
                                            </span>
                                        </td>
                                        <td className="p-4 sm:p-5">
                                            {u.isBanned 
                                            ? <span className="text-rose-600 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">Suspendat</span> 
                                            : <span className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">Titular</span>}
                                        </td>
                                        <td className="p-4 sm:p-5 text-right">
                                            {u.email !== user.email && (
                                                <button 
                                                    onClick={() => handleToggleBan(u._id, u.isBanned, u.name)} 
                                                    title={u.isBanned ? "Ridică suspendarea" : "Cartonaș Roșu (Ban)"}
                                                    className="inline-flex p-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-500 transition-colors shadow-sm"
                                                >
                                                    <Ban className="w-4 h-4 sm:w-5 sm:h-5 font-bold"/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && <div className="text-center py-10 font-bold text-slate-500 uppercase tracking-widest">Niciun jucător găsit.</div>}
                    </div>
                )}

                {/* 2. LISTINGS TAB (Piața de transferuri/anunțuri) */}
                {activeTab === 'listings' && (
                     <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] sm:text-xs">
                                <tr>
                                    <th className="p-4 sm:p-5">Articol / Categorie</th>
                                    <th className="p-4 sm:p-5">Cotă (Preț)</th>
                                    <th className="p-4 sm:p-5 hidden sm:table-cell">Impresar (Vânzător)</th>
                                    <th className="p-4 sm:p-5 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                                {filteredListings.map(l => (
                                    <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 sm:p-5">
                                            <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs sm:text-sm">{l.title}</div>
                                            <div className="text-[10px] font-black text-blue-500 mt-1 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded w-fit border border-blue-200 dark:border-blue-800">{l.category}</div>
                                        </td>
                                        <td className="p-4 sm:p-5 font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">{l.price}</td>
                                        <td className="p-4 sm:p-5 text-slate-500 font-bold text-xs hidden sm:table-cell uppercase">{l.seller}</td>
                                        <td className="p-4 sm:p-5 text-right">
                                            <button 
                                                onClick={() => handleDeleteListing(l._id, l.title)} 
                                                className="inline-flex p-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-500 transition-colors shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredListings.length === 0 && <div className="text-center py-10 font-bold text-slate-500 uppercase tracking-widest">Niciun transfer activ.</div>}
                    </div>
                )}

                {/* 3. NEWS / HEROES TAB */}
                {activeTab === 'news' && (
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                            <h3 className="font-black text-lg sm:text-xl uppercase tracking-widest text-slate-900 dark:text-white">Lista Legendelor</h3>
                            <button 
                                onClick={openAddModal} 
                                className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 border-b-4 border-emerald-800 hover:bg-emerald-500 hover:translate-y-[2px] hover:border-b-2 transition-all"
                            >
                                <Plus className="w-4 h-4 font-bold" /> Legitimație Nouă
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {filteredStories.map(story => (
                                <div key={story._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors gap-4">
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="bg-white dark:bg-slate-900 text-emerald-500 p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                                            <Newspaper className="w-6 h-6 sm:w-8 sm:h-8"/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white uppercase tracking-tight truncate">{story.title}</div>
                                            <div className="text-xs text-slate-500 font-bold line-clamp-1 mt-1">{story.excerpt}</div>
                                            <div className="flex gap-2 mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                                <span className="bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">{story.role}</span>
                                                <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{story.organization}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                                        <button onClick={() => openEditModal(story)} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 hover:border-emerald-500 transition shadow-sm">
                                            <Edit className="w-4 h-4 sm:w-5 sm:h-5"/>
                                        </button>
                                        <button onClick={() => handleDeleteStory(story._id)} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-500 transition shadow-sm">
                                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredStories.length === 0 && <div className="text-center py-10 font-bold text-slate-500 uppercase tracking-widest">Niciun erou adăugat încă.</div>}
                        </div>
                    </div>
                )}

                {/* 4. TAB VAR (RAPORTĂRI) */}
                {activeTab === 'reports' && (
                    <div>
                        {/* Secțiunea Raportări Mesaje */}
                        <div className="mb-6">
                            <h3 className="font-black text-lg sm:text-xl flex items-center gap-2 uppercase tracking-widest text-slate-900 dark:text-white">
                                <Flag className="text-amber-500 w-6 h-6"/> Incidente Teren (Chat)
                            </h3>
                            <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase">Monitorizare derapaje reclamate de fani.</p>
                        </div>

                        <div className="grid gap-5 mb-12">
                            {reportedMessages.map(msg => (
                                <div key={msg._id} className="bg-rose-50/50 dark:bg-rose-900/10 p-4 sm:p-6 rounded-3xl border-2 border-rose-200 dark:border-rose-900/50 flex flex-col lg:flex-row justify-between gap-5 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
                                    <div className="flex-1 pl-2">
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className="font-black text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded-md uppercase tracking-widest">{msg.room === 'general_chat' ? 'Tribună (Hub)' : 'Peluza (Produs)'}</span>
                                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{msg.author}</span>
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-md">{new Date(msg.timestamp).toLocaleString('ro-RO')}</span>
                                        </div>
                                        
                                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                                            <div className="absolute top-2 right-3 text-4xl text-slate-200 dark:text-slate-800 font-serif leading-none">"</div>
                                            {msg.message && <div className="italic font-bold text-slate-700 dark:text-slate-300 relative z-10">{msg.message}</div>}
                                            {msg.imageUrl && (
                                                <div className="mt-4 relative z-10">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Probă Video/Foto (VAR):</span>
                                                    <img src={msg.imageUrl} alt="Conținut raportat" className="max-w-[200px] sm:max-w-[300px] max-h-48 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm object-cover" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                                            <Users className="w-4 h-4"/> Semnalat de {msg.reportedBy.length} spectatori
                                        </div>
                                    </div>
                                    <div className="flex lg:flex-col gap-2 justify-center shrink-0">
                                        <button onClick={() => handleAddStrike(msg.author)} className="flex-1 bg-white dark:bg-slate-800 text-amber-600 hover:text-amber-500 hover:border-amber-500 font-black uppercase text-[10px] sm:text-xs py-3 px-4 rounded-xl flex items-center gap-2 border-2 border-amber-200 dark:border-amber-900/50 justify-center shadow-sm transition">
                                            <div className="w-3 h-4 bg-amber-400 rounded-sm shadow-sm border border-amber-500"></div> Galben (+1)
                                        </button>
                                        <button onClick={() => handleDismissReport(msg._id)} className="flex-1 bg-white dark:bg-slate-800 text-emerald-600 hover:text-emerald-500 hover:border-emerald-500 font-black uppercase text-[10px] sm:text-xs py-3 px-4 rounded-xl flex items-center gap-2 border-2 border-emerald-200 dark:border-emerald-900/50 justify-center shadow-sm transition">
                                            <CheckCircle className="w-4 h-4"/> Avantaj
                                        </button>
                                        <button onClick={() => handleDeleteReportedMessage(msg._id)} className="flex-1 bg-rose-600 text-white hover:bg-rose-500 border-b-4 border-rose-800 hover:border-b-2 hover:translate-y-[2px] font-black uppercase text-[10px] sm:text-xs py-3 px-4 rounded-xl flex items-center gap-2 justify-center transition">
                                            <div className="w-3 h-4 bg-rose-500 rounded-sm shadow-sm border border-white"></div> Roșu (Șterge)
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {reportedMessages.length === 0 && (
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl text-center border-2 border-dashed border-slate-200 dark:border-slate-700">Fair-play total. Niciun mesaj la VAR.</p>
                            )}
                        </div>

                        {/* Secțiunea Raportări Anunțuri */}
                        <div className="mb-6 pt-8 border-t-2 border-slate-100 dark:border-slate-800">
                            <h3 className="font-black text-lg sm:text-xl flex items-center gap-2 uppercase tracking-widest text-slate-900 dark:text-white">
                                <ShoppingBag className="text-blue-500 w-6 h-6"/> Incidente Transferuri
                            </h3>
                            <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase">Piața de mercato raportată de comunitate.</p>
                        </div>
                        
                        <div className="grid gap-5">
                            {reportedListings.map(listing => (
                                <div key={listing._id} className="bg-blue-50/50 dark:bg-blue-900/10 p-4 sm:p-6 rounded-3xl border-2 border-blue-200 dark:border-blue-900/50 flex flex-col lg:flex-row justify-between gap-5 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                                    <div className="flex-1 pl-2">
                                        <div className="flex flex-wrap items-center gap-3 mb-2">
                                            <span className="font-black text-xs sm:text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-tight">{listing.title}</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase flex items-center gap-2">
                                            <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-[10px] tracking-widest text-slate-500">IMPRESAR:</span> 
                                            {listing.seller}
                                        </p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-1 uppercase">{listing.category} <span className="text-emerald-500 mx-2">•</span> {listing.price}</p>
                                        
                                        <div className="mt-4 text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                                            <Users className="w-4 h-4"/> Semnalat de {listing.reportedBy?.length || 0} utilizatori
                                        </div>
                                    </div>
                                    <div className="flex lg:flex-col gap-2 justify-center shrink-0">
                                        <button onClick={() => handleDismissListingReport(listing._id)} className="flex-1 bg-white dark:bg-slate-800 text-emerald-600 hover:text-emerald-500 hover:border-emerald-500 font-black uppercase text-[10px] sm:text-xs py-3 px-4 rounded-xl flex items-center gap-2 border-2 border-emerald-200 dark:border-emerald-900/50 justify-center shadow-sm transition">
                                            <CheckCircle className="w-4 h-4"/> Transfer Curat
                                        </button>
                                        <button onClick={() => handleDeleteListing(listing._id, listing.title)} className="flex-1 bg-rose-600 text-white hover:bg-rose-500 border-b-4 border-rose-800 hover:border-b-2 hover:translate-y-[2px] font-black uppercase text-[10px] sm:text-xs py-3 px-4 rounded-xl flex items-center gap-2 justify-center transition">
                                            <Trash2 className="w-4 h-4"/> Anulează Transfer
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {reportedListings.length === 0 && (
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl text-center border-2 border-dashed border-slate-200 dark:border-slate-700">Piața este liniștită.</p>
                            )}
                        </div>

                        {totalReports === 0 && reportedMessages.length === 0 && reportedListings.length === 0 && (
                            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 mt-6 relative overflow-hidden">
                                {/* SVG Minge cu Bifa */}
                                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,transparent_0,transparent_100px,#10b981_101px,#10b981_105px,transparent_106px)]"></div>
                                <div className="relative z-10 w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-500">
                                    <CheckCircle className="w-10 h-10"/>
                                </div>
                                <h4 className="font-black text-2xl uppercase tracking-widest text-slate-800 dark:text-white relative z-10">Meci Fără Incidente</h4>
                                <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest relative z-10">VAR-ul nu are nimic de analizat momentan.</p>
                            </div>
                        )}
                    </div>
                )}
                </>
            )}
        </div>

        {/* MODAL ADĂUGARE / EDITARE ȘTIRE (Formular de Legitimație) */}
        {showStoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[92vh] border-4 border-emerald-600/30">
                    
                    <div className="p-5 sm:p-6 border-b-4 border-emerald-500 flex justify-between items-center bg-slate-900 text-white relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#fff_10px,#fff_12px)]"></div>
                        <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest flex items-center gap-3 relative z-10">
                            <div className="bg-emerald-500/20 p-2 rounded-lg"><FileText className="w-5 h-5 text-emerald-400"/></div>
                            {editingId ? 'Actualizează Fișa' : 'Emite Legitimație Nouă'}
                        </h3>
                        <button onClick={() => setShowStoryModal(false)} className="relative z-10 bg-slate-800 hover:bg-rose-500 hover:border-rose-500 p-2 rounded-full border border-slate-700 transition">
                            <X className="w-5 h-5 font-bold"/>
                        </button>
                    </div>
                    
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 bg-slate-50 dark:bg-slate-950">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1.5">Nume Erou (Titlu)</label>
                                <input className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold uppercase tracking-tight text-sm outline-none focus:border-emerald-500 transition-colors text-slate-900 dark:text-white" value={newStory.title} onChange={e => setNewStory({...newStory, title: e.target.value})} placeholder="EX: ION GOLEA" />
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1.5">An / Perioadă (Ex: 1994)</label>
                                <input className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold uppercase tracking-tight text-sm outline-none focus:border-emerald-500 transition-colors text-slate-900 dark:text-white" value={newStory.date} onChange={e => setNewStory({...newStory, date: e.target.value})} placeholder="EX: 1994-2002" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1.5">Rol (ex: Magazioner)</label>
                                <input className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold uppercase tracking-tight text-sm outline-none focus:border-emerald-500 transition-colors text-slate-900 dark:text-white" value={newStory.role} onChange={e => setNewStory({...newStory, role: e.target.value})} placeholder="FUNCȚIA" />
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1.5">Club / Teren</label>
                                <input className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold uppercase tracking-tight text-sm outline-none focus:border-emerald-500 transition-colors text-slate-900 dark:text-white" value={newStory.organization} onChange={e => setNewStory({...newStory, organization: e.target.value})} placeholder="ECHIPA SAU STADIONUL" />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1.5">Scurtă Prezentare (Card)</label>
                            <input className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 transition-colors text-slate-900 dark:text-white" value={newStory.excerpt} onChange={e => setNewStory({...newStory, excerpt: e.target.value})} placeholder="Descriere scurtă pentru vitrină..." />
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1.5">Povestea Completă</label>
                            <textarea className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl min-h-[150px] font-medium text-sm outline-none focus:border-emerald-500 transition-colors text-slate-900 dark:text-white resize-y" value={newStory.content} onChange={e => setNewStory({...newStory, content: e.target.value})} placeholder="Detaliază cariera sau momentul istoric..." ></textarea>
                        </div>
                    </div>
                    
                    <div className="p-4 sm:p-6 border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <button onClick={handleSaveStory} className="w-full bg-emerald-600 text-white font-black uppercase tracking-widest text-sm sm:text-base py-4 rounded-xl hover:bg-emerald-500 border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px] transition-all flex justify-center items-center gap-3">
                            <Save className="w-5 h-5"/> {editingId ? 'Salvează Fișa Oficială' : 'Înregistrează Eroul'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}