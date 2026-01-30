import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Newspaper, Ban, CheckCircle, Search, Loader2, Plus, Trash2, ShoppingBag, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

// --- INTERFEȚE DATE ---
interface UserData {
    _id: string;
    name: string;
    email: string;
    role: string;
    isBanned: boolean;
    avatar?: string;
}

interface ListingData {
    _id: string;
    title: string;
    category: string;
    price: string;
    seller: string;
    sellerEmail: string;
    images: string[];
    posted: string;
}

const API_URL = 'https://football-backend-m2a4.onrender.com/api';

export function AdminDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'news'>('users');
  
  // State-uri
  const [users, setUsers] = useState<UserData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]); // <--- LISTA ANUNȚURI
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. FETCH DATA (Aducem Useri + Anunțuri) ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
        setLoading(true);
        // Aducem Userii
        const resUsers = await fetch(`${API_URL}/admin/users`);
        if (resUsers.ok) setUsers(await resUsers.json());

        // Aducem Anunțurile
        const resListings = await fetch(`${API_URL}/listings`);
        if (resListings.ok) setListings(await resListings.json());

    } catch (err) {
        toast.error("Eroare la încărcarea datelor.");
    } finally {
        setLoading(false);
    }
  };

  // --- 2. LOGICA UTILIZATORI (Ban/Unban) ---
  const handleToggleBan = async (id: string, currentStatus: boolean, name: string) => {
    const action = currentStatus ? "deblochezi" : "blochezi";
    if (!window.confirm(`Ești sigur că vrei să îl ${action} pe ${name}?`)) return;

    try {
        const res = await fetch(`${API_URL}/admin/users/${id}/ban`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
            setUsers(prev => prev.map(u => u._id === id ? { ...u, isBanned: !u.isBanned } : u));
            toast.success(currentStatus ? "Utilizator deblocat!" : "Utilizator blocat!");
        }
    } catch (err) { toast.error("Eroare server."); }
  };

  // --- 3. LOGICA ANUNȚURI (Ștergere) ---
  const handleDeleteListing = async (id: string, title: string) => {
      if(!window.confirm(`Ștergi definitiv anunțul "${title}"?`)) return;

      try {
          // Trimitem email-ul adminului curent pentru autorizare
          const res = await fetch(`${API_URL}/listings/${id}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email }) 
          });

          if(res.ok) {
              setListings(prev => prev.filter(l => l._id !== id));
              toast.success("Anunț șters cu succes.");
          } else {
              toast.error("Nu s-a putut șterge anunțul.");
          }
      } catch (err) { toast.error("Eroare server."); }
  };

  // Filtrare Generală (căutăm și în useri, și în anunțuri)
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredListings = listings.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.seller.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* HEADER DASHBOARD */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 text-white p-8 rounded-3xl shadow-xl border border-slate-800">
            <div>
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <ShieldCheck className="h-8 w-8 text-red-500" /> Admin Dashboard
                </h1>
                <p className="text-slate-400">Panou de control pentru moderatori.</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-4 text-center">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="text-2xl font-bold text-white">{users.length}</div>
                    <div className="text-xs text-slate-400 uppercase font-bold">Useri</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="text-2xl font-bold text-blue-400">{listings.length}</div>
                    <div className="text-xs text-slate-400 uppercase font-bold">Anunțuri</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="text-2xl font-bold text-red-500">{users.filter(u => u.isBanned).length}</div>
                    <div className="text-xs text-slate-400 uppercase font-bold">Banați</div>
                </div>
            </div>
        </div>

        {/* MENIU TAB-URI */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-slate-700">
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                <Users className="w-4 h-4"/> Utilizatori
            </button>
            <button onClick={() => setActiveTab('listings')} className={`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'listings' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                <ShoppingBag className="w-4 h-4"/> Anunțuri
            </button>
            <button onClick={() => setActiveTab('news')} className={`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'news' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                <Newspaper className="w-4 h-4"/> Știri / Eroi
            </button>
        </div>

        {/* ZONA DE CONȚINUT */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 min-h-[400px]">
            
            {/* CĂUTARE GLOBALĂ */}
            <div className="relative max-w-md mb-6">
                <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder={activeTab === 'users' ? "Caută user..." : "Caută anunț..."}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
            ) : (
                <>
                {/* --- TABEL UTILIZATORI --- */}
                {activeTab === 'users' && (
                    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold">
                                <tr>
                                    <th className="p-4">Utilizator</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Rol</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                                {filteredUsers.map(u => (
                                    <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4 font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 font-bold text-xs overflow-hidden">
                                                {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover"/> : u.name.charAt(0)}
                                            </div>
                                            {u.name}
                                        </td>
                                        <td className="p-4 text-gray-500 dark:text-gray-400 font-mono">{u.email}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                                        <td className="p-4">
                                            {u.isBanned ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">Blocat</span> : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">Activ</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            {u.email !== user.email && (
                                                <button onClick={() => handleToggleBan(u._id, u.isBanned, u.name)} className={`p-2 rounded-lg transition-colors ${u.isBanned ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`} title={u.isBanned ? "Deblochează" : "Blochează"}>
                                                    {u.isBanned ? <CheckCircle className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && <div className="text-center py-10 text-gray-400">Nu am găsit utilizatori.</div>}
                    </div>
                )}

                {/* --- TABEL ANUNȚURI (MODIFICAREA PRINCIPALĂ) --- */}
                {activeTab === 'listings' && (
                     <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold">
                                <tr>
                                    <th className="p-4">Produs</th>
                                    <th className="p-4">Preț</th>
                                    <th className="p-4">Vânzător</th>
                                    <th className="p-4">Data</th>
                                    <th className="p-4 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                                {filteredListings.map(l => (
                                    <tr key={l._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                                    {l.images?.[0] ? <img src={l.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">NA</div>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white line-clamp-1">{l.title}</div>
                                                    <div className="text-xs text-blue-500 font-bold uppercase">{l.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-green-600">{l.price}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700 dark:text-gray-300">{l.seller}</span>
                                                <span className="text-xs text-gray-400">{l.sellerEmail}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-500 text-xs">
                                            {new Date(l.posted).toLocaleDateString('ro-RO')}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleDeleteListing(l._id, l.title)}
                                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Șterge Anunț (Admin)"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredListings.length === 0 && <div className="text-center py-10 text-gray-400">Nu am găsit anunțuri.</div>}
                    </div>
                )}

                {activeTab === 'news' && (
                    <div className="text-center py-10">
                        <div className="bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-8 max-w-lg mx-auto">
                            <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Adaugă un Erou Nou</h3>
                            <p className="text-sm text-gray-500 mb-6">Aici vei putea publica interviuri noi pentru secțiunea Unsung Heroes.</p>
                            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 mx-auto hover:bg-blue-700">
                                <Plus className="w-4 h-4" /> Creează Postare
                            </button>
                        </div>
                    </div>
                )}
                </>
            )}
        </div>
    </div>
  );
}