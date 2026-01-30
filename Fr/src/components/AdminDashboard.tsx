import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Newspaper, Ban, CheckCircle, Search, Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Definim cum arată un utilizator care vine din baza de date
interface UserData {
    _id: string;
    name: string;
    email: string;
    role: string;
    isBanned: boolean;
    avatar?: string;
}

const API_URL = 'https://football-backend-m2a4.onrender.com/api';

export function AdminDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'news'>('users');
  
  // State-uri pentru date reale
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. FETCH DATA (Aducem userii din DB) ---
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/users`);
        if (!res.ok) throw new Error("Eroare la încărcare useri");
        const data = await res.json();
        setUsers(data);
    } catch (err) {
        toast.error("Nu am putut încărca lista de utilizatori.");
    } finally {
        setLoading(false);
    }
  };

  // --- 2. LOGICA DE BANARE / DEBANARE ---
  const handleToggleBan = async (id: string, currentStatus: boolean, name: string) => {
    const action = currentStatus ? "deblochezi" : "blochezi";
    if (!window.confirm(`Ești sigur că vrei să îl ${action} pe ${name}?`)) return;

    try {
        // Facem update pe server
        const res = await fetch(`${API_URL}/admin/users/${id}/ban`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
            // Actualizăm lista locală instant (fără refresh la pagină)
            setUsers(prevUsers => prevUsers.map(u => 
                u._id === id ? { ...u, isBanned: !u.isBanned } : u
            ));
            toast.success(currentStatus ? "Utilizator deblocat!" : "Utilizator blocat cu succes!");
        } else {
            toast.error("Eroare server.");
        }
    } catch (err) {
        toast.error("Nu s-a putut efectua acțiunea.");
    }
  };

  // Filtrare useri după nume sau email
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <div className="text-xs text-slate-400 uppercase font-bold">Useri Totali</div>
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
                <Search className="w-4 h-4"/> Anunțuri
            </button>
            <button onClick={() => setActiveTab('news')} className={`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'news' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                <Newspaper className="w-4 h-4"/> Știri / Eroi
            </button>
        </div>

        {/* ZONA DE CONȚINUT */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 min-h-[400px]">
            
            {/* --- TABEL UTILIZATORI --- */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    {/* Căutare */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Caută după nume sau email..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : (
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
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                    {u.avatar ? <img src={u.avatar} className="w-full h-full rounded-full object-cover"/> : u.name.charAt(0)}
                                                </div>
                                                {u.name}
                                            </td>
                                            <td className="p-4 text-gray-500 dark:text-gray-400 font-mono">{u.email}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {u.isBanned ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                                        Blocat
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                        Activ
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {/* Nu te poți bana singur pe tine */}
                                                {u.email !== user.email && (
                                                    <button 
                                                        onClick={() => handleToggleBan(u._id, u.isBanned, u.name)}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            u.isBanned 
                                                            ? 'text-green-600 hover:bg-green-50 bg-green-50/50' 
                                                            : 'text-red-500 hover:bg-red-50 bg-red-50/50'
                                                        }`}
                                                        title={u.isBanned ? "Deblochează" : "Blochează"}
                                                    >
                                                        {u.isBanned ? <CheckCircle className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <div className="text-center py-10 text-gray-400">Nu am găsit utilizatori.</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'listings' && (
                <div className="text-center py-20 text-gray-400">
                    <p>Secțiunea de moderare anunțuri va fi disponibilă curând.</p>
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
        </div>
    </div>
  );
}