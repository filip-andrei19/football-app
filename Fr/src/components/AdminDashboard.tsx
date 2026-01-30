import React, { useState } from 'react';
import { Users, Trash2, Ban, ShieldCheck, Newspaper, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'news'>('users');

  // --- MOCK DATA (Până legi backend-ul) ---
  const [mockUsers, setMockUsers] = useState([
      { id: 1, name: 'Ion Popescu', email: 'ion@test.ro', role: 'user', status: 'active' },
      { id: 2, name: 'Spammer Gică', email: 'spam@bad.com', role: 'user', status: 'banned' },
  ]);

  const handleBanUser = (id: number) => {
      if(window.confirm("Ești sigur?")) {
          setMockUsers(mockUsers.map(u => u.id === id ? {...u, status: 'banned'} : u));
          toast.success("Utilizator blocat!");
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
            <div>
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <ShieldCheck className="h-8 w-8 text-red-500" /> Admin Dashboard
                </h1>
                <p className="text-slate-400">Panou de control pentru moderatori.</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-4 text-center">
                <div className="bg-slate-800 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-white">1,240</div>
                    <div className="text-xs text-slate-400 uppercase">Useri</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-green-400">85</div>
                    <div className="text-xs text-slate-400 uppercase">Anunțuri</div>
                </div>
            </div>
        </div>

        <div className="flex gap-4 border-b border-gray-200 dark:border-slate-700 pb-2">
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>Utilizatori</button>
            <button onClick={() => setActiveTab('listings')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'listings' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>Anunțuri</button>
            <button onClick={() => setActiveTab('news')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'news' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>Știri / Eroi</button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 min-h-[400px]">
            {activeTab === 'users' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-slate-700 text-sm text-gray-400 uppercase">
                                <th className="p-3">Nume</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockUsers.map(u => (
                                <tr key={u.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="p-3 font-bold">{u.name}</td>
                                    <td className="p-3 text-gray-500">{u.email}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => handleBanUser(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Ban className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'news' && (
                <div className="text-center py-10">
                    <div className="bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-8 max-w-lg mx-auto">
                        <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-bold text-lg mb-2">Adaugă un Erou Nou</h3>
                        <p className="text-sm text-gray-500 mb-6">Aici poți publica un nou interviu pentru secțiunea Unsung Heroes.</p>
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