import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Newspaper, Ban, CheckCircle, Search, Loader2, Plus, Trash2, ShoppingBag, X, Save, FileText, Edit, Flag, AlertTriangle, Shirt, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData { _id: string; name: string; email: string; role: string; isBanned: boolean; avatar?: string; strikes?: number; }
interface ListingData { _id: string; title: string; category: string; price: string; seller: string; sellerEmail: string; images: string[]; posted: string; reportedBy?: string[]; }
interface StoryData { _id: string; title: string; role: string; organization: string; excerpt: string; content: string; date: string; postedAt: string; }
interface ReportedMessage { _id: string; author: string; message: string; imageUrl?: string; room: string; reportedBy: string[]; timestamp: string; }

// --- INTERFEȚE STARTING XI ---
interface XIPlayer {
    _id?: string;
    id?: string; 
    name: string;
    gridRow: number; 
}

interface StartingXIData {
    _id?: string;
    id?: string;
    teamName: string;
    opponent: string;
    date: string;
    score: string;
    formation: string; 
    teamColor?: string;     
    opponentColor?: string; 
    isHome?: boolean;       
    players: XIPlayer[];
}

const API_URL = (import.meta as any).env.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/api` : 'https://football-backend-m2a4.onrender.com/api';

export function AdminDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'news' | 'reports' | 'xi'>('users');
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [stories, setStories] = useState<StoryData[]>([]);
  const [reportedMessages, setReportedMessages] = useState<ReportedMessage[]>([]);
  const [reportedListings, setReportedListings] = useState<ListingData[]>([]);
  
  // Stări pentru Primul 11 (Starting XI)
  const [xis, setXis] = useState<StartingXIData[]>([]);
  const [teamName, setTeamName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [score, setScore] = useState("");
  const [date, setDate] = useState("");
  const [formation, setFormation] = useState("4-3-3");
  const [teamColor, setTeamColor] = useState("#ffffff");
  const [opponentColor, setOpponentColor] = useState("#000000");
  const [isHome, setIsHome] = useState(true);
  const [slotPlayers, setSlotPlayers] = useState<(XIPlayer | null)[]>(Array(11).fill(null));

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

        const resXi = await fetch(`${API_URL}/sport/starting-xi`);
        if (resXi.ok) {
            setXis(await resXi.json());
        }

    } catch (err) { toast.error("Eroare la încărcarea datelor din baza de date."); } 
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
              toast.success(`Abatere adăugată pentru ${authorName}!`);
              fetchInitialData();
          }
      } catch (err) { toast.error("Eroare la adăugarea abaterii."); }
  };

  const handleDeleteReportedMessage = async (id: string) => {
      if(!window.confirm("Ștergi definitiv acest mesaj?")) return;
      try {
          const res = await fetch(`${API_URL}/messages/${id}`, { 
              method: 'DELETE', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user: user.name, userRole: user.role, email: user.email })
          });
          if(res.ok) {
              setReportedMessages(prev => prev.filter(m => m._id !== id));
              toast.success("Mesaj șters!");
          }
      } catch (err) { toast.error("Eroare la ștergerea mesajului."); }
  };

  const handleDismissReport = async (id: string) => {
      try {
          const res = await fetch(`${API_URL}/messages/${id}/dismiss-report`, { method: 'POST' });
          if(res.ok) {
              setReportedMessages(prev => prev.filter(m => m._id !== id));
              toast.success("Avantaj lăsat.");
          }
      } catch (err) { toast.error("Eroare la procesare."); }
  };

  const handleDismissListingReport = async (id: string) => {
      try {
          const res = await fetch(`${API_URL}/listings/${id}/dismiss-report`, { method: 'POST' });
          if(res.ok) {
              setReportedListings(prev => prev.filter(l => l._id !== id));
              toast.success("Avantaj lăsat.");
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
                  toast.success("Erou actualizat!");
              } else {
                  setStories([savedStory, ...stories]);
                  toast.success("Erou adăugat!");
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

  const getGridRowForSlot = (index: number, form: string) => {
    if (index === 0) return 0; 
    const parts = form.split('-').map(Number); 
    let sum = 0;
    for (let r = 0; r < parts.length; r++) {
        sum += parts[r];
        if (index <= sum) return r + 1;
    }
    return 1;
  };

  const getSlotLabel = (index: number, form: string) => {
      if (index === 0) return "GK (Portar)";
      const row = getGridRowForSlot(index, form);
      const parts = form.split('-').length;
      
      if (parts === 3) {
          if (row === 1) return `DEF ${index}`;
          if (row === 2) return `MID ${index}`;
          if (row === 3) return `ATT ${index}`;
      }
      if (parts === 4) {
          if (row === 1) return `DEF ${index}`;
          if (row === 2) return `CDM ${index}`;
          if (row === 3) return `CAM ${index}`;
          if (row === 4) return `ST ${index}`;
      }
      return `Jucător ${index}`;
  };

  const handleSaveXI = async () => {
    if (!teamName || !opponent || !score || !date) {
        toast.error("Completează toate detaliile meciului!"); return;
    }
    
    const isValid = slotPlayers.every(p => p !== null && p.name.trim().length > 0);
    if (!isValid) {
        toast.error("Trebuie să scrii numele pentru toți cei 11 jucători!"); return;
    }

    const cleanPlayers = slotPlayers.map(p => ({
        name: p!.name,
        gridRow: p!.gridRow
    }));

    const newXI = {
        teamName, opponent, score, date, formation,
        teamColor, opponentColor, isHome,
        players: cleanPlayers
    };

    try {
        const res = await fetch(`${API_URL}/sport/starting-xi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newXI)
        });

        if (res.ok) {
            const savedXI = await res.json();
            setXis([...xis, savedXI]);
            toast.success("Meci salvat cu succes!");
            
            setTeamName(""); setOpponent(""); setScore(""); setDate("");
            setTeamColor("#ffffff"); setOpponentColor("#000000"); setIsHome(true);
            setSlotPlayers(Array(11).fill(null));
        } else {
            const errData = await res.json();
            toast.error(`Eroare backend: ${errData.error || 'Necunoscută'}`);
        }
    } catch (e) {
        toast.error("Nu m-am putut conecta la server.");
    }
  };

  const handleDeleteXI = async (id: string) => {
    if(window.confirm("Ești sigur că vrei să ștergi acest meci?")) {
        try {
            const res = await fetch(`${API_URL}/sport/starting-xi/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setXis(xis.filter(x => (x._id || x.id) !== id));
                toast.success("Meci șters.");
            } else {
                toast.error("Problemă la ștergere.");
            }
        } catch (e) {
            toast.error("Eroare conexiune DB.");
        }
    }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredListings = listings.filter(l => l.title.toLowerCase().includes(searchTerm.toLowerCase()) || l.seller.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredStories = stories.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalReports = reportedMessages.length + reportedListings.length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-20 relative px-2 sm:px-4 mt-4">
        
        {/* FUNDAL SPORTIV */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-3xl opacity-[0.03] dark:opacity-[0.05]">
           <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,#000_20px,#000_22px)]"></div>
        </div>

        {/* HEADER TACTIC */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border-b-4 border-rose-600 text-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,rgba(225,29,72,0.3),transparent_70%)]"></div>
            
            <div className="relative z-10 text-center md:text-left">
                <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter mb-2 flex items-center justify-center md:justify-start gap-2 sm:gap-3 drop-shadow-md">
                    <ShieldCheck className="h-6 w-6 sm:h-10 sm:w-10 text-rose-500" /> 
                    Comisia <span className="text-rose-500">Centrală</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-sm">
                    Panoul de control / Arbitraj
                </p>
            </div>

            <div className="flex gap-2 sm:gap-3 flex-wrap mt-4 md:mt-0 justify-center relative z-10 w-full md:w-auto">
                <div className="flex-1 md:flex-none bg-slate-950 p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 border-slate-800 text-center min-w-[70px] shadow-inner">
                    <div className="text-lg sm:text-2xl font-black">{users.length}</div>
                    <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Useri</div>
                </div>
                <div className="flex-1 md:flex-none bg-slate-950 p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 border-slate-800 text-center min-w-[70px] shadow-inner">
                    <div className="text-lg sm:text-2xl font-black text-blue-500">{listings.length}</div>
                    <div className="text-[8px] sm:text-[10px] font-black text-blue-500/70 uppercase tracking-widest mt-1">Anunțuri</div>
                </div>
                <div className="flex-1 md:flex-none bg-slate-950 p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 border-slate-800 text-center min-w-[70px] shadow-inner">
                    <div className="text-lg sm:text-2xl font-black text-emerald-500">{stories.length}</div>
                    <div className="text-[8px] sm:text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mt-1">Articole</div>
                </div>
                <div className="flex-1 md:flex-none bg-rose-950/40 p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 border-rose-900/50 text-center min-w-[70px] relative shadow-inner">
                    {totalReports > 0 && <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-rose-600 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.8)] border border-rose-400">{totalReports}</span>}
                    <div className="text-lg sm:text-2xl font-black text-amber-500">{totalReports}</div>
                    <div className="text-[8px] sm:text-[10px] font-black text-amber-500/70 uppercase tracking-widest mt-1">VAR</div>
                </div>
            </div>
        </div>

        {/* MENIU TACTIC - S-a adăugat scrolling orizontal neted pentru mobil */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 -mx-2 px-2 sm:mx-0 sm:px-0 border-b-2 border-slate-200 dark:border-slate-800 scrollbar-hide snap-x">
            {[
                { id: 'users', label: 'Echipe / Lot', icon: Users },
                { id: 'listings', label: 'Mercato', icon: ShoppingBag },
                { id: 'news', label: 'Trofee', icon: Newspaper },
                { id: 'reports', label: `VAR (${totalReports})`, icon: AlertTriangle },
                { id: 'xi', label: 'Joc 11', icon: Shirt }
            ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`snap-center px-4 py-2.5 sm:px-6 sm:py-3 font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap text-[10px] sm:text-sm border-2 flex-1 md:flex-none ${
                            isActive 
                            ? 'bg-rose-600 border-rose-500 text-white shadow-md sm:translate-y-[-2px]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-rose-500/50 hover:text-rose-500'
                        }`}
                    >
                        <tab.icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${isActive ? 'text-white' : (tab.id === 'reports' && totalReports > 0 ? 'text-amber-500 animate-pulse' : '')}`}/>
                        {tab.label}
                    </button>
                )
            })}
        </div>

        {/* CONTENT */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-6 min-h-[500px]">
            {activeTab !== 'reports' && activeTab !== 'xi' && (
                <div className="relative w-full mb-4 sm:mb-6">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Search className="text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="CAUTĂ..." 
                        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-4 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-rose-500 dark:focus:border-rose-500 transition-colors font-black uppercase tracking-widest text-[10px] sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            {loading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-black uppercase tracking-widest text-[10px] sm:text-xs text-slate-500">Se preiau datele...</p>
                </div>
            ) : (
                <>
                {/* 1. USERS TAB */}
                {activeTab === 'users' && (
                    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-4">
                        <div className="min-w-[500px] rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[9px] sm:text-xs">
                                    <tr>
                                        <th className="p-3 sm:p-5">Cont</th>
                                        <th className="p-3 sm:p-5 hidden md:table-cell">Contact</th>
                                        <th className="p-3 sm:p-5 text-center">Cartonașe</th>
                                        <th className="p-3 sm:p-5">Status</th>
                                        <th className="p-3 sm:p-5 text-right">Ban</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                                    {filteredUsers.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-3 sm:p-5">
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-slate-600 dark:text-slate-300 overflow-hidden shrink-0 text-xs sm:text-base">
                                                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover"/> : u.name[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-[10px] sm:text-sm line-clamp-1">{u.name}</span>
                                                        <span className="text-[8px] text-slate-500 font-bold md:hidden line-clamp-1">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 sm:p-5 text-slate-500 font-bold text-xs hidden md:table-cell">{u.email}</td>
                                            <td className="p-3 sm:p-5 text-center">
                                                <span className={`inline-flex items-center justify-center w-5 h-6 sm:w-6 sm:h-8 rounded-sm font-black shadow-sm border text-[10px] sm:text-xs ${u.strikes && u.strikes > 0 ? 'bg-amber-400 text-slate-900 border-amber-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent'}`}>
                                                    {u.strikes || 0}
                                                </span>
                                            </td>
                                            <td className="p-3 sm:p-5">
                                                {u.isBanned 
                                                ? <span className="text-rose-600 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 px-2 py-1 rounded text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Ban</span> 
                                                : <span className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded text-[8px] sm:text-[10px] font-black uppercase tracking-widest">OK</span>}
                                            </td>
                                            <td className="p-3 sm:p-5 text-right">
                                                {u.email !== user.email && (
                                                    <button 
                                                        onClick={() => handleToggleBan(u._id, u.isBanned, u.name)} 
                                                        className="p-1.5 sm:p-2.5 rounded-md sm:rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-500 transition-colors shadow-sm"
                                                    >
                                                        <Ban className="w-3.5 h-3.5 sm:w-5 sm:h-5"/>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 2. LISTINGS TAB */}
                {activeTab === 'listings' && (
                     <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-4">
                        <div className="min-w-[500px] rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[9px] sm:text-xs">
                                    <tr>
                                        <th className="p-3 sm:p-5">Articol</th>
                                        <th className="p-3 sm:p-5">Preț</th>
                                        <th className="p-3 sm:p-5 hidden sm:table-cell">Impresar</th>
                                        <th className="p-3 sm:p-5 text-right">Șterge</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                                    {filteredListings.map(l => (
                                        <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-3 sm:p-5">
                                                <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-[10px] sm:text-sm line-clamp-1">{l.title}</div>
                                                <div className="text-[8px] sm:text-[10px] font-black text-blue-500 mt-1 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded w-fit border border-blue-200 dark:border-blue-800">{l.category}</div>
                                                <div className="text-[9px] text-slate-500 font-bold mt-1 sm:hidden">de {l.seller}</div>
                                            </td>
                                            <td className="p-3 sm:p-5 font-black text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-base">{l.price}</td>
                                            <td className="p-3 sm:p-5 text-slate-500 font-bold text-[10px] sm:text-xs hidden sm:table-cell uppercase">{l.seller}</td>
                                            <td className="p-3 sm:p-5 text-right">
                                                <button 
                                                    onClick={() => handleDeleteListing(l._id, l.title)} 
                                                    className="p-1.5 sm:p-2.5 rounded-md sm:rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-500 transition-colors shadow-sm"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 sm:w-5 sm:h-5"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. NEWS / HEROES TAB */}
                {activeTab === 'news' && (
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-3 sm:gap-4 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                            <h3 className="font-black text-sm sm:text-xl uppercase tracking-widest text-slate-900 dark:text-white">Lista Legendelor</h3>
                            <button 
                                onClick={openAddModal} 
                                className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 border-b-4 border-emerald-800 hover:bg-emerald-500 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Adaugă Erou
                            </button>
                        </div>

                        <div className="grid gap-3 sm:gap-4">
                            {filteredStories.map(story => (
                                <div key={story._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors gap-3 sm:gap-4">
                                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                        <div className="hidden sm:flex bg-white dark:bg-slate-900 text-emerald-500 p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                                            <Newspaper className="w-6 h-6 sm:w-8 sm:h-8"/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-xs sm:text-lg text-slate-900 dark:text-white uppercase tracking-tight truncate">{story.title}</div>
                                            <div className="text-[10px] sm:text-xs text-slate-500 font-bold line-clamp-2 sm:line-clamp-1 mt-0.5 sm:mt-1 leading-tight">{story.excerpt}</div>
                                            <div className="flex flex-wrap gap-1.5 mt-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                                <span className="bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">{story.role}</span>
                                                <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{story.organization}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto justify-end border-t-2 sm:border-0 border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 mt-1 sm:mt-0">
                                        <button onClick={() => openEditModal(story)} className="p-2 sm:p-3 bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 transition shadow-sm">
                                            <Edit className="w-3.5 h-3.5 sm:w-5 sm:h-5"/>
                                        </button>
                                        <button onClick={() => handleDeleteStory(story._id)} className="p-2 sm:p-3 bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 transition shadow-sm">
                                            <Trash2 className="w-3.5 h-3.5 sm:w-5 sm:h-5"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. TAB VAR (RAPORTĂRI) */}
                {activeTab === 'reports' && (
                    <div>
                        <div className="mb-4 sm:mb-6">
                            <h3 className="font-black text-sm sm:text-xl flex items-center gap-2 uppercase tracking-widest text-slate-900 dark:text-white">
                                <Flag className="text-amber-500 w-4 h-4 sm:w-6 sm:h-6"/> Incidente Chat
                            </h3>
                        </div>

                        <div className="grid gap-3 sm:gap-5 mb-8 sm:mb-12">
                            {reportedMessages.map(msg => (
                                <div key={msg._id} className="bg-rose-50/50 dark:bg-rose-900/10 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-rose-200 dark:border-rose-900/50 flex flex-col lg:flex-row justify-between gap-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 sm:w-2 h-full bg-rose-500"></div>
                                    <div className="flex-1 pl-2">
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                                            <span className="font-black text-[8px] sm:text-[10px] bg-slate-900 text-white px-2 py-0.5 sm:py-1 rounded uppercase">{msg.room === 'general_chat' ? 'Tribună' : 'Peluză'}</span>
                                            <span className="font-black text-[11px] sm:text-sm text-slate-900 dark:text-white uppercase">{msg.author}</span>
                                        </div>
                                        
                                        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                                            {msg.message && <div className="italic font-bold text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 relative z-10">{msg.message}</div>}
                                            {msg.imageUrl && (
                                                <div className="mt-3 relative z-10">
                                                    <img src={msg.imageUrl} alt="VAR" className="max-w-[150px] sm:max-w-[300px] max-h-32 sm:max-h-48 rounded-lg object-cover border border-slate-200" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 text-[9px] sm:text-xs font-black text-amber-600 uppercase flex items-center gap-1">
                                            <Users className="w-3 h-3 sm:w-4 sm:h-4"/> {msg.reportedBy.length} Reports
                                        </div>
                                    </div>
                                    <div className="flex flex-row lg:flex-col gap-2 justify-center shrink-0">
                                        <button onClick={() => handleAddStrike(msg.author)} className="flex-1 bg-white dark:bg-slate-800 text-amber-600 hover:text-amber-500 font-black uppercase text-[9px] sm:text-xs py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl border-2 border-amber-200 dark:border-amber-900/50 shadow-sm transition">
                                            Galben (+1)
                                        </button>
                                        <button onClick={() => handleDismissReport(msg._id)} className="flex-1 bg-white dark:bg-slate-800 text-emerald-600 hover:text-emerald-500 font-black uppercase text-[9px] sm:text-xs py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl border-2 border-emerald-200 dark:border-emerald-900/50 shadow-sm transition">
                                            Ignoră
                                        </button>
                                        <button onClick={() => handleDeleteReportedMessage(msg._id)} className="flex-1 bg-rose-600 text-white font-black uppercase text-[9px] sm:text-xs py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl border-b-2 sm:border-b-4 border-rose-800 transition">
                                            Șterge
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mb-4 sm:mb-6 pt-6 sm:pt-8 border-t-2 border-slate-100 dark:border-slate-800">
                            <h3 className="font-black text-sm sm:text-xl flex items-center gap-2 uppercase tracking-widest text-slate-900 dark:text-white">
                                <ShoppingBag className="text-blue-500 w-4 h-4 sm:w-6 sm:h-6"/> Incidente Mercato
                            </h3>
                        </div>
                        
                        <div className="grid gap-3 sm:gap-5">
                            {reportedListings.map(listing => (
                                <div key={listing._id} className="bg-blue-50/50 dark:bg-blue-900/10 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-blue-200 dark:border-blue-900/50 flex flex-col lg:flex-row justify-between gap-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 sm:w-2 h-full bg-blue-500"></div>
                                    <div className="flex-1 pl-2">
                                        <div className="font-black text-[11px] sm:text-sm bg-blue-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded uppercase inline-block mb-2">{listing.title}</div>
                                        <p className="text-[10px] sm:text-sm font-bold text-slate-600 mt-1 uppercase">Vânzător: {listing.seller}</p>
                                        <div className="mt-3 text-[9px] sm:text-xs font-black text-amber-600 uppercase flex items-center gap-1">
                                            <Users className="w-3 h-3 sm:w-4 sm:h-4"/> {listing.reportedBy?.length || 0} Reports
                                        </div>
                                    </div>
                                    <div className="flex flex-row lg:flex-col gap-2 justify-center shrink-0">
                                        <button onClick={() => handleDismissListingReport(listing._id)} className="flex-1 bg-white dark:bg-slate-800 text-emerald-600 font-black uppercase text-[9px] sm:text-xs py-2 px-2 rounded-lg border-2 border-emerald-200 shadow-sm transition">
                                            Curat
                                        </button>
                                        <button onClick={() => handleDeleteListing(listing._id, listing.title)} className="flex-1 bg-rose-600 text-white font-black uppercase text-[9px] sm:text-xs py-2 px-2 rounded-lg border-b-2 border-rose-800 transition">
                                            Șterge
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* 5. TAB PRIMUL 11 (ADMIN) */}
                {activeTab === 'xi' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Formular Adăugare */}
                        <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-4 border-slate-800 shadow-xl space-y-4">
                            <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-widest mb-3 sm:mb-4 border-b-2 border-slate-800 pb-2">Meci Nou</h3>
                            
                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                <input type="text" placeholder="Echipa (ex: Steaua)" value={teamName} onChange={e=>setTeamName(e.target.value)} className="bg-slate-950 border-2 border-slate-700 p-2 sm:p-3 rounded-lg sm:rounded-xl text-white font-bold text-[10px] sm:text-sm uppercase outline-none focus:border-blue-500" />
                                <input type="text" placeholder="Adversar (ex: Dinamo)" value={opponent} onChange={e=>setOpponent(e.target.value)} className="bg-slate-950 border-2 border-slate-700 p-2 sm:p-3 rounded-lg sm:rounded-xl text-white font-bold text-[10px] sm:text-sm uppercase outline-none focus:border-blue-500" />
                                <input type="text" placeholder="Scor (2-1)" value={score} onChange={e=>setScore(e.target.value)} className="bg-slate-950 border-2 border-slate-700 p-2 sm:p-3 rounded-lg sm:rounded-xl text-white font-bold text-[10px] sm:text-sm uppercase outline-none focus:border-blue-500" />
                                <input type="text" placeholder="Data/An" value={date} onChange={e=>setDate(e.target.value)} className="bg-slate-950 border-2 border-slate-700 p-2 sm:p-3 rounded-lg sm:rounded-xl text-white font-bold text-[10px] sm:text-sm uppercase outline-none focus:border-blue-500" />
                            </div>

                            <div className="pt-2">
                                <select value={formation} onChange={e=>{setFormation(e.target.value); setSlotPlayers(Array(11).fill(null));}} className="w-full bg-slate-950 border-2 border-slate-700 p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-white font-black text-xs sm:text-sm outline-none">
                                    <option value="4-3-3">Formație: 4-3-3</option>
                                    <option value="4-4-2">Formație: 4-4-2</option>
                                    <option value="4-2-3-1">Formație: 4-2-3-1</option>
                                    <option value="3-5-2">Formație: 3-5-2</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-2">
                                <div className="bg-slate-950 border-2 border-slate-700 p-2 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-1">
                                    <label className="text-slate-400 font-bold text-[8px] sm:text-[10px] uppercase">Tu</label>
                                    <input type="color" value={teamColor} onChange={e=>setTeamColor(e.target.value)} className="w-6 h-6 sm:w-8 sm:h-8 rounded cursor-pointer bg-transparent border-none outline-none" />
                                </div>
                                <div className="bg-slate-950 border-2 border-slate-700 p-2 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-1">
                                    <label className="text-slate-400 font-bold text-[8px] sm:text-[10px] uppercase">Rival</label>
                                    <input type="color" value={opponentColor} onChange={e=>setOpponentColor(e.target.value)} className="w-6 h-6 sm:w-8 sm:h-8 rounded cursor-pointer bg-transparent border-none outline-none" />
                                </div>
                                <div className="bg-slate-950 border-2 border-slate-700 p-2 rounded-lg flex flex-col items-center justify-center gap-1">
                                    <label className="text-slate-400 font-bold text-[8px] sm:text-[10px] uppercase">Acasă?</label>
                                    <input type="checkbox" checked={isHome} onChange={e=>setIsHome(e.target.checked)} className="w-4 h-4 sm:w-5 sm:h-5 accent-blue-500" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-widest block mb-2">Introdu Nume (11 Jucători)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Array.from({ length: 11 }).map((_, idx) => {
                                        const player = slotPlayers[idx];
                                        return (
                                            <input 
                                                key={idx} type="text" placeholder={getSlotLabel(idx, formation)} value={player ? player.name : ''}
                                                onChange={(e) => {
                                                    const newSlots = [...slotPlayers];
                                                    newSlots[idx] = { name: e.target.value, gridRow: getGridRowForSlot(idx, formation) };
                                                    setSlotPlayers(newSlots);
                                                }}
                                                className={`p-2 sm:p-2.5 rounded-lg border-2 text-[9px] sm:text-[10px] font-bold uppercase transition-colors outline-none ${
                                                    player?.name.trim() ? 'bg-blue-900/30 border-blue-500 text-blue-300' : 'bg-slate-950 border-slate-700 text-slate-300'
                                                }`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <button onClick={handleSaveXI} className="w-full bg-emerald-600 text-white p-3 sm:p-4 rounded-xl font-black uppercase text-xs sm:text-sm border-b-4 border-emerald-800 mt-2 flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> Salvează
                            </button>
                        </div>

                        {/* Lista Meciuri DB */}
                        <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-4 border-slate-800 shadow-xl flex flex-col mt-4 lg:mt-0">
                            <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-widest mb-3 sm:mb-4 border-b-2 border-slate-800 pb-2">Istoric Meciuri</h3>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 sm:pr-2 max-h-[300px] sm:max-h-[600px] scrollbar-hide">
                                {xis.length === 0 ? (
                                    <p className="text-slate-500 text-center font-bold text-[10px] sm:text-sm uppercase py-5 sm:py-10">Baza de date e goală.</p>
                                ) : (
                                    xis.map(x => (
                                        <div key={x._id || x.id} className="bg-slate-950 border border-slate-700 rounded-lg sm:rounded-xl p-3 flex justify-between items-center">
                                            <div className="min-w-0 pr-2">
                                                <div className="font-black text-white uppercase text-[10px] sm:text-sm truncate">{x.teamName} vs {x.opponent}</div>
                                                <div className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase mt-0.5">{x.date} • {x.formation}</div>
                                            </div>
                                            <button onClick={() => handleDeleteXI(x._id || x.id || '')} className="bg-rose-900/30 text-rose-500 p-2 rounded-md hover:bg-rose-600 hover:text-white transition-colors shrink-0">
                                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
                </>
            )}
        </div>

        {/* MODAL ȘTIRE PĂSTRAT PENTRU REFERINȚĂ - L-AM LĂSAT NEMODIFICAT CA LOGICĂ, DOAR SCALAT PE MOBIL */}
        {showStoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4">
                {/* Contentul modalului e neatins ca structura dar cu padding ajustat */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border-2 sm:border-4 border-emerald-600/30">
                    <div className="p-4 border-b-2 sm:border-b-4 border-emerald-500 flex justify-between items-center bg-slate-900 text-white">
                        <h3 className="text-sm sm:text-lg font-black uppercase tracking-widest flex items-center gap-2">
                            {editingId ? 'Actualizează' : 'Adaugă Erou'}
                        </h3>
                        <button onClick={() => setShowStoryModal(false)} className="bg-slate-800 p-1.5 sm:p-2 rounded-full border border-slate-700"><X className="w-4 h-4 sm:w-5 sm:h-5"/></button>
                    </div>
                    
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-5 bg-slate-50 dark:bg-slate-950">
                         {/* Formularul ramane identic functional, doar clase responsive */}
                         <input className="w-full bg-slate-800 border-2 border-slate-700 p-2.5 rounded-lg text-[10px] sm:text-sm font-bold uppercase text-white" value={newStory.title} onChange={e => setNewStory({...newStory, title: e.target.value})} placeholder="NUME EROU" />
                         <input className="w-full bg-slate-800 border-2 border-slate-700 p-2.5 rounded-lg text-[10px] sm:text-sm font-bold uppercase text-white" value={newStory.date} onChange={e => setNewStory({...newStory, date: e.target.value})} placeholder="ANUL/PERIOADA" />
                         <input className="w-full bg-slate-800 border-2 border-slate-700 p-2.5 rounded-lg text-[10px] sm:text-sm font-bold uppercase text-white" value={newStory.role} onChange={e => setNewStory({...newStory, role: e.target.value})} placeholder="ROL (EX: Maseur)" />
                         <input className="w-full bg-slate-800 border-2 border-slate-700 p-2.5 rounded-lg text-[10px] sm:text-sm font-bold uppercase text-white" value={newStory.organization} onChange={e => setNewStory({...newStory, organization: e.target.value})} placeholder="CLUB/TEREN" />
                         <input className="w-full bg-slate-800 border-2 border-slate-700 p-2.5 rounded-lg text-[10px] sm:text-sm font-bold text-white" value={newStory.excerpt} onChange={e => setNewStory({...newStory, excerpt: e.target.value})} placeholder="Prezentare scurtă..." />
                         <textarea className="w-full bg-slate-800 border-2 border-slate-700 p-2.5 rounded-lg text-[10px] sm:text-sm font-medium text-white min-h-[100px]" value={newStory.content} onChange={e => setNewStory({...newStory, content: e.target.value})} placeholder="Povestea completă..."></textarea>
                    </div>
                    
                    <div className="p-3 sm:p-4 border-t-2 border-slate-800 bg-slate-900">
                        <button onClick={handleSaveStory} className="w-full bg-emerald-600 text-white font-black uppercase text-xs sm:text-sm py-3 rounded-xl border-b-4 border-emerald-800">
                            Salvează
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}