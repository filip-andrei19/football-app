import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Newspaper, Ban, CheckCircle, Search, Loader2, Plus, Trash2, ShoppingBag, X, Save, FileText, Edit, Flag, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// --- INTERFEȚE ---
interface UserData { _id: string; name: string; email: string; role: string; isBanned: boolean; avatar?: string; }
interface ListingData { _id: string; title: string; category: string; price: string; seller: string; sellerEmail: string; images: string[]; posted: string; }
interface StoryData { _id: string; title: string; role: string; organization: string; excerpt: string; content: string; date: string; postedAt: string; }
// NOU: Interfață pentru mesajele raportate
interface ReportedMessage { _id: string; author: string; message: string; room: string; reportedBy: string[]; timestamp: string; }

const API_URL = (import.meta as any).env.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/api` : 'https://football-backend-m2a4.onrender.com/api';
export function AdminDashboard({ user }: { user: any }) {
  // Am adăugat 'reports' în lista de tab-uri
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'news' | 'reports'>('users');
  
  // State-uri Date
  const [users, setUsers] = useState<UserData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [stories, setStories] = useState<StoryData[]>([]);
  const [reportedMessages, setReportedMessages] = useState<ReportedMessage[]>([]); // NOU
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // State pentru Modal Știre (Adăugare / Editare)
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStory, setNewStory] = useState({ title: '', role: '', organization: '', excerpt: '', content: '', date: '' });

  // --- 1. FETCH DATA ---
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

        // Aducem mesajele raportate
        const resReports = await fetch(`${API_URL}/admin/reported-messages`);
        if (resReports.ok) setReportedMessages(await resReports.json());

    } catch (err) { toast.error("Eroare la încărcarea datelor."); } 
    finally { setLoading(false); }
  };

  // --- LOGICA UTILIZATORI ---
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

  // --- LOGICA ANUNȚURI ---
  const handleDeleteListing = async (id: string, title: string) => {
      if(!window.confirm(`Ștergi anunțul "${title}"?`)) return;
      try {
          const res = await fetch(`${API_URL}/listings/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) });
          if(res.ok) {
              setListings(prev => prev.filter(l => l._id !== id));
              toast.success("Anunț șters.");
          }
      } catch (err) { toast.error("Eroare server."); }
  };

  // --- NOU: LOGICA RAPORTĂRI MESAJE ---
  
  // Opțiunea 1: Șterge definitiv mesajul (Avertizează userul)
  const handleDeleteReportedMessage = async (id: string) => {
      if(!window.confirm("Ștergi definitiv acest mesaj? Autorul va primi un avertisment.")) return;
      try {
          const res = await fetch(`${API_URL}/messages/${id}`, { 
              method: 'DELETE', 
              headers: { 'Content-Type': 'application/json' },
              // Trimitem datele tale de admin pentru a declanșa ramura de 'Hard Delete' de pe server
              body: JSON.stringify({ user: user.name, userRole: user.role, email: user.email })
          });
          if(res.ok) {
              setReportedMessages(prev => prev.filter(m => m._id !== id));
              toast.success("Mesaj șters! Autorul a fost avertizat.");
          }
      } catch (err) { toast.error("Eroare la ștergerea mesajului."); }
  };

  // Opțiunea 2: Ignoră raportul (Curăță bifa de report)
  const handleDismissReport = async (id: string) => {
      try {
          const res = await fetch(`${API_URL}/messages/${id}/dismiss-report`, { method: 'POST' });
          if(res.ok) {
              setReportedMessages(prev => prev.filter(m => m._id !== id));
              toast.success("Raport ignorat.");
          }
      } catch (err) { toast.error("Eroare la procesare."); }
  };


  // --- LOGICA ȘTIRI (CRUD COMPLET) ---
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
      if(!newStory.title || !newStory.excerpt) return toast.error("Completează titlul și rezumatul!");
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
                  toast.success("Articol actualizat!");
              } else {
                  setStories([savedStory, ...stories]);
                  toast.success("Articol publicat!");
              }
              setShowStoryModal(false);
          }
      } catch(err) { toast.error("Eroare la salvare."); }
  };

  const handleDeleteStory = async (id: string) => {
      if(!window.confirm("Ștergi acest articol?")) return;
      try {
          const res = await fetch(`${API_URL}/admin/stories/${id}`, { method: 'DELETE' });
          if(res.ok) {
              setStories(prev => prev.filter(s => s._id !== id));
              toast.success("Articol șters.");
          }
      } catch(err) { toast.error("Eroare."); }
  };

  // FILTRARE
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredListings = listings.filter(l => l.title.toLowerCase().includes(searchTerm.toLowerCase()) || l.seller.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredStories = stories.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 text-white p-8 rounded-3xl shadow-xl border border-slate-800">
            <div><h1 className="text-3xl font-black mb-2 flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-red-500" /> Admin Dashboard</h1><p className="text-slate-400">Panou de control.</p></div>
            <div className="flex gap-2 flex-wrap mt-4 md:mt-0 justify-center">
                <div className="bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-700 text-center min-w-[70px]"><div className="text-xl font-bold">{users.length}</div><div className="text-[10px] text-slate-400 uppercase">Useri</div></div>
                <div className="bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-700 text-center min-w-[70px]"><div className="text-xl font-bold text-blue-400">{listings.length}</div><div className="text-[10px] text-slate-400 uppercase">Anunțuri</div></div>
                <div className="bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-700 text-center min-w-[70px]"><div className="text-xl font-bold text-green-400">{stories.length}</div><div className="text-[10px] text-slate-400 uppercase">Știri</div></div>
                <div className="bg-slate-800 p-2 md:p-3 rounded-xl border border-red-900/30 text-center min-w-[70px] relative">
                    {reportedMessages.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] animate-pulse">{reportedMessages.length}</span>}
                    <div className="text-xl font-bold text-orange-400">{reportedMessages.length}</div><div className="text-[10px] text-slate-400 uppercase">Raportări</div>
                </div>
            </div>
        </div>

        {/* MENIU */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-slate-700">
            {['users', 'listings', 'news', 'reports'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 capitalize whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                    {tab === 'users' && <Users className="w-4 h-4"/>}
                    {tab === 'listings' && <ShoppingBag className="w-4 h-4"/>}
                    {tab === 'news' && <Newspaper className="w-4 h-4"/>}
                    {tab === 'reports' && <AlertTriangle className={`w-4 h-4 ${reportedMessages.length > 0 ? 'text-orange-500' : ''}`}/>}
                    {tab === 'news' ? 'Știri / Eroi' : tab === 'listings' ? 'Anunțuri' : tab === 'reports' ? `Raportări (${reportedMessages.length})` : 'Utilizatori'}
                </button>
            ))}
        </div>

        {/* CONTENT */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 min-h-[400px]">
            {activeTab !== 'reports' && (
                <div className="relative max-w-md mb-6"><Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input type="text" placeholder="Caută..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-900 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div>
            )}

            {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div> : (
                <>
                {/* 1. USERS TAB */}
                {activeTab === 'users' && (
                    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 font-bold uppercase text-xs"><tr><th className="p-4">User</th><th className="p-4">Email</th><th className="p-4">Status</th><th className="p-4 text-right">Acțiuni</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {filteredUsers.map(u => (
                                    <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 font-bold flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs overflow-hidden">{u.avatar ? <img src={u.avatar} className="w-full h-full object-cover"/> : u.name[0]}</div>{u.name}</td>
                                        <td className="p-4 text-gray-500 font-mono">{u.email}</td>
                                        <td className="p-4">{u.isBanned ? <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold">Blocat</span> : <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">Activ</span>}</td>
                                        <td className="p-4 text-right">{u.email !== user.email && <button onClick={() => handleToggleBan(u._id, u.isBanned, u.name)} className="text-gray-400 hover:text-blue-600"><Ban className="w-4 h-4"/></button>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 2. LISTINGS TAB */}
                {activeTab === 'listings' && (
                     <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 font-bold uppercase text-xs"><tr><th className="p-4">Produs</th><th className="p-4">Preț</th><th className="p-4">Vânzător</th><th className="p-4 text-right">Acțiuni</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {filteredListings.map(l => (
                                    <tr key={l._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4"><div className="font-bold">{l.title}</div><div className="text-xs text-blue-500 uppercase">{l.category}</div></td>
                                        <td className="p-4 font-bold text-green-600">{l.price}</td>
                                        <td className="p-4 text-gray-500">{l.seller}</td>
                                        <td className="p-4 text-right"><button onClick={() => handleDeleteListing(l._id, l.title)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 3. NEWS / HEROES TAB */}
                {activeTab === 'news' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl">Articole Publicate</h3>
                            <button onClick={openAddModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg"><Plus className="w-4 h-4" /> Adaugă Erou</button>
                        </div>

                        <div className="grid gap-4">
                            {filteredStories.map(story => (
                                <div key={story._id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-100 text-blue-600 p-3 rounded-lg"><Newspaper className="w-6 h-6"/></div>
                                        <div>
                                            <div className="font-bold text-lg">{story.title}</div>
                                            <div className="text-sm text-gray-500 line-clamp-1">{story.excerpt}</div>
                                            <div className="flex gap-2 mt-1 text-xs font-bold uppercase text-gray-400">
                                                <span>{story.role}</span> • <span>{story.organization}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditModal(story)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Edit className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteStory(story._id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                            {filteredStories.length === 0 && <div className="text-center py-10 text-gray-400">Nu există articole. Adaugă unul!</div>}
                        </div>
                    </div>
                )}

                {/* NOU: 4. TAB RAPORTĂRI */}
                {activeTab === 'reports' && (
                    <div>
                        <div className="mb-6">
                            <h3 className="font-bold text-xl flex items-center gap-2">
                                <Flag className="text-orange-500"/> Moderare Mesaje
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Aceste mesaje au fost raportate de către comunitate.</p>
                        </div>

                        <div className="grid gap-4">
                            {reportedMessages.map(msg => (
                                <div key={msg._id} className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-bold text-sm bg-slate-800 text-white px-2 py-0.5 rounded uppercase">{msg.room === 'general_chat' ? 'Hub' : 'Produs'}</span>
                                            <span className="font-bold">{msg.author}</span>
                                            <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString('ro-RO')}</span>
                                        </div>
                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 italic">
                                            "{msg.message}"
                                        </div>
                                        <div className="mt-2 text-xs font-bold text-orange-600 flex items-center gap-1">
                                            <Users className="w-3 h-3"/> Raportat de {msg.reportedBy.length} utilizator(i)
                                        </div>
                                    </div>
                                    <div className="flex md:flex-col gap-2 justify-center">
                                        <button onClick={() => handleDismissReport(msg._id)} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 font-bold py-2 px-4 rounded-lg flex items-center gap-2 border border-green-200 justify-center">
                                            <CheckCircle className="w-4 h-4"/> Ignoră
                                        </button>
                                        <button onClick={() => handleDeleteReportedMessage(msg._id)} className="flex-1 bg-red-600 text-white hover:bg-red-700 font-bold py-2 px-4 rounded-lg flex items-center gap-2 justify-center shadow">
                                            <Trash2 className="w-4 h-4"/> Șterge
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {reportedMessages.length === 0 && (
                                <div className="text-center py-16 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50"/>
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300">Totul este curat!</h4>
                                    <p className="text-sm text-gray-500 mt-1">Nu există mesaje raportate în acest moment.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                </>
            )}
        </div>

        {/* MODAL ADĂUGARE / EDITARE ȘTIRE */}
        {showStoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="text-blue-600"/> 
                            {editingId ? 'Editează Articol' : 'Publică Articol Nou'}
                        </h3>
                        <button onClick={() => setShowStoryModal(false)}><X className="w-6 h-6 text-gray-500"/></button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold uppercase mb-1">Nume Erou (Titlu)</label><input className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-600" value={newStory.title} onChange={e => setNewStory({...newStory, title: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold uppercase mb-1">Data (Ex: 1994)</label><input className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-600" value={newStory.date} onChange={e => setNewStory({...newStory, date: e.target.value})} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold uppercase mb-1">Rol (ex: Magazioner)</label><input className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-600" value={newStory.role} onChange={e => setNewStory({...newStory, role: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold uppercase mb-1">Club / Organizație</label><input className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-600" value={newStory.organization} onChange={e => setNewStory({...newStory, organization: e.target.value})} /></div>
                        </div>
                        <div><label className="block text-xs font-bold uppercase mb-1">Rezumat (apare pe card)</label><input className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-600" value={newStory.excerpt} onChange={e => setNewStory({...newStory, excerpt: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold uppercase mb-1">Povestea Completă</label><textarea className="w-full p-3 border rounded-xl h-40 dark:bg-slate-800 dark:border-slate-600" value={newStory.content} onChange={e => setNewStory({...newStory, content: e.target.value})} ></textarea></div>
                    </div>
                    <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                        <button onClick={handleSaveStory} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 flex justify-center gap-2">
                            <Save className="w-5 h-5"/> {editingId ? 'Salvează Modificările' : 'Publică'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}