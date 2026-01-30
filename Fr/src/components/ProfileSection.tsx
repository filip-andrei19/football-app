import React, { useState, useRef } from 'react';
import { User, Lock, Save, Camera, Mail, Shield, Loader2, LogOut } from 'lucide-react'; // MODIFICARE: Am importat LogOut
import toast from 'react-hot-toast';

// MODIFICARE: Am adăugat onLogout în interfață și props
export function ProfileSection({ user, onUpdateUser, onLogout }: { user: any, onUpdateUser: (u: any) => void, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');
  const [loading, setLoading] = useState(false);
  
  // Referință pentru input-ul ascuns de fișiere
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
      name: user.name,
      email: user.email,
      avatar: user.avatar || '',
      currentPassword: '',
      newPassword: ''
  });

  // --- 1. LOGICA PENTRU POZĂ (Upload din Galerie) ---
  const handleImageClick = () => {
      fileInputRef.current?.click(); // Deschide fereastra de fișiere
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validare mărime (Max 5MB)
          if (file.size > 5 * 1024 * 1024) {
              return toast.error("Imaginea e prea mare! (Max 5MB)");
          }

          // Convertire în Base64
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, avatar: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  // --- 2. UPDATE PROFIL (Conectat la Server) ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
          const response = await fetch('https://football-backend-m2a4.onrender.com/api/users/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email: user.email, // Email-ul e cheia de căutare
                  name: formData.name,
                  avatar: formData.avatar
              })
          });

          const data = await response.json();

          if (data.success) {
              onUpdateUser(data.user); // Actualizează starea globală în App
              toast.success("Profil actualizat! Numele s-a schimbat și în anunțuri.");
          } else {
              toast.error(data.message || "Eroare la actualizare.");
          }
      } catch (err) {
          toast.error("Eroare server.");
      } finally {
          setLoading(false);
      }
  };

  // --- 3. SCHIMBARE PAROLĂ ---
  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if(formData.newPassword.length < 6) return toast.error("Parola nouă e prea scurtă!");
      
      setLoading(true);
      try {
          const response = await fetch('https://football-backend-m2a4.onrender.com/api/users/change-password', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email: user.email,
                  currentPassword: formData.currentPassword,
                  newPassword: formData.newPassword
              })
          });
          
          const data = await response.json();
          if(data.success) {
              toast.success("Parola a fost schimbată!");
              setFormData({...formData, currentPassword: '', newPassword: ''});
          } else {
              toast.error(data.message || "Eroare.");
          }
      } catch (err) {
          toast.error("Eroare server.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header Profil */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10"></div>
            
            {/* ZONA POZĂ DE PROFIL */}
            <div className="relative group cursor-pointer" onClick={handleImageClick}>
                <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-400 border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden">
                    {/* Afișăm poza (Preview sau cea salvată) */}
                    {formData.avatar ? (
                        <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        user.name.charAt(0).toUpperCase()
                    )}
                </div>
                
                {/* Overlay la hover + Iconiță */}
                <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                </div>
                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-md group-hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                </div>

                {/* INPUT ASCUNS */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                />
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

                {/* MODIFICARE: ZONA DE LOGOUT ÎN SIDEBAR */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-700 mt-4">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        <LogOut className="w-5 h-5" /> Deconectare
                    </button>
                </div>
            </div>

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
                            <p className="text-xs text-blue-500 mt-1">* Schimbarea numelui va actualiza automat toate anunțurile tale.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input 
                                type="email" 
                                value={formData.email} 
                                disabled 
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <button disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                            Salvează Modificările
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
                        <button disabled={loading} className="bg-slate-900 dark:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50">
                             {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Update Parolă'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    </div>
  );
}