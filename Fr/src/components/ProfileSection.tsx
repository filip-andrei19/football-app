import React, { useState } from 'react';
import { User, Lock, Save, Camera, Mail, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProfileSection({ user, onUpdateUser }: { user: any, onUpdateUser: (u: any) => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');
  const [formData, setFormData] = useState({
      name: user.name,
      email: user.email,
      currentPassword: '',
      newPassword: ''
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      // AICI AR TREBUI SĂ FACI FETCH CĂTRE BACKEND (PUT /api/users/profile)
      // Simulare:
      setTimeout(() => {
          onUpdateUser({ ...user, name: formData.name });
          toast.success("Profil actualizat cu succes!");
      }, 1000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if(formData.newPassword.length < 6) return toast.error("Parola nouă e prea scurtă!");
      // Simulare Backend Call
      toast.success("Parola a fost schimbată!");
      setFormData({...formData, currentPassword: '', newPassword: ''});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header Profil */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10"></div>
            
            <div className="relative group cursor-pointer">
                <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-400 border-4 border-white dark:border-slate-800 shadow-lg">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover"/> : user.name.charAt(0)}
                </div>
                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-md group-hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                </div>
            </div>

            <div className="text-center md:text-left z-10">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{user.name}</h2>
                <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 dark:text-gray-400 mb-4">
                    <Mail className="w-4 h-4" /> {user.email}
                </div>
                <div className="flex gap-2 justify-center md:justify-start">
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full uppercase tracking-wider">
                        {user.role === 'admin' ? 'Administrator' : 'Scouter'}
                    </span>
                    <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full uppercase tracking-wider">Verified</span>
                </div>
            </div>
        </div>

        {/* Formulare */}
        <div className="grid md:grid-cols-3 gap-8">
            {/* Sidebar Meniu */}
            <div className="md:col-span-1 space-y-2">
                <button 
                    onClick={() => setActiveTab('details')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'details' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600 border-l-4 border-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                >
                    <User className="w-5 h-5" /> Detalii Personale
                </button>
                <button 
                    onClick={() => setActiveTab('security')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'security' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600 border-l-4 border-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                >
                    <Lock className="w-5 h-5" /> Securitate & Parolă
                </button>
            </div>

            {/* Zona Activă */}
            <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
                {activeTab === 'details' ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <h3 className="text-xl font-bold mb-4 border-b pb-2 dark:border-slate-700">Editează Profil</h3>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nume Complet</label>
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-900 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input 
                                type="email" 
                                value={formData.email} 
                                disabled 
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-400 mt-1">Email-ul nu poate fi schimbat.</p>
                        </div>
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
                            <Save className="w-4 h-4" /> Salvează Modificările
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <h3 className="text-xl font-bold mb-4 border-b pb-2 dark:border-slate-700 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-green-600" /> Schimbă Parola
                        </h3>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Parola Curentă</label>
                            <input 
                                type="password" 
                                value={formData.currentPassword}
                                onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-900 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Parola Nouă</label>
                            <input 
                                type="password" 
                                value={formData.newPassword}
                                onChange={e => setFormData({...formData, newPassword: e.target.value})}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-900 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button className="bg-slate-900 dark:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-2">
                            Update Parolă
                        </button>
                        
                        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
                            <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-1">Ai uitat parola?</h4>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                Dacă nu îți amintești parola curentă, dă Logout și folosește opțiunea "Resetare Parolă" din pagina de autentificare.
                            </p>
                        </div>
                    </form>
                )}
            </div>
        </div>
    </div>
  );
}